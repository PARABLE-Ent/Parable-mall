import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <FileQuestion className="text-muted-foreground mb-4 h-16 w-16" />
      <h2 className="mb-2 text-2xl font-bold">페이지를 찾을 수 없습니다</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
      </p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground rounded-md px-6 py-2 text-sm font-medium"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
