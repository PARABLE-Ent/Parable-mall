/**
 * 네이버페이 결제 어댑터 (신 API 기준 골격).
 *
 * - NAVERPAY_CLIENT_ID / NAVERPAY_CLIENT_SECRET / NAVERPAY_CHAIN_ID 필요.
 * - 플로우: 클라이언트가 NaverPay SDK 로 결제창을 띄운 뒤 resultCode 와 paymentId 를
 *   서버에 전달. 서버는 `apply/payment` 로 최종 승인 API 호출 → 금액 대조.
 *
 * 실키 없이도 타입 인터페이스는 안정적으로 노출하여, 런칭 직전 실계정 연결 시
 * 최소 변경만으로 완료할 수 있도록 한다.
 */

import { logger } from '@/lib/logger';

const NAVER_API_BASE = 'https://apis.naver.com/naverpay-partner/naverpay';

export class NaverPayError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'NaverPayError';
  }
}

function getConfig() {
  const clientId = process.env.NAVERPAY_CLIENT_ID;
  const clientSecret = process.env.NAVERPAY_CLIENT_SECRET;
  const chainId = process.env.NAVERPAY_CHAIN_ID;
  if (!clientId || !clientSecret || !chainId) {
    throw new NaverPayError(
      '네이버페이가 아직 연동되지 않았습니다 (NAVERPAY_* 미설정).',
      'NOT_CONFIGURED',
    );
  }
  return { clientId, clientSecret, chainId };
}

function authHeaders(cfg: ReturnType<typeof getConfig>): Record<string, string> {
  return {
    'X-Naver-Client-Id': cfg.clientId,
    'X-Naver-Client-Secret': cfg.clientSecret,
    'X-NaverPay-Chain-Id': cfg.chainId,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

export interface NaverApproveResponse {
  code: 'Success' | string;
  message?: string;
  body?: {
    paymentId: string;
    totalPayAmount: number;
    merchantPayKey: string;
    merchantUserKey: string;
    admissionYmdt: string;
  };
}

export async function approvePayment(paymentId: string): Promise<NaverApproveResponse> {
  const cfg = getConfig();
  const res = await fetch(`${NAVER_API_BASE}/v1/apply/payment`, {
    method: 'POST',
    headers: authHeaders(cfg),
    body: new URLSearchParams({ paymentId }),
  });
  const data = (await res.json()) as NaverApproveResponse;
  if (!res.ok || data.code !== 'Success') {
    throw new NaverPayError(`네이버페이 승인 실패: ${data.message ?? data.code}`);
  }
  logger.info('naver.payment_approved', {
    paymentId: data.body?.paymentId,
    amount: data.body?.totalPayAmount,
  });
  return data;
}

export async function cancelPayment(
  paymentId: string,
  cancelAmount: number,
  reason: string,
): Promise<unknown> {
  const cfg = getConfig();
  const res = await fetch(`${NAVER_API_BASE}/v1/cancel`, {
    method: 'POST',
    headers: authHeaders(cfg),
    body: new URLSearchParams({
      paymentId,
      cancelAmount: String(cancelAmount),
      cancelReason: reason,
      cancelRequester: '2',
    }),
  });
  const data = (await res.json()) as { code?: string; message?: string };
  if (!res.ok || data.code !== 'Success') {
    throw new NaverPayError(`네이버페이 취소 실패: ${data.message ?? data.code}`);
  }
  return data;
}
