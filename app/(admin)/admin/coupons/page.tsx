'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminFetch } from '@/lib/auth/admin-fetch';

interface Coupon {
  id: string;
  name: string;
  code: string;
  discountType: string;
  discountValue: number;
  startDate: string;
  endDate: string;
  issuedCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CouponsResponse {
  data: Coupon[];
  pagination: Pagination;
}

interface CouponFormData {
  name: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  startDate: string;
  endDate: string;
}

function formatDiscount(type: string, value: number): string {
  if (type === 'PERCENTAGE') return `${value}%`;
  return `${value.toLocaleString('ko-KR')}원`;
}

const initialForm: CouponFormData = {
  name: '',
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  startDate: '',
  endDate: '',
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CouponFormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formInfo, setFormInfo] = useState<string | null>(null);

  const fetchCoupons = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
      const res = await fetch(`/api/admin/coupons?${params.toString()}`);
      if (!res.ok) throw new Error('쿠폰 목록을 불러올 수 없습니다.');
      const json = (await res.json()) as Coupon[] | CouponsResponse;
      if (Array.isArray(json)) {
        setCoupons(json);
        setPagination(null);
      } else {
        setCoupons(json.data);
        setPagination(json.pagination ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCoupons(page);
  }, [fetchCoupons, page]);

  const handleFormChange = (field: keyof CouponFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateCoupon = async () => {
    setFormError(null);
    setFormInfo(null);
    if (
      !form.name.trim() ||
      !form.code.trim() ||
      !form.discountValue ||
      !form.startDate ||
      !form.endDate
    ) {
      setFormError('모든 필드를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminFetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          startDate: form.startDate,
          endDate: form.endDate,
        }),
      });
      if (!res.ok) throw new Error('쿠폰 생성에 실패했습니다.');
      setForm(initialForm);
      setShowForm(false);
      setFormInfo('쿠폰이 생성되었습니다.');
      void fetchCoupons(page);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">쿠폰 관리</h1>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-16 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-12 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">쿠폰 관리</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <AlertTriangle className="text-destructive h-10 w-10" />
            <p className="text-destructive">{error}</p>
            <Button onClick={() => void fetchCoupons(page)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">쿠폰 관리</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          쿠폰 생성
        </Button>
      </div>

      {formError && (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/5 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}
      {formInfo && (
        <div
          role="status"
          className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
        >
          {formInfo}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">새 쿠폰 생성</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="coupon-name">쿠폰명</Label>
                <Input
                  id="coupon-name"
                  placeholder="신규 가입 할인"
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="coupon-code">쿠폰 코드</Label>
                <Input
                  id="coupon-code"
                  placeholder="WELCOME2024"
                  value={form.code}
                  onChange={(e) => handleFormChange('code', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="discount-type">할인 유형</Label>
                <select
                  id="discount-type"
                  value={form.discountType}
                  onChange={(e) => handleFormChange('discountType', e.target.value)}
                  className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="PERCENTAGE">% 할인</option>
                  <option value="FIXED">원 할인</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="discount-value">할인 값</Label>
                <Input
                  id="discount-value"
                  type="number"
                  placeholder={form.discountType === 'PERCENTAGE' ? '10' : '5000'}
                  value={form.discountValue}
                  onChange={(e) => handleFormChange('discountValue', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="start-date">시작일</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => handleFormChange('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date">종료일</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => handleFormChange('endDate', e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button disabled={submitting} onClick={() => void handleCreateCoupon()}>
                {submitting ? '생성 중...' : '생성'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setForm(initialForm);
                }}
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>쿠폰 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">쿠폰명</th>
                  <th className="px-4 py-3 font-medium">코드</th>
                  <th className="px-4 py-3 font-medium">할인</th>
                  <th className="px-4 py-3 font-medium">기간</th>
                  <th className="px-4 py-3 text-right font-medium">발급수</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                      쿠폰이 없습니다.
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-muted/50 border-b">
                      <td className="px-4 py-3 font-medium">{coupon.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{coupon.code}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {formatDiscount(coupon.discountType, coupon.discountValue)}
                        </span>
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">
                        {new Date(coupon.startDate).toLocaleDateString('ko-KR')} ~{' '}
                        {new Date(coupon.endDate).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-right">{coupon.issuedCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                총 {pagination.total}개 중 {(pagination.page - 1) * pagination.limit + 1}-
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
