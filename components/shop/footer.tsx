import Link from 'next/link';

// 헤더와 동일한 카테고리 목록을 공유 — 불일치 방지
const CATEGORY_LINKS = [
  { href: '/categories/clothing', label: '의류' },
  { href: '/categories/accessories', label: '액세서리' },
  { href: '/categories/albums', label: '앨범/음반' },
  { href: '/categories/photocards', label: '포토카드' },
  { href: '/categories/lifestyle', label: '생활용품' },
];

const FOOTER_LINKS = {
  고객지원: [
    { href: '/about', label: '사업자 정보' },
    { href: 'mailto:cs@parable-ent.com', label: '문의 메일' },
  ],
  법적고지: [
    { href: '/terms', label: '이용약관' },
    { href: '/privacy', label: '개인정보처리방침' },
    { href: '/refund', label: '환불/반품 정책' },
  ],
  카테고리: CATEGORY_LINKS,
};

export function Footer() {
  return (
    <footer className="bg-muted/40 border-t">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* 브랜드 */}
          <div>
            <h3 className="text-lg font-bold">Parable Mall</h3>
            <p className="text-muted-foreground mt-2 text-sm">Parable-ENT 공식 온라인 스토어</p>
          </div>

          {/* 링크 그룹 */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-3 text-sm font-semibold">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/*
          하단 사업자 정보
          TODO(legal): 정식 오픈 전 대표자명/사업자번호/통신판매업신고/주소/대표전화를
          실제 값으로 교체. 임시로는 "준비 중" 노출로 사용자 신뢰도 유지.
        */}
        <div className="text-muted-foreground mt-8 border-t pt-6 text-xs">
          <p>상호명: Parable-ENT | 대표: 준비 중 | 사업자등록번호: 준비 중</p>
          <p className="mt-1">통신판매업신고: 준비 중 | 주소: 준비 중</p>
          <p className="mt-1">고객센터: 준비 중 | 이메일: cs@parable-ent.com</p>
          <p className="mt-3">
            &copy; {new Date().getFullYear()} Parable-ENT. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
