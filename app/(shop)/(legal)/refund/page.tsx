import type { Metadata } from 'next';

export const metadata: Metadata = { title: '환불/반품/교환 정책' };

export default function RefundPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">환불/반품/교환 정책</h1>
      <div className="prose mt-6 max-w-none text-sm">
        <h2 className="mt-6 text-lg font-semibold">1. 청약철회 (주문 취소)</h2>
        <ul>
          <li>
            <strong>상품준비 전:</strong> 즉시 취소 가능 (자동 처리)
          </li>
          <li>
            <strong>상품준비 이후:</strong> 고객센터(CS)를 통한 취소 접수
          </li>
          <li>결제 완료 후 취소 시 영업일 기준 3일 이내 환불 처리</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">2. 반품</h2>
        <ul>
          <li>
            <strong>반품 가능 기간:</strong> 상품 수령일로부터 7일 이내
          </li>
          <li>
            <strong>단순변심:</strong> 왕복 배송비 6,000원 고객 부담
          </li>
          <li>
            <strong>불량/오배송:</strong> 배송비 회사 부담, 즉시 처리
          </li>
          <li>반품 접수 후 영업일 3일 이내 환불 처리</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">3. 교환</h2>
        <ul>
          <li>동일 상품의 다른 옵션(사이즈/색상)으로 교환 가능</li>
          <li>단순변심 교환 시 왕복 배송비 고객 부담</li>
          <li>불량/오배송 교환 시 배송비 회사 부담</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">4. 반품/교환 불가 사유</h2>
        <ul>
          <li>수령 후 7일 경과</li>
          <li>고객 책임 사유로 상품이 훼손/변질된 경우</li>
          <li>포장을 개봉하여 상품 가치가 현저히 감소한 경우</li>
          <li>시간 경과로 재판매가 곤란한 경우</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">5. 환불 방법</h2>
        <ul>
          <li>
            <strong>카드 결제:</strong> 카드사 취소 (영업일 3~5일 소요)
          </li>
          <li>
            <strong>가상계좌/무통장:</strong> 환불 계좌로 입금 (영업일 3일 이내)
          </li>
          <li>
            <strong>적립금/쿠폰:</strong> 사용한 적립금 및 쿠폰 복원
          </li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">6. 문의</h2>
        <p>반품/교환/환불 관련 문의는 고객센터로 연락해주세요.</p>

        <p className="text-muted-foreground mt-8 text-xs">
          ※ 전자상거래법 제17조(청약철회 등)에 따라 소비자 보호 규정을 준수합니다.
        </p>
      </div>
    </div>
  );
}
