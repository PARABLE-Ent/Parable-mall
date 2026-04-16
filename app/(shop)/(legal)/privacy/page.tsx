import type { Metadata } from 'next';

export const metadata: Metadata = { title: '개인정보처리방침' };

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">개인정보처리방침</h1>
      <div className="prose mt-6 max-w-none text-sm">
        <p className="text-muted-foreground">
          Parable-ENT(이하 &quot;회사&quot;)는 개인정보보호법에 따라 이용자의 개인정보 보호 및
          권익을 보호하고 개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은
          처리방침을 두고 있습니다.
        </p>

        <h2 className="mt-6 text-lg font-semibold">1. 수집하는 개인정보 항목</h2>
        <p>
          <strong>필수항목:</strong> 이메일, 이름, 비밀번호
        </p>
        <p>
          <strong>선택항목:</strong> 휴대폰 번호, 배송지 주소
        </p>
        <p>
          <strong>자동수집항목:</strong> 접속 IP, 쿠키, 서비스 이용기록
        </p>

        <h2 className="mt-6 text-lg font-semibold">2. 개인정보의 수집 및 이용목적</h2>
        <p>회원 관리, 상품 주문 및 배송, 결제 처리, 고객 상담, 마케팅 (동의 시)</p>

        <h2 className="mt-6 text-lg font-semibold">3. 개인정보의 보유 및 이용기간</h2>
        <p>회원 탈퇴 시 즉시 파기. 단, 관계법령에 따라 아래 기간 보관:</p>
        <ul>
          <li>계약 또는 청약철회: 5년 (전자상거래법)</li>
          <li>대금결제 및 재화 공급: 5년 (전자상거래법)</li>
          <li>소비자 불만 처리: 3년 (전자상거래법)</li>
          <li>접속 기록: 3개월 (통신비밀보호법)</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">4. 개인정보의 제3자 제공</h2>
        <p>
          회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 아래의 경우 예외로
          합니다:
        </p>
        <ul>
          <li>이용자가 사전에 동의한 경우</li>
          <li>법령에 의하여 요구되는 경우</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">5. 개인정보 처리 위탁</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">위탁받는 자</th>
              <th className="text-left">위탁업무</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>[결제 PG사]</td>
              <td>결제 처리</td>
            </tr>
            <tr>
              <td>[배송업체]</td>
              <td>상품 배송</td>
            </tr>
            <tr>
              <td>[클라우드 서비스]</td>
              <td>데이터 보관 및 서버 운영</td>
            </tr>
          </tbody>
        </table>

        <h2 className="mt-6 text-lg font-semibold">6. 정보주체의 권리</h2>
        <p>이용자는 다음의 권리를 행사할 수 있습니다:</p>
        <ul>
          <li>개인정보 열람 요구</li>
          <li>오류 정정 요구</li>
          <li>삭제 요구</li>
          <li>처리 정지 요구</li>
        </ul>
        <p>위 권리 행사는 마이페이지 또는 고객센터를 통해 가능합니다.</p>

        <h2 className="mt-6 text-lg font-semibold">7. 만 14세 미만 아동의 개인정보</h2>
        <p>만 14세 미만 아동의 회원가입을 제한합니다.</p>

        <h2 className="mt-6 text-lg font-semibold">8. 개인정보보호 책임자</h2>
        <ul>
          <li>성명: [개인정보보호 책임자명]</li>
          <li>직위: [직위]</li>
          <li>연락처: [전화번호 / 이메일]</li>
        </ul>

        <p className="text-muted-foreground mt-8 text-xs">
          ※ 본 방침은 샘플입니다. 실제 운영 시 법률 검토를 거쳐 교체해야 합니다.
        </p>
      </div>
    </div>
  );
}
