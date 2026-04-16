import type { Metadata } from 'next';

export const metadata: Metadata = { title: '사업자 정보' };

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">사업자 정보</h1>
      <div className="mt-6 space-y-2 text-sm">
        <table className="w-full">
          <tbody className="divide-y">
            {[
              ['상호명', 'Parable-ENT'],
              ['대표', '[대표자명]'],
              ['사업자등록번호', '[000-00-00000]'],
              ['통신판매업신고번호', '[제0000-서울강남-0000호]'],
              ['주소', '[사업장 주소]'],
              ['고객센터', '[전화번호]'],
              ['이메일', '[cs@parable-ent.com]'],
              ['호스팅 서비스', 'Vercel Inc.'],
            ].map(([label, value]) => (
              <tr key={label}>
                <td className="text-muted-foreground py-2 font-medium">{label}</td>
                <td className="py-2">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-muted-foreground mt-4 text-xs">
          ※ 전자상거래법 제13조에 따른 사업자 정보 표시
        </p>
      </div>
    </div>
  );
}
