import { NextResponse } from 'next/server';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiSuccessResponse<T> {
  data: T;
  pagination?: PaginationMeta;
}

interface ApiErrorResponse {
  data: null;
  error: string;
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data }, { status });
}

export function apiPaginated<T>(
  data: T,
  pagination: PaginationMeta,
  status = 200,
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data, pagination }, { status });
}

export function apiError(error: string, status = 400): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ data: null, error }, { status });
}

export function getPaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
