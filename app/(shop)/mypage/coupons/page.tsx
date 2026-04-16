'use client';

import { ChevronLeft, Loader2, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Coupon {
  id: string;
  coupon: {
    id: string;
    name: string;
    discountType: string;
    discountValue: number;
    minOrderAmount: number | null;
    maxDiscountAmount: number | null;
  };
  usedAt: string | null;
  expiresAt: string | null;
}

function formatDiscount(type: string, value: number): string {
  if (type === 'PERCENTAGE') return `${value}% 할인`;
  return `${value.toLocaleString('ko-KR')}원 할인`;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState(false);

  function fetchCoupons() {
    fetch('/api/coupons')
      .then((r) => r.json())
      .then((res: { data: Coupon[] | null; error?: string }) => {
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          setCoupons(res.data);
        }
      })
      .catch(() => setError('쿠폰 목록을 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function handleRedeem() {
    if (!code.trim()) return;
    setRedeeming(true);
    setRedeemMessage(null);
    setRedeemError(false);
    try {
      const res = await fetch('/api/coupons/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const result: { data: unknown; error?: string } = await res.json();
      if (result.error) {
        setRedeemMessage(result.error);
        setRedeemError(true);
      } else {
        setRedeemMessage('쿠폰이 등록되었습니다.');
        setRedeemError(false);
        setCode('');
        fetchCoupons();
      }
    } catch {
      setRedeemMessage('쿠폰 등록에 실패했습니다.');
      setRedeemError(true);
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const activeCoupons = coupons.filter((c) => !c.usedAt);
  const usedCoupons = coupons.filter((c) => c.usedAt);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2">
        <Link href="/mypage">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">내 쿠폰</h1>
      </div>

      {/* Redeem Form */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>쿠폰 등록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="coupon-code" className="sr-only">
                쿠폰 코드
              </Label>
              <Input
                id="coupon-code"
                placeholder="쿠폰 코드를 입력하세요"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRedeem();
                }}
              />
            </div>
            <Button onClick={handleRedeem} disabled={redeeming || !code.trim()}>
              {redeeming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              등록
            </Button>
          </div>
          {redeemMessage && (
            <p className={`mt-2 text-sm ${redeemError ? 'text-destructive' : 'text-green-600'}`}>
              {redeemMessage}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Active Coupons */}
      <h2 className="mt-8 text-lg font-semibold">
        사용 가능한 쿠폰 ({activeCoupons.length})
      </h2>
      {activeCoupons.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center gap-2 py-12">
            <Ticket className="text-muted-foreground h-8 w-8" />
            <p className="text-muted-foreground text-sm">사용 가능한 쿠폰이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {activeCoupons.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.coupon.name}</p>
                    <p className="text-primary mt-1 text-lg font-bold">
                      {formatDiscount(item.coupon.discountType, item.coupon.discountValue)}
                    </p>
                    {item.coupon.minOrderAmount && (
                      <p className="text-muted-foreground text-xs">
                        {item.coupon.minOrderAmount.toLocaleString('ko-KR')}원 이상 주문 시 사용
                        가능
                      </p>
                    )}
                    {item.coupon.maxDiscountAmount && (
                      <p className="text-muted-foreground text-xs">
                        최대 할인 {item.coupon.maxDiscountAmount.toLocaleString('ko-KR')}원
                      </p>
                    )}
                  </div>
                  {item.expiresAt && (
                    <div className="text-right">
                      <p className="text-muted-foreground text-xs">만료일</p>
                      <p className="text-sm">
                        {new Date(item.expiresAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Used Coupons */}
      {usedCoupons.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-semibold">
            사용 완료 ({usedCoupons.length})
          </h2>
          <div className="mt-4 space-y-3">
            {usedCoupons.map((item) => (
              <Card key={item.id} className="opacity-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.coupon.name}</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {formatDiscount(item.coupon.discountType, item.coupon.discountValue)}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">사용 완료</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
