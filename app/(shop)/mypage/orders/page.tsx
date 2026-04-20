'use client';

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface OrderPayment {
  method: string;
  status: string;
  paidAt: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  payment: OrderPayment | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

function getStatusColor(status: string): string {
  switch (status) {
    case 'PAID':
    case 'CONFIRMED':
      return 'bg-green-100 text-green-800';
    case 'SHIPPING':
    case 'PREPARING':
      return 'bg-blue-100 text-blue-800';
    case 'PENDING_PAYMENT':
      return 'bg-yellow-100 text-yellow-800';
    case 'CANCELLED':
    case 'REFUNDED':
      return 'bg-gray-100 text-gray-600';
    case 'CANCEL_REQUESTED':
    case 'REFUND_REQUESTED':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/orders?page=${page}&limit=10`);
        const res = (await r.json()) as {
          data: Order[] | null;
          pagination?: Pagination;
          error?: string;
        };
        if (cancelled) return;
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          setOrders(res.data);
          if (res.pagination) setPagination(res.pagination);
        }
      } catch {
        if (!cancelled) setError('주문 목록을 불러오는데 실패했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page]);

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
      <div className="flex items-center gap-2">
        <Link href="/mypage">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">주문내역</h1>
      </div>

      {orders.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">주문 내역이 없습니다.</p>
          <Link href="/">
            <Button className="mt-4">쇼핑하러 가기</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/mypage/orders/${order.id}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{order.orderNumber}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
                        >
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                      {order.items.length > 0 && (
                        <p className="mt-1 text-sm">
                          {order.items[0].productName}
                          {order.items.length > 1 && ` 외 ${order.items.length - 1}건`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{order.totalAmount.toLocaleString('ko-KR')}원</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
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
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
