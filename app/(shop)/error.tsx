'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러 로깅 (Sentry 등)
    console.error('[Shop Error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="text-destructive mb-4 h-12 w-12" />
      <h2 className="mb-2 text-xl font-bold">문제가 발생했습니다</h2>
      <p className="text-muted-foreground mb-6 max-w-md text-sm">
        페이지를 불러오는 중에 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
