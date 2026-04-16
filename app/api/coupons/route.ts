import { auth } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/utils/api-response';
import { getUserCoupons } from '@/server/coupon';

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError('로그인이 필요합니다.', 401);
  const userId = session.user.id;

  const coupons = await getUserCoupons(userId);

  return apiSuccess(coupons);
}
