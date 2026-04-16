import { z } from 'zod';

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

function getAuthHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) throw new Error('TOSS_SECRET_KEY is not configured');
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
}

export const tossConfirmSchema = z.object({
  paymentKey: z.string(),
  orderId: z.string(),
  amount: z.number().int().positive(),
});

export interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  method: string;
  totalAmount: number;
  receipt?: { url: string };
  card?: { number: string; installmentPlanMonths: number };
  virtualAccount?: { accountNumber: string; bankCode: string; dueDate: string };
}

export async function confirmPayment(
  input: z.infer<typeof tossConfirmSchema>,
): Promise<TossPaymentResponse> {
  const { paymentKey, orderId, amount } = tossConfirmSchema.parse(input);

  const response = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message ?? '결제 확인에 실패했습니다.');
  }

  return response.json() as Promise<TossPaymentResponse>;
}

export async function cancelPayment(
  paymentKey: string,
  reason: string,
  amount?: number,
): Promise<TossPaymentResponse> {
  const response = await fetch(`${TOSS_API_BASE}/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cancelReason: reason,
      ...(amount && { cancelAmount: amount }),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message ?? '결제 취소에 실패했습니다.');
  }

  return response.json() as Promise<TossPaymentResponse>;
}

export function mapTossMethod(
  method: string,
): 'CARD' | 'VIRTUAL_ACCOUNT' | 'BANK_TRANSFER' | 'TOSS_PAY' {
  switch (method) {
    case '카드':
      return 'CARD';
    case '가상계좌':
      return 'VIRTUAL_ACCOUNT';
    case '계좌이체':
      return 'BANK_TRANSFER';
    default:
      return 'TOSS_PAY';
  }
}
