import { z } from 'zod';

import { auth } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/utils/api-response';
import { redeemCouponByCode } from '@/server/coupon';

const redeemSchema = z.object({
  code: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const body = await request.json();
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('쿠폰 코드를 입력해주세요.', 400);
  }

  try {
    const couponIssue = await redeemCouponByCode(parsed.data.code, userId);
    return apiSuccess(couponIssue, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : '쿠폰 등록에 실패했습니다.';
    return apiError(message, 400);
  }
}
