import type { Metadata } from 'next';

export const metadata: Metadata = { title: '이용약관' };

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">이용약관</h1>
      <div className="prose mt-6 max-w-none text-sm">
        <p className="text-muted-foreground">
          본 약관은 Parable-ENT(이하 &quot;회사&quot;)가 운영하는 Parable Mall(이하
          &quot;몰&quot;)에서 제공하는 서비스의 이용조건 및 절차에 관한 사항을 규정합니다.
        </p>

        <h2 className="mt-6 text-lg font-semibold">제1조 (목적)</h2>
        <p>
          본 약관은 회사가 제공하는 전자상거래 관련 서비스를 이용함에 있어 회사와 이용자의 권리,
          의무 및 책임사항을 규정함을 목적으로 합니다.
        </p>

        <h2 className="mt-6 text-lg font-semibold">제2조 (정의)</h2>
        <p>
          1. &quot;몰&quot;이란 회사가 상품 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등
          정보통신설비를 이용하여 상품 또는 용역을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.
        </p>

        <h2 className="mt-6 text-lg font-semibold">제3조 (약관의 게시와 개정)</h2>
        <p>회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.</p>

        {/* 실제 운영 시 법률 검토를 거친 전체 약관으로 교체 필요 */}
        <p className="text-muted-foreground mt-8 text-xs">
          ※ 본 약관은 샘플입니다. 실제 운영 시 법률 검토를 거쳐 전자상거래법에 맞는 전체 약관으로
          교체해야 합니다.
        </p>
      </div>
    </div>
  );
}
