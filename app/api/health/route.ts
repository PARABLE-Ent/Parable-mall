/**
 * 인프라 헬스 체크.
 *
 * GET /api/health
 *   { ok: true, checks: { db: 'ok', redis: 'ok' } } — 모두 정상
 *   503                                            — 하나라도 실패
 *
 * 내부 모니터링/Uptime 용. 인증 없음. 시크릿을 노출하지 않도록 오류는 간단히.
 */

import { NextResponse } from 'next/server';

import { redis } from '@/lib/cache/redis';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CheckState = 'ok' | 'fail';

async function checkDatabase(): Promise<CheckState> {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    return 'ok';
  } catch {
    return 'fail';
  }
}

async function checkRedis(): Promise<CheckState> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG' || pong === 'pong' ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}

export async function GET() {
  const [db, redisStatus] = await Promise.all([checkDatabase(), checkRedis()]);
  const ok = db === 'ok' && redisStatus === 'ok';
  const body = {
    ok,
    checks: { db, redis: redisStatus },
    version: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev',
    ts: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: ok ? 200 : 503 });
}
