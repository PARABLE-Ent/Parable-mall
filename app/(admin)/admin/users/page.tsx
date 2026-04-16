'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface User {
  id: string;
  name: string | null;
  email: string;
  gradeLevel: string;
  totalSpent: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UsersResponse {
  data: User[];
  pagination: Pagination;
}

const GRADE_LABELS: Record<string, string> = {
  NORMAL: '일반',
  SILVER: '실버',
  GOLD: '골드',
  VIP: 'VIP',
};

const GRADE_BADGE: Record<string, string> = {
  NORMAL: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  SILVER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  GOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  VIP: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(async (currentPage: number, query: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
      if (query) params.set('search', query);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error('회원 목록을 불러올 수 없습니다.');
      const json = (await res.json()) as UsersResponse;
      setUsers(json.data);
      setPagination(json.pagination ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers(page, search);
  }, [fetchUsers, page, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">회원 관리</h1>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-40 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-16 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-24 animate-pulse rounded" />
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
        <h1 className="text-2xl font-bold">회원 관리</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <AlertTriangle className="text-destructive h-10 w-10" />
            <p className="text-destructive">{error}</p>
            <Button onClick={() => void fetchUsers(page, search)}>
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
      <h1 className="text-2xl font-bold">회원 관리</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="이름 또는 이메일 검색..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="px-4 py-3 font-medium">이름</th>
                  <th className="px-4 py-3 font-medium">이메일</th>
                  <th className="px-4 py-3 font-medium">등급</th>
                  <th className="px-4 py-3 font-medium text-right">총 구매액</th>
                  <th className="px-4 py-3 font-medium">가입일</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                      회원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/50 border-b">
                      <td className="px-4 py-3 font-medium">{user.name ?? '(이름 없음)'}</td>
                      <td className="text-muted-foreground px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${GRADE_BADGE[user.gradeLevel] ?? 'bg-gray-100 text-gray-800'}`}
                        >
                          {GRADE_LABELS[user.gradeLevel] ?? user.gradeLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.totalSpent.toLocaleString('ko-KR')}원
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-xs">
                        {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                총 {pagination.total}명 중 {(pagination.page - 1) * pagination.limit + 1}-
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
