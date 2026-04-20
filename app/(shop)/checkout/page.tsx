'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CartItem {
  id: string;
  quantity: number;
  sku: {
    id: string;
    price: number;
    product: { id: string; name: string; slug: string };
    optionValues: Array<{ optionValue: { value: string; productOption: { name: string } } }>;
    inventory: { quantity: number; reserved: number } | null;
  };
}

interface CartData {
  id: string;
  items: CartItem[];
}

interface Address {
  id: string;
  label: string | null;
  recipient: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string | null;
  isDefault: boolean;
}

interface CouponIssue {
  id: string;
  coupon: {
    name: string;
    discountType: 'FIXED_AMOUNT' | 'PERCENTAGE';
    discountValue: number;
    minOrderAmount: number | null;
    maxDiscount: number | null;
  };
}

const FREE_SHIPPING_THRESHOLD = 50000;
const BASE_SHIPPING_FEE = 3000;

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [coupons, setCoupons] = useState<CouponIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 폼 상태
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [shippingMemo, setShippingMemo] = useState('');
  const [selectedCouponId, setSelectedCouponId] = useState<string>('');
  const [pointsToUse, setPointsToUse] = useState(0);
  const [availablePoints, setAvailablePoints] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [cartRes, addrRes, couponRes, profileRes] = await Promise.all([
          fetch('/api/cart'),
          fetch('/api/addresses'),
          fetch('/api/coupons'),
          fetch('/api/profile'),
        ]);

        if (!cartRes.ok) {
          router.push('/login');
          return;
        }

        const cartData = (await cartRes.json()) as CartData;
        if (!cartData.items || cartData.items.length === 0) {
          router.push('/cart');
          return;
        }
        setCart(cartData);

        if (addrRes.ok) {
          const addrJson = await addrRes.json();
          const addrList = (addrJson.data ?? []) as Address[];
          setAddresses(addrList);
          const defaultAddr = addrList.find((a) => a.isDefault) ?? addrList[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            setRecipientName(defaultAddr.recipient);
            setRecipientPhone(defaultAddr.phone);
            setZipCode(defaultAddr.zipCode);
            setAddress1(defaultAddr.address1);
            setAddress2(defaultAddr.address2 ?? '');
          }
        }

        if (couponRes.ok) {
          const couponJson = await couponRes.json();
          setCoupons((couponJson.data ?? []) as CouponIssue[]);
        }

        if (profileRes.ok) {
          const profileJson = await profileRes.json();
          setAvailablePoints(profileJson.data?.pointsBalance ?? 0);
        }
      } catch {
        setError('주문 정보를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [router]);

  // 주소 선택 시 자동 채우기
  const handleAddressChange = useCallback(
    (addrId: string) => {
      setSelectedAddressId(addrId);
      const addr = addresses.find((a) => a.id === addrId);
      if (addr) {
        setRecipientName(addr.recipient);
        setRecipientPhone(addr.phone);
        setZipCode(addr.zipCode);
        setAddress1(addr.address1);
        setAddress2(addr.address2 ?? '');
      }
    },
    [addresses],
  );

  // 금액 계산
  const subtotal = cart?.items.reduce((sum, item) => sum + item.sku.price * item.quantity, 0) ?? 0;
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : BASE_SHIPPING_FEE;

  let couponDiscount = 0;
  if (selectedCouponId) {
    const couponIssue = coupons.find((c) => c.id === selectedCouponId);
    if (couponIssue) {
      const { coupon } = couponIssue;
      if (!coupon.minOrderAmount || subtotal >= coupon.minOrderAmount) {
        if (coupon.discountType === 'FIXED_AMOUNT') {
          couponDiscount = coupon.discountValue;
        } else {
          couponDiscount = Math.floor((subtotal * coupon.discountValue) / 100);
          if (coupon.maxDiscount) {
            couponDiscount = Math.min(couponDiscount, coupon.maxDiscount);
          }
        }
      }
    }
  }

  const totalDiscount = couponDiscount + pointsToUse;
  const totalAmount = Math.max(0, subtotal + shippingFee - totalDiscount);

  const handleSubmit = useCallback(async () => {
    if (!cart || submitting) return;
    if (!recipientName || !recipientPhone || !zipCode || !address1) {
      setError('배송지 정보를 모두 입력해주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. 주문 생성
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map((item) => ({
            skuId: item.sku.id,
            quantity: item.quantity,
          })),
          addressId: selectedAddressId || undefined,
          recipientName,
          recipientPhone,
          zipCode,
          shippingAddress1: address1,
          shippingAddress2: address2 || undefined,
          shippingMemo: shippingMemo || undefined,
          couponIssueId: selectedCouponId || undefined,
          pointsUsed: pointsToUse,
        }),
      });

      if (!orderRes.ok) {
        const orderErr = await orderRes.json();
        throw new Error(orderErr.error ?? '주문 생성에 실패했습니다.');
      }

      const order = await orderRes.json();
      const orderId = order.data?.id ?? order.id;
      const orderAmount = order.data?.totalAmount ?? order.totalAmount;

      // 2. 토스페이먼츠 결제 (SDK 미사용 시 리다이렉트)
      // 실제 SDK가 없을 경우 결제 페이지로 리다이렉트
      if (typeof window !== 'undefined' && orderAmount > 0) {
        // TossPayments SDK가 로드된 경우
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
        if (clientKey) {
          // 동적 SDK 로드
          const { loadTossPayments } = await import('@tosspayments/payment-sdk');
          const toss = await loadTossPayments(clientKey);
          await toss.requestPayment('카드', {
            amount: orderAmount,
            orderId: orderId,
            orderName:
              cart.items.length > 1
                ? `${cart.items[0].sku.product.name} 외 ${cart.items.length - 1}건`
                : cart.items[0].sku.product.name,
            successUrl: `${window.location.origin}/checkout/success?orderId=${orderId}`,
            failUrl: `${window.location.origin}/checkout/fail?orderId=${orderId}`,
          });
        } else {
          // SDK 없이 주문 완료 페이지로 이동 (테스트용)
          router.push(`/mypage/orders/${orderId}`);
        }
      } else {
        // 0원 결제 (전액 적립금/쿠폰)
        router.push(`/mypage/orders/${orderId}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '주문 처리 중 오류가 발생했습니다.');
      setSubmitting(false);
    }
  }, [
    cart,
    submitting,
    recipientName,
    recipientPhone,
    zipCode,
    address1,
    address2,
    shippingMemo,
    selectedAddressId,
    selectedCouponId,
    pointsToUse,
    router,
  ]);

  if (loading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">주문서</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 좌측: 주문 상세 */}
        <div className="space-y-6 lg:col-span-2">
          {/* 주문 상품 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">주문 상품</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.items.map((item) => {
                const optionText = item.sku.optionValues
                  .map((ov) => `${ov.optionValue.productOption.name}: ${ov.optionValue.value}`)
                  .join(' / ');
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{item.sku.product.name}</p>
                      {optionText && <p className="text-muted-foreground text-sm">{optionText}</p>}
                      <p className="text-muted-foreground text-sm">수량: {item.quantity}</p>
                    </div>
                    <p className="font-medium">
                      {(item.sku.price * item.quantity).toLocaleString('ko-KR')}원
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* 배송지 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">배송지 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {addresses.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="address-select">저장된 배송지</Label>
                  <select
                    id="address-select"
                    className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                    value={selectedAddressId}
                    onChange={(e) => handleAddressChange(e.target.value)}
                  >
                    <option value="">직접 입력</option>
                    {addresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label ? `[${addr.label}] ` : ''}
                        {addr.address1} {addr.address2 ?? ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="recipient-name">수령인</Label>
                  <Input
                    id="recipient-name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="이름"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipient-phone">연락처</Label>
                  <Input
                    id="recipient-phone"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="zip-code">우편번호</Label>
                  <Input
                    id="zip-code"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="12345"
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address1">기본 주소</Label>
                  <Input
                    id="address1"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    placeholder="주소"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address2">상세 주소</Label>
                <Input
                  id="address2"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="동/호수"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping-memo">배송 메모</Label>
                <Input
                  id="shipping-memo"
                  value={shippingMemo}
                  onChange={(e) => setShippingMemo(e.target.value)}
                  placeholder="배송 시 요청사항"
                />
              </div>
            </CardContent>
          </Card>

          {/* 쿠폰 & 적립금 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">할인</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coupon-select">쿠폰 선택</Label>
                <select
                  id="coupon-select"
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                  value={selectedCouponId}
                  onChange={(e) => setSelectedCouponId(e.target.value)}
                >
                  <option value="">쿠폰 미적용</option>
                  {coupons.map((ci) => {
                    const { coupon } = ci;
                    const discountLabel =
                      coupon.discountType === 'FIXED_AMOUNT'
                        ? `${coupon.discountValue.toLocaleString()}원`
                        : `${coupon.discountValue}%${coupon.maxDiscount ? ` (최대 ${coupon.maxDiscount.toLocaleString()}원)` : ''}`;
                    const eligible = !coupon.minOrderAmount || subtotal >= coupon.minOrderAmount;
                    return (
                      <option key={ci.id} value={ci.id} disabled={!eligible}>
                        {coupon.name} ({discountLabel}){!eligible ? ' - 최소 주문금액 미달' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="points">
                  적립금 사용 (보유: {availablePoints.toLocaleString()}원)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="points"
                    type="number"
                    min={0}
                    max={Math.min(availablePoints, subtotal)}
                    value={pointsToUse}
                    onChange={(e) => {
                      const val = Math.min(
                        Math.max(0, Number(e.target.value)),
                        Math.min(availablePoints, subtotal),
                      );
                      setPointsToUse(val);
                    }}
                  />
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() =>
                      setPointsToUse(
                        availablePoints >= 1000 ? Math.min(availablePoints, subtotal) : 0,
                      )
                    }
                  >
                    전액 사용
                  </Button>
                </div>
                {pointsToUse > 0 && pointsToUse < 1000 && (
                  <p className="text-destructive text-xs">최소 사용 금액은 1,000원입니다.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 우측: 결제 요약 */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-lg">결제 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>상품 합계</span>
                <span>{subtotal.toLocaleString('ko-KR')}원</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>배송비</span>
                <span>
                  {shippingFee === 0 ? (
                    <span className="text-green-600">무료</span>
                  ) : (
                    `${shippingFee.toLocaleString('ko-KR')}원`
                  )}
                </span>
              </div>
              {couponDiscount > 0 && (
                <div className="text-destructive flex justify-between text-sm">
                  <span>쿠폰 할인</span>
                  <span>-{couponDiscount.toLocaleString('ko-KR')}원</span>
                </div>
              )}
              {pointsToUse > 0 && (
                <div className="text-destructive flex justify-between text-sm">
                  <span>적립금 사용</span>
                  <span>-{pointsToUse.toLocaleString('ko-KR')}원</span>
                </div>
              )}

              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>결제 금액</span>
                  <span>{totalAmount.toLocaleString('ko-KR')}원</span>
                </div>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}

              <Button
                className="w-full"
                size="lg"
                onClick={() => void handleSubmit()}
                disabled={submitting || (pointsToUse > 0 && pointsToUse < 1000)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  `${totalAmount.toLocaleString('ko-KR')}원 결제하기`
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
