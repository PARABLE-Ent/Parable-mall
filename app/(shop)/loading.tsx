export default function ShopLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* 페이지 타이틀 스켈레톤 */}
        <div className="bg-muted h-8 w-48 animate-pulse rounded" />

        {/* 콘텐츠 그리드 스켈레톤 */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="bg-muted aspect-square animate-pulse rounded-lg" />
              <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
              <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
