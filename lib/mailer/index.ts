/**
 * 트랜잭션 이메일 발송 어댑터.
 *
 * 우선순위:
 * 1) RESEND_API_KEY 가 설정되어 있으면 Resend 사용.
 * 2) 그 외에는 Console 어댑터 — 로컬/CI 환경에서는 콘솔에만 출력.
 *
 * 이 모듈은 결제 알림/비밀번호 재설정/주문 알림 등 중요한 알림에 사용된다.
 * 실패 시 상위 흐름을 막지 않도록 호출자는 try/catch 로 감싸 best-effort 처리한다.
 */

import { logger } from '@/lib/logger';

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface MailResult {
  success: boolean;
  messageId?: string;
  adapter: 'resend' | 'console' | 'noop';
  error?: string;
}

export interface MailerAdapter {
  send(input: MailInput): Promise<MailResult>;
}

class ConsoleMailer implements MailerAdapter {
  async send(input: MailInput): Promise<MailResult> {
    logger.info('mail.console_dispatch', {
      to: '[REDACTED]',
      subject: input.subject,
      htmlLength: input.html.length,
    });
    return { success: true, adapter: 'console', messageId: `console-${Date.now()}` };
  }
}

class ResendMailer implements MailerAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(input: MailInput): Promise<MailResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: input.from ?? this.from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        return { success: false, adapter: 'resend', error: body };
      }
      const data = (await res.json()) as { id?: string };
      return { success: true, adapter: 'resend', messageId: data.id };
    } catch (err) {
      return {
        success: false,
        adapter: 'resend',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

let cachedMailer: MailerAdapter | null = null;

export function getMailer(): MailerAdapter {
  if (cachedMailer) return cachedMailer;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? 'Parable Mall <no-reply@parable-ent.com>';
  if (apiKey) {
    cachedMailer = new ResendMailer(apiKey, from);
  } else {
    cachedMailer = new ConsoleMailer();
  }
  return cachedMailer;
}

export function setMailerForTesting(adapter: MailerAdapter | null): void {
  cachedMailer = adapter;
}

/**
 * 자주 쓰이는 템플릿.
 */
export const templates = {
  passwordReset(resetUrl: string): { subject: string; html: string; text: string } {
    const subject = '[Parable Mall] 비밀번호 재설정 안내';
    const text = `아래 링크에서 비밀번호를 재설정해주세요 (유효기간 1시간):\n${resetUrl}\n\n본인이 요청하지 않았다면 이 메일을 무시해주세요.`;
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="font-size:20px;margin-bottom:16px;">비밀번호 재설정</h2>
        <p style="color:#444;line-height:1.6;">
          아래 버튼을 눌러 비밀번호를 재설정할 수 있습니다. 이 링크는 1시간 동안 유효합니다.
        </p>
        <p style="margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#0f172a;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">비밀번호 재설정</a>
        </p>
        <p style="color:#888;font-size:12px;">버튼이 동작하지 않으면 아래 링크를 복사해 브라우저에 붙여넣으세요:<br/>${resetUrl}</p>
        <p style="color:#888;font-size:12px;margin-top:24px;">본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
      </div>
    `;
    return { subject, html, text };
  },
  orderConfirmation(
    orderNumber: string,
    totalAmount: number,
  ): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `[Parable Mall] 주문이 완료되었습니다 (${orderNumber})`;
    const text = `주문번호: ${orderNumber}\n결제 금액: ${totalAmount.toLocaleString('ko-KR')}원\n\n마이페이지에서 자세한 내역을 확인하실 수 있습니다.`;
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="font-size:20px;margin-bottom:16px;">주문이 완료되었습니다</h2>
        <p style="color:#444;line-height:1.6;">
          주문번호: <strong>${orderNumber}</strong><br/>
          결제 금액: <strong>${totalAmount.toLocaleString('ko-KR')}원</strong>
        </p>
        <p style="color:#888;font-size:12px;">마이페이지 > 주문 내역에서 배송 현황을 확인하실 수 있습니다.</p>
      </div>
    `;
    return { subject, html, text };
  },
};
