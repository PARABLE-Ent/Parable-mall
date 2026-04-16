'use client';

import { ChevronLeft, Loader2, MapPin, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Address {
  id: string;
  label: string | null;
  recipient: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string | null;
  isDefault: boolean;
  createdAt: string;
}

interface AddressForm {
  label: string;
  recipient: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2: string;
  isDefault: boolean;
}

const EMPTY_FORM: AddressForm = {
  label: '',
  recipient: '',
  phone: '',
  zipCode: '',
  address1: '',
  address2: '',
  isDefault: false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function fetchAddresses() {
    fetch('/api/addresses')
      .then((r) => r.json())
      .then((res: { data: Address[] | null; error?: string }) => {
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          setAddresses(res.data);
        }
      })
      .catch(() => setError('배송지 목록을 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchAddresses();
  }, []);

  function updateForm(field: keyof AddressForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.recipient || !form.phone || !form.zipCode || !form.address1) {
      setFormError('필수 항목을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label || undefined,
          recipient: form.recipient,
          phone: form.phone,
          zipCode: form.zipCode,
          address1: form.address1,
          address2: form.address2 || undefined,
          isDefault: form.isDefault,
        }),
      });
      const result: { data: Address | null; error?: string } = await res.json();
      if (result.error) {
        setFormError(result.error);
      } else {
        setForm(EMPTY_FORM);
        setShowForm(false);
        fetchAddresses();
      }
    } catch {
      setFormError('배송지 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(addressId: string) {
    if (!confirm('이 배송지를 삭제하시겠습니까?')) return;
    setDeletingId(addressId);
    try {
      const res = await fetch(`/api/addresses/${addressId}`, { method: 'DELETE' });
      const result: { data: unknown; error?: string } = await res.json();
      if (!result.error) {
        setAddresses((prev) => prev.filter((a) => a.id !== addressId));
      }
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/mypage">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">배송지 관리</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="mr-1 h-4 w-4" />
          {showForm ? '닫기' : '새 배송지'}
        </Button>
      </div>

      {/* Add Address Form */}
      {showForm && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>새 배송지 등록</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="addr-label">배송지명</Label>
                  <Input
                    id="addr-label"
                    placeholder="예: 집, 회사"
                    value={form.label}
                    onChange={(e) => updateForm('label', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="addr-recipient">
                    수령인 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="addr-recipient"
                    placeholder="수령인 이름"
                    value={form.recipient}
                    onChange={(e) => updateForm('recipient', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="addr-phone">
                    연락처 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="addr-phone"
                    placeholder="010-0000-0000"
                    value={form.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="addr-zipcode">
                    우편번호 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="addr-zipcode"
                    placeholder="우편번호"
                    value={form.zipCode}
                    onChange={(e) => updateForm('zipCode', e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="addr-address1">
                    주소 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="addr-address1"
                    placeholder="기본 주소"
                    value={form.address1}
                    onChange={(e) => updateForm('address1', e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="addr-address2">상세 주소</Label>
                  <Input
                    id="addr-address2"
                    placeholder="상세 주소 (선택)"
                    value={form.address2}
                    onChange={(e) => updateForm('address2', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="addr-default"
                  checked={form.isDefault}
                  onChange={(e) => updateForm('isDefault', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="addr-default" className="text-sm font-normal">
                  기본 배송지로 설정
                </Label>
              </div>
              {formError && <p className="text-destructive text-sm">{formError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  등록
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setForm(EMPTY_FORM);
                    setFormError(null);
                  }}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Address List */}
      {addresses.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <MapPin className="text-muted-foreground h-12 w-12" />
            <div className="text-center">
              <p className="font-medium">등록된 배송지가 없습니다</p>
              <p className="text-muted-foreground mt-1 text-sm">
                새 배송지를 등록해주세요.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {address.label && (
                        <span className="font-medium">{address.label}</span>
                      )}
                      {address.isDefault && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          기본 배송지
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm">
                      {address.recipient} / {address.phone}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      [{address.zipCode}] {address.address1}
                      {address.address2 && ` ${address.address2}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(address.id)}
                    disabled={deletingId === address.id}
                  >
                    {deletingId === address.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
