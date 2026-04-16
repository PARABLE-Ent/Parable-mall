import Link from 'next/link';

const FOOTER_LINKS = {
  고객지원: [
    { href: '/faq', label: 'FAQ' },
    { href: '/about', label: '사업자 정보' },
  ],
  법적고지: [
    { href: '/terms', label: '이용약관' },
    { href: '/privacy', label: '개인정보처리방침' },
    { href: '/refund', label: '환불/반품 정책' },
  ],
  카테고리: [
    { href: '/categories/clothing', label: '의류' },
    { href: '/categories/accessories', label: '액세서리' },
    { href: '/categories/albums', label: '앨범/음반' },
  ],
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

        {/* 하단 사업자 정보 */}
        <div className="text-muted-foreground mt-8 border-t pt-6 text-xs">
          <p>상호명: Parable-ENT | 대표: [대표자명] | 사업자등록번호: [000-00-00000]</p>
          <p className="mt-1">통신판매업신고: [제0000-서울강남-0000호] | 주소: [사업장 주소]</p>
          <p className="mt-1">고객센터: [전화번호] | 이메일: cs@parable-ent.com</p>
          <p className="mt-3">
            &copy; {new Date().getFullYear()} Parable-ENT. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
