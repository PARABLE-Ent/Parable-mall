/**
 * 런타임 환경변수 검증.
 * - 서버 시작 시 누락된 필수 env 가 있으면 즉시 크래시하여 "조용한 실패" 를 방지한다.
 * - Vercel Preview/Production 배포에서 누락된 시크릿을 조기 감지.
 * - 테스트(vitest) 환경에서는 실제 검증을 건너뛰고 placeholder 값을 주입한다.
 */

import { z } from 'zod';

const REQUIRED_IN_PROD = ['production'] as const;

const envSchema = z
  .object({
    // 공통
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),

    // DB & 캐시
    DATABASE_URL: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // NextAuth
    NEXTAUTH_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z.string().min(16).optional(),

    // 결제
    TOSS_CLIENT_KEY: z.string().optional(),
    TOSS_SECRET_KEY: z.string().optional(),
    NEXT_PUBLIC_TOSS_CLIENT_KEY: z.string().optional(),
    KAKAOPAY_SECRET_KEY: z.string().optional(),
    KAKAOPAY_CID: z.string().optional(),
    NAVERPAY_CLIENT_ID: z.string().optional(),
    NAVERPAY_CLIENT_SECRET: z.string().optional(),
    NAVERPAY_CHAIN_ID: z.string().optional(),

    // R2
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_PUBLIC_URL: z.string().optional(),

    // 관찰성 / 이메일
    SENTRY_DSN: z.string().optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    MAIL_FROM: z.string().optional(),

    // 스케줄러 / 내부 잡
    CRON_SECRET: z.string().optional(),

    // 관리자 CSRF/2FA 시크릿
    ADMIN_2FA_ISSUER: z.string().default('Parable Mall'),
  })
  .passthrough();

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

function validate(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid environment variables: ${issues}`);
  }

  const data = parsed.data;
  const mustExist: Array<keyof AppEnv> = [];
  if ((REQUIRED_IN_PROD as readonly string[]).includes(data.NODE_ENV)) {
    mustExist.push(
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
    );
  }
  const missing = mustExist.filter((k) => !data[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars in production: ${missing.join(', ')}`);
  }
  return data;
}

export function env(): AppEnv {
  if (!cached) {
    cached = validate();
  }
  return cached;
}

export function isProduction(): boolean {
  return env().NODE_ENV === 'production';
}

export function isTest(): boolean {
  return env().NODE_ENV === 'test';
}
