/**
 * 결제 게이트웨이 공통 인터페이스.
 *
 * 주문 확정 시 어떤 PG 든 동일한 (amount 검증 + paymentKey + method + receiptUrl)
 * 형태의 결과로 수렴되도록 래퍼를 제공한다.
 */

import * as kakao from './kakao';
import * as naver from './naver';
import { cancelPayment as tossCancel, confirmPayment as tossConfirm, mapTossMethod } from './toss';

export type ConfirmedPaymentMethod =
  | 'CARD'
  | 'VIRTUAL_ACCOUNT'
  | 'BANK_TRANSFER'
  | 'KAKAO_PAY'
  | 'NAVER_PAY'
  | 'TOSS_PAY';

export interface ConfirmedPayment {
  provider: 'toss' | 'kakao' | 'naver';
  paymentKey: string;
  method: ConfirmedPaymentMethod;
  amount: number;
  receiptUrl?: string;
  raw: unknown;
}

/**
 * 토스페이먼츠 확정. Toss confirm API 자체가 금액/서명을 검증한다.
 */
export async function confirmToss(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<ConfirmedPayment> {
  const result = await tossConfirm(input);
  if (result.totalAmount !== input.amount) {
    throw new Error('결제 금액이 일치하지 않습니다 (Toss).');
  }
  return {
    provider: 'toss',
    paymentKey: result.paymentKey,
    method: mapTossMethod(result.method),
    amount: result.totalAmount,
    receiptUrl: result.receipt?.url,
    raw: result,
  };
}

/**
 * 카카오페이 확정.
 */
export async function confirmKakao(input: {
  tid: string;
  partnerOrderId: string;
  partnerUserId: string;
  pgToken: string;
  expectedAmount: number;
}): Promise<ConfirmedPayment> {
  const result = await kakao.approvePayment(input);
  if (result.amount.total !== input.expectedAmount) {
    throw new Error('결제 금액이 일치하지 않습니다 (KakaoPay).');
  }
  return {
    provider: 'kakao',
    paymentKey: result.tid,
    method: 'KAKAO_PAY',
    amount: result.amount.total,
    raw: result,
  };
}

/**
 * 네이버페이 확정.
 */
export async function confirmNaver(input: {
  paymentId: string;
  expectedAmount: number;
}): Promise<ConfirmedPayment> {
  const result = await naver.approvePayment(input.paymentId);
  const amount = result.body?.totalPayAmount ?? 0;
  if (amount !== input.expectedAmount) {
    throw new Error('결제 금액이 일치하지 않습니다 (NaverPay).');
  }
  return {
    provider: 'naver',
    paymentKey: result.body?.paymentId ?? input.paymentId,
    method: 'NAVER_PAY',
    amount,
    raw: result,
  };
}

/**
 * 환불/취소 라우터. 저장된 paymentKey + method 로 PG 별 취소 API 를 호출한다.
 */
export async function cancelPaymentByMethod(params: {
  method: ConfirmedPaymentMethod;
  paymentKey: string;
  amount: number;
  reason: string;
}): Promise<void> {
  switch (params.method) {
    case 'KAKAO_PAY':
      await kakao.cancelPayment(params.paymentKey, params.amount);
      return;
    case 'NAVER_PAY':
      await naver.cancelPayment(params.paymentKey, params.amount, params.reason);
      return;
    case 'CARD':
    case 'VIRTUAL_ACCOUNT':
    case 'BANK_TRANSFER':
    case 'TOSS_PAY':
      await tossCancel(params.paymentKey, params.reason, params.amount);
      return;
  }
}

export { kakao, naver };
