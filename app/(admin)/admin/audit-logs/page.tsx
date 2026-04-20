'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminFetch } from '@/lib/auth/admin-fetch';

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  ipAddress: string | null;
  createdAt: string;
  adminUser?: { name?: string | null; email?: string | null } | null;
  changes?: Record<string, [unknown, unknown]> | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminAuditLogsPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (entity) params.set('entity', entity);
      const res = await adminFetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error('감사 로그를 불러올 수 없습니다.');
      const json = (await res.json()) as { items: AuditLogItem[]; pagination: Pagination };
      setItems(json.items);
      setPagination(json.pagination ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, entity]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">감사 로그</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <AlertTriangle className="text-destructive h-10 w-10" />
            <p className="text-destructive">{error}</p>
            <Button onClick={() => void fetchLogs()}>
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
        <h1 className="text-2xl font-bold">감사 로그</h1>
        <Button variant="outline" onClick={() => void fetchLogs()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>행위 이력</span>
            <select
              className="border-input bg-background rounded-md border px-2 py-1 text-sm"
              value={entity}
              onChange={(e) => {
                setEntity(e.target.value);
                setPage(1);
              }}
            >
              <option value="">전체 엔티티</option>
              <option value="Order">주문</option>
              <option value="Product">상품</option>
              <option value="Category">카테고리</option>
              <option value="Coupon">쿠폰</option>
              <option value="Review">리뷰</option>
              <option value="QnA">Q&amp;A</option>
              <option value="Shipment">배송</option>
              <option value="Upload">업로드</option>
            </select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-muted h-8 w-full animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="px-3 py-2 font-medium">시각</th>
                    <th className="px-3 py-2 font-medium">관리자</th>
                    <th className="px-3 py-2 font-medium">행동</th>
                    <th className="px-3 py-2 font-medium">엔티티</th>
                    <th className="px-3 py-2 font-medium">변경</th>
                    <th className="px-3 py-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-muted-foreground px-3 py-8 text-center">
                        기록이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    items.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/50 border-b">
                        <td className="px-3 py-2 font-mono text-xs">
                          {new Date(log.createdAt).toLocaleString('ko-KR')}
                        </td>
                        <td className="px-3 py-2">
                          {log.adminUser?.name ?? '-'}
                          <span className="text-muted-foreground ml-1 text-xs">
                            {log.adminUser?.email ?? ''}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium">{log.action}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {log.entity}
                          <br />
                          <span className="text-muted-foreground">{log.entityId}</span>
                        </td>
                        <td className="max-w-[300px] px-3 py-2">
                          <pre className="text-muted-foreground overflow-x-auto text-xs">
                            {JSON.stringify(log.changes ?? {}, null, 0)}
                          </pre>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{log.ipAddress ?? '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

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
