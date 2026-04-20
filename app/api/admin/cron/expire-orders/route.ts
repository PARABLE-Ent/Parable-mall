/**
 * 결제 미완료(PENDING_PAYMENT) 주문 자동 취소 엔드포인트.
 *
 * 인증: Authorization: Bearer $CRON_SECRET (관리자 세션 미사용)
 * 스케줄: Vercel Cron (매 15분 권장) 또는 외부 스케줄러.
 */

import { NextResponse } from 'next/server';

import { env } from '@/lib/config';
import { logger } from '@/lib/logger';
import { expireStalePendingOrders } from '@/server/order';

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
    const result = await expireStalePendingOrders();
    return NextResponse.json(result);
  } catch (err) {
    logger.error('cron.expire_orders_failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

// 일부 스케줄러는 GET 만 허용하므로 동일한 핸들러를 노출한다.
export { POST as GET };
