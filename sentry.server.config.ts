/**
 * Sentry 서버 초기화 (선택).
 *
 * - SDK 설치: `pnpm add @sentry/nextjs` 후 자동으로 활성화.
 * - SENTRY_DSN 이 비어 있으면 아무 동작도 하지 않는다.
 * - SDK 미설치 환경에서도 빌드가 실패하지 않도록 동적 import + any 캐스트.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export {};

const serverDsn = process.env.SENTRY_DSN;

if (serverDsn) {
  void (async () => {
    try {
      // 번들러가 @sentry/nextjs 를 정적으로 해석하지 못하도록 문자열/Function 우회.
      const moduleName = '@sentry/nextjs';
      const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
      const mod: any = await dynamicImport(moduleName).catch(() => null);
      if (!mod || typeof mod.init !== 'function') return;
      mod.init({
        dsn: serverDsn,
        tracesSampleRate: Number(process.env.SENTRY_TRACES ?? '0.1'),
        environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,
      });
    } catch {
      // SDK 가 없으면 조용히 무시.
    }
  })();
}
