'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Admin Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="text-destructive mb-4 h-12 w-12" />
      <h2 className="mb-2 text-xl font-bold">오류가 발생했습니다</h2>
      <p className="text-muted-foreground mb-6 max-w-md text-sm">
        관리자 페이지에서 문제가 발생했습니다. 새로고침하거나 잠시 후 다시 시도해주세요.
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
