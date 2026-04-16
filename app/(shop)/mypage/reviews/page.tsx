'use client';

import { ChevronLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ReviewsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2">
        <Link href="/mypage">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">내 리뷰 목록</h1>
      </div>

      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-4 py-16">
          <MessageSquare className="text-muted-foreground h-12 w-12" />
          <div className="text-center">
            <p className="font-medium">작성한 리뷰가 없습니다</p>
            <p className="text-muted-foreground mt-1 text-sm">
              상품 구매 후 리뷰를 작성하시면 이곳에 표시됩니다.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">쇼핑하러 가기</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
