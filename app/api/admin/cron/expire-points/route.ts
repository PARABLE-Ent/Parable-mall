/**
 * 유효기간 만료 적립금 차감 엔드포인트.
 *
 * 인증: Authorization: Bearer $CRON_SECRET
 * 스케줄: Vercel Cron (매일 1회 권장)
 */

import { NextResponse } from 'next/server';

import { env } from '@/lib/config';
import { logger } from '@/lib/logger';
import { expireStalePoints } from '@/server/order/points';

export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  const cronSecret = env().CRON_SECRET;
  if (!cronSecret) return false;
  const header = request.headers.get('authorization');
  if (!header) return false;
  return header === `Bearer ${cronSecret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await expireStalePoints();
    return NextResponse.json(result);
  } catch (err) {
    logger.error('cron.expire_points_failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export { POST as GET };
