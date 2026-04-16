'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Product {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  status: string;
  stockCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductsResponse {
  data: Product[];
  pagination: Pagination;
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  OUT_OF_STOCK: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  DRAFT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '판매중',
  INACTIVE: '비활성',
  OUT_OF_STOCK: '품절',
  DRAFT: '임시저장',
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchProducts = useCallback(async (currentPage: number, query: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
      if (query) params.set('search', query);
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (!res.ok) throw new Error('상품 목록을 불러올 수 없습니다.');
      const json = (await res.json()) as ProductsResponse;
      setProducts(json.data);
      setPagination(json.pagination ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts(page, search);
  }, [fetchProducts, page, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">상품 관리</h1>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="bg-muted h-4 w-40 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-16 animate-pulse rounded" />
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
        <h1 className="text-2xl font-bold">상품 관리</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <AlertTriangle className="text-destructive h-10 w-10" />
            <p className="text-destructive">{error}</p>
            <Button onClick={() => void fetchProducts(page, search)}>
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
        <h1 className="text-2xl font-bold">상품 관리</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          상품 등록
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="상품명 검색..."
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
                  <th className="px-4 py-3 font-medium">상품명</th>
                  <th className="px-4 py-3 font-medium">카테고리</th>
                  <th className="px-4 py-3 font-medium text-right">기본가</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium text-right">재고</th>
                  <th className="px-4 py-3 font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted-foreground px-4 py-8 text-center">
                      상품이 없습니다.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-muted/50 border-b">
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="text-muted-foreground px-4 py-3">{product.category}</td>
                      <td className="px-4 py-3 text-right">
                        {product.basePrice.toLocaleString('ko-KR')}원
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[product.status] ?? 'bg-gray-100 text-gray-800'}`}
                        >
                          {STATUS_LABEL[product.status] ?? product.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{product.stockCount}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm">
                          <Edit className="mr-1 h-3 w-3" />
                          수정
                        </Button>
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
