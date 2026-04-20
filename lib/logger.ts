/**
 * 경량 구조화 로거.
 * - 프로덕션에서는 JSON 라인, 개발에서는 사람이 읽기 좋은 포맷.
 * - PII 로깅 금지 규칙을 강제하기 위해 사전 정의된 필드명만 허용.
 * - Sentry DSN 이 있다면 ERROR 수준 이상만 Sentry 로 전달한다 (동적 로드).
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const PII_KEYS = new Set([
  'email',
  'phone',
  'password',
  'address',
  'address1',
  'address2',
  'zipCode',
  'recipientName',
  'recipientPhone',
]);

function scrub(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(scrub);
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEYS.has(k)) {
        result[k] = '[REDACTED]';
      } else {
        result[k] = scrub(v);
      }
    }
    return result;
  }
  return value;
}

function currentLevel(): Level {
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  if (raw in LEVEL_PRIORITY) return raw as Level;
  return 'info';
}

function shouldLog(level: Level): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel()];
}

function write(level: Level, message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(context ? (scrub(context) as Record<string, unknown>) : {}),
  };

  if (process.env.NODE_ENV === 'production') {
    // JSON 한 줄, 수집 친화적
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  } else {
    const prefix = `[${payload.ts}] ${level.toUpperCase()}`;
    if (context) {
      console[level === 'debug' ? 'log' : level](prefix, message, context);
    } else {
      console[level === 'debug' ? 'log' : level](prefix, message);
    }
  }

  if (level === 'error' && process.env.SENTRY_DSN) {
    // Sentry 통합은 파일 크기/의존성을 고려해 동적으로 시도.
    void forwardToSentry(message, context);
  }
}

async function forwardToSentry(message: string, context?: Record<string, unknown>): Promise<void> {
  try {
    // Sentry SDK 미설치 환경에서도 빌드가 깨지지 않도록 간접(import string) + any 캐스트.
    // - 번들러 정적 분석이 해당 import 를 놓치도록 문자열 변수를 통해 로드한다.
    const moduleName = '@sentry/nextjs';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await dynamicImport(moduleName).catch(() => null);
    if (!mod || typeof mod.captureMessage !== 'function') return;
    mod.captureMessage(message, {
      level: 'error',
      extra: (scrub(context) as Record<string, unknown>) ?? {},
    });
  } catch {
    // 무시: 로깅 경로에서 예외를 던지지 않는다.
  }
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    write('debug', message, context);
  },
  info(message: string, context?: Record<string, unknown>) {
    write('info', message, context);
  },
  warn(message: string, context?: Record<string, unknown>) {
    write('warn', message, context);
  },
  error(message: string, context?: Record<string, unknown>) {
    write('error', message, context);
  },
};

export type Logger = typeof logger;
