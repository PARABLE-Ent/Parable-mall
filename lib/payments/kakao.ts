/**
 * 카카오페이 단일결제 어댑터.
 *
 * - KAKAOPAY_SECRET_KEY (SECRET_KEY_DEV / LIVE) 및 KAKAOPAY_CID 가 필요.
 * - 클라이언트 → "ready" 로 결제 준비 → tid 획득 → 사용자 approvalUrl 리다이렉트
 *   → pg_token 으로 복귀 → "approve" 로 결제 확정.
 * - 서버는 approve 응답의 amount.total 값을 주문 금액과 비교하여 위변조 방지.
 *
 * 실제 배포 전 카카오 비즈 콘솔에서 단건결제 상품 등록 후 CID 를 발급받아야 한다.
 * 이 모듈은 프로덕션 런칭 수준 인터페이스를 제공하되, 외부 호출은 실제 키가
 * 주입되지 않으면 `MissingProviderConfig` 를 던져 명시적으로 실패하도록 한다.
 */

import { logger } from '@/lib/logger';

const KAKAO_API_BASE = 'https://open-api.kakaopay.com';

export class KakaoPayError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'KakaoPayError';
  }
}

function getConfig() {
  const secret = process.env.KAKAOPAY_SECRET_KEY;
  const cid = process.env.KAKAOPAY_CID ?? 'TC0ONETIME';
  if (!secret) {
    throw new KakaoPayError(
      '카카오페이가 아직 연동되지 않았습니다 (KAKAOPAY_SECRET_KEY 미설정).',
      'NOT_CONFIGURED',
    );
  }
  return { secret, cid };
}

function authHeaders(secret: string): Record<string, string> {
  return {
    Authorization: `SECRET_KEY ${secret}`,
    'Content-Type': 'application/json',
  };
}

export interface KakaoReadyInput {
  partnerOrderId: string;
  partnerUserId: string;
  itemName: string;
  totalAmount: number; // 원 단위
  approvalUrl: string;
  cancelUrl: string;
  failUrl: string;
  quantity?: number;
  taxFreeAmount?: number;
}

export interface KakaoReadyResponse {
  tid: string;
  next_redirect_pc_url: string;
  next_redirect_mobile_url: string;
  next_redirect_app_url?: string;
  created_at: string;
}

export async function readyPayment(input: KakaoReadyInput): Promise<KakaoReadyResponse> {
  const { secret, cid } = getConfig();
  const res = await fetch(`${KAKAO_API_BASE}/online/v1/payment/ready`, {
    method: 'POST',
    headers: authHeaders(secret),
    body: JSON.stringify({
      cid,
      partner_order_id: input.partnerOrderId,
      partner_user_id: input.partnerUserId,
      item_name: input.itemName,
      quantity: input.quantity ?? 1,
      total_amount: input.totalAmount,
      tax_free_amount: input.taxFreeAmount ?? 0,
      approval_url: input.approvalUrl,
      cancel_url: input.cancelUrl,
      fail_url: input.failUrl,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new KakaoPayError(`카카오페이 준비 실패: ${body}`);
  }
  return (await res.json()) as KakaoReadyResponse;
}

export interface KakaoApproveInput {
  tid: string;
  partnerOrderId: string;
  partnerUserId: string;
  pgToken: string;
}

export interface KakaoApproveResponse {
  aid: string;
  tid: string;
  cid: string;
  partner_order_id: string;
  partner_user_id: string;
  payment_method_type: 'MONEY' | 'CARD';
  amount: {
    total: number;
    tax_free: number;
    vat: number;
    point: number;
    discount: number;
  };
  item_name: string;
  quantity: number;
  created_at: string;
  approved_at: string;
}

export async function approvePayment(input: KakaoApproveInput): Promise<KakaoApproveResponse> {
  const { secret, cid } = getConfig();
  const res = await fetch(`${KAKAO_API_BASE}/online/v1/payment/approve`, {
    method: 'POST',
    headers: authHeaders(secret),
    body: JSON.stringify({
      cid,
      tid: input.tid,
      partner_order_id: input.partnerOrderId,
      partner_user_id: input.partnerUserId,
      pg_token: input.pgToken,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new KakaoPayError(`카카오페이 승인 실패: ${body}`);
  }
  const data = (await res.json()) as KakaoApproveResponse;
  logger.info('kakao.payment_approved', { tid: data.tid, amount: data.amount.total });
  return data;
}

export async function cancelPayment(
  tid: string,
  cancelAmount: number,
  cancelTaxFreeAmount = 0,
): Promise<unknown> {
  const { secret, cid } = getConfig();
  const res = await fetch(`${KAKAO_API_BASE}/online/v1/payment/cancel`, {
    method: 'POST',
    headers: authHeaders(secret),
    body: JSON.stringify({
      cid,
      tid,
      cancel_amount: cancelAmount,
      cancel_tax_free_amount: cancelTaxFreeAmount,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new KakaoPayError(`카카오페이 취소 실패: ${body}`);
  }
  return res.json();
}
