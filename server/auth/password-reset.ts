/**
 * 비밀번호 재설정 흐름.
 *
 * - request: 이메일을 받아 토큰 발급 후 메일 전송. 사용자 존재 여부를 응답에서 구분하지 않음 (열거 방지).
 * - confirm: 토큰 + 새 비밀번호로 실제 비밀번호를 교체.
 * - 토큰은 Redis 에 hash 저장하여 탈취 시에도 원문 노출 방지.
 */

import bcryptjs from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

import { redis } from '@/lib/cache/redis';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getMailer, templates } from '@/lib/mailer';

const TOKEN_TTL_SECONDS = 60 * 60; // 1시간
const REDIS_PREFIX = 'pwreset:';

export const requestResetSchema = z.object({
  email: z.string().email(),
});

export const confirmResetSchema = z.object({
  token: z.string().min(16).max(128),
  password: z.string().min(8).max(128),
});

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(email: string): Promise<void> {
  // 사용자 존재 여부에 관계없이 같은 동작 — 열거 공격 방지
  const user = await prisma.user.findUnique({
    where: { email, deletedAt: null },
    select: { id: true, email: true },
  });

  if (!user) {
    logger.info('password_reset.no_such_user');
    return; // 조용히 성공 응답
  }

  const rawToken = randomBytes(32).toString('base64url');
  const hashed = hashToken(rawToken);

  await redis.set(`${REDIS_PREFIX}${hashed}`, user.id, { ex: TOKEN_TTL_SECONDS });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const mailer = getMailer();
  const tpl = templates.passwordReset(resetUrl);
  const result = await mailer.send({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
  if (!result.success) {
    logger.warn('password_reset.mail_failed', { adapter: result.adapter, error: result.error });
  }
}

export async function confirmPasswordReset(input: {
  token: string;
  password: string;
}): Promise<void> {
  const parsed = confirmResetSchema.parse(input);
  const hashed = hashToken(parsed.token);
  const key = `${REDIS_PREFIX}${hashed}`;
  const userId = await redis.get<string>(key);
  if (!userId) throw new Error('토큰이 유효하지 않거나 만료되었습니다.');

  const passwordHash = await bcryptjs.hash(parsed.password, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: passwordHash },
  });
  await redis.del(key);

  logger.info('password_reset.completed', { userId });
}
