// Mailer module - 트랜잭션 이메일 발송 어댑터 (Resend/SES 추후 결정)
export interface MailerAdapter {
  send(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ success: boolean; messageId?: string }>;
}
