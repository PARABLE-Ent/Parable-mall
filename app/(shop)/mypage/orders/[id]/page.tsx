'use client';

import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ProductImage {
  url: string;
  altText: string | null;
}

interface OrderItemSku {
  id: string;
  skuCode: string;
  product: {
    id: string;
    slug: string;
    images: ProductImage[];
  };
}

interface OrderItem {
  id: string;
  productName: string;
  optionText: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku: OrderItemSku;
}

interface Payment {
  id: string;
  method: string;
  status: string;
  amount: number;
  paidAt: string | null;
}

interface Shipment {
  id: string;
  carrier: string | null;
  trackingNumber: string | null;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
}

interface Refund {
  id: string;
  reason: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  shippingFee: number;
  discountAmount: number;
  createdAt: string;
  items: OrderItem[];
  payment: Payment | null;
  shipments: Shipment[];
  refunds: Refund[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: '결제 대기',
  PAID: '결제 완료',
  PREPARING: '상품 준비',
  SHIPPING: '배송 중',
  DELIVERED: '배송 완료',
  CONFIRMED: '구매 확정',
  CANCEL_REQUESTED: '취소 요청',
  CANCELLED: '취소 완료',
  REFUND_REQUESTED: '환불 요청',
  REFUNDED: '환불 완료',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: '결제 대기',
  PAID: '결제 완료',
  FAILED: '결제 실패',
  REFUNDED: '환불 완료',
};

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: '배송 준비',
  SHIPPED: '배송 중',
  DELIVERED: '배송 완료',
};

const REFUND_STATUS_LABELS: Record<string, string> = {
  REQUESTED: '요청',
  PROCESSING: '처리 중',
  COMPLETED: '완료',
  REJECTED: '거절',
};

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((res: { data: OrderDetail | null; error?: string }) => {
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          setOrder(res.data);
        }
      })
      .catch(() => setError('주문 정보를 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCancel() {
    if (!confirm('주문을 취소하시겠습니까?')) return;
    setCancelling(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, { method: 'POST' });
      const result: { data: OrderDetail | null; error?: string } = await res.json();
      if (result.error) {
        setActionMessage(result.error);
      } else if (result.data) {
        setOrder((prev) => (prev ? { ...prev, status: result.data!.status } : prev));
        setActionMessage('주문이 취소되었습니다.');
      }
    } catch {
      setActionMessage('주문 취소에 실패했습니다.');
    } finally {
      setCancelling(false);
    }
  }

  async function handleRefund() {
    if (!refundReason.trim()) return;
    setSubmitting(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/orders/${id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason }),
      });
      const result: { data: Refund | null; error?: string } = await res.json();
      if (result.error) {
        setActionMessage(result.error);
      } else {
        setActionMessage('환불 요청이 접수되었습니다.');
        setShowRefundForm(false);
        setRefundReason('');
        // Refresh order
        const refreshRes = await fetch(`/api/orders/${id}`);
        const refreshData: { data: OrderDetail | null } = await refreshRes.json();
        if (refreshData.data) setOrder(refreshData.data);
      }
    } catch {
      setActionMessage('환불 요청에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-destructive">{error ?? '주문을 찾을 수 없습니다.'}</p>
        <Link href="/mypage/orders">
          <Button variant="outline" className="mt-4">
            주문 목록으로
          </Button>
        </Link>
      </div>
    );
  }

  const canCancel = order.status === 'PENDING_PAYMENT' || order.status === 'PAID';
  const canRefund = order.status === 'DELIVERED';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2">
        <Link href="/mypage/orders">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">주문 상세</h1>
      </div>

      {actionMessage && (
        <div className="mt-4 rounded-lg border bg-muted p-3 text-sm">{actionMessage}</div>
      )}

      {/* Order Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>주문 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm">주문번호</p>
              <p className="font-medium">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">주문일시</p>
              <p className="font-medium">
                {new Date(order.createdAt).toLocaleString('ko-KR')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">주문 상태</p>
              <p className="font-medium">{STATUS_LABELS[order.status] ?? order.status}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">총 결제금액</p>
              <p className="font-bold">{order.totalAmount.toLocaleString('ko-KR')}원</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>주문 상품</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item) => {
              const imageUrl = item.sku.product.images[0]?.url;
              return (
                <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={item.productName}
                      className="h-16 w-16 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <Link
                      href={`/products/${item.sku.product.slug}`}
                      className="font-medium hover:underline"
                    >
                      {item.productName}
                    </Link>
                    {item.optionText && (
                      <p className="text-muted-foreground text-sm">{item.optionText}</p>
                    )}
                    <div className="mt-1 flex items-center gap-4 text-sm">
                      <span>{item.unitPrice.toLocaleString('ko-KR')}원</span>
                      <span className="text-muted-foreground">x {item.quantity}</span>
                      <span className="font-medium">
                        {item.totalPrice.toLocaleString('ko-KR')}원
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-1 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">배송비</span>
              <span>{order.shippingFee.toLocaleString('ko-KR')}원</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">할인</span>
                <span className="text-destructive">
                  -{order.discountAmount.toLocaleString('ko-KR')}원
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 text-base font-bold">
              <span>총 결제금액</span>
              <span>{order.totalAmount.toLocaleString('ko-KR')}원</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      {order.payment && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>결제 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-sm">결제 수단</p>
                <p className="font-medium">{order.payment.method}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">결제 상태</p>
                <p className="font-medium">
                  {PAYMENT_STATUS_LABELS[order.payment.status] ?? order.payment.status}
                </p>
              </div>
              {order.payment.paidAt && (
                <div>
                  <p className="text-muted-foreground text-sm">결제일시</p>
                  <p className="font-medium">
                    {new Date(order.payment.paidAt).toLocaleString('ko-KR')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipments */}
      {order.shipments.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>배송 정보</CardTitle>
          </CardHeader>
          <CardContent>
            {order.shipments.map((shipment) => (
              <div key={shipment.id} className="space-y-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground text-sm">배송 상태</p>
                    <p className="font-medium">
                      {SHIPMENT_STATUS_LABELS[shipment.status] ?? shipment.status}
                    </p>
                  </div>
                  {shipment.carrier && (
                    <div>
                      <p className="text-muted-foreground text-sm">택배사</p>
                      <p className="font-medium">{shipment.carrier}</p>
                    </div>
                  )}
                  {shipment.trackingNumber && (
                    <div>
                      <p className="text-muted-foreground text-sm">운송장번호</p>
                      <p className="font-medium">{shipment.trackingNumber}</p>
                    </div>
                  )}
                  {shipment.shippedAt && (
                    <div>
                      <p className="text-muted-foreground text-sm">발송일</p>
                      <p className="font-medium">
                        {new Date(shipment.shippedAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  )}
                  {shipment.deliveredAt && (
                    <div>
                      <p className="text-muted-foreground text-sm">배송완료일</p>
                      <p className="font-medium">
                        {new Date(shipment.deliveredAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Refunds */}
      {order.refunds.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>환불 내역</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.refunds.map((refund) => (
                <div key={refund.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {refund.amount.toLocaleString('ko-KR')}원
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {REFUND_STATUS_LABELS[refund.status] ?? refund.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">{refund.reason}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {new Date(refund.createdAt).toLocaleString('ko-KR')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {(canCancel || canRefund) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {canCancel && (
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              주문 취소
            </Button>
          )}
          {canRefund && !showRefundForm && (
            <Button variant="outline" onClick={() => setShowRefundForm(true)}>
              환불 요청
            </Button>
          )}
        </div>
      )}

      {/* Refund Form */}
      {showRefundForm && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>환불 요청</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label htmlFor="refund-reason">환불 사유</Label>
                <Input
                  id="refund-reason"
                  placeholder="환불 사유를 입력해주세요"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  maxLength={500}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleRefund} disabled={submitting || !refundReason.trim()}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  환불 요청하기
                </Button>
                <Button variant="ghost" onClick={() => setShowRefundForm(false)}>
                  취소
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
