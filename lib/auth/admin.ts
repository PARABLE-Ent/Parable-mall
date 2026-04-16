import bcryptjs from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { redis } from '@/lib/cache/redis';

import type { AdminSession } from './types';

const ADMIN_SESSION_PREFIX = 'admin:session:';
const ADMIN_SESSION_TTL = 8 * 60 * 60; // 8시간

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function adminLogin(
  input: z.infer<typeof adminLoginSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = adminLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: '입력 형식이 올바르지 않습니다.' };
  }

  const admin = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email, deletedAt: null, isActive: true },
  });

  if (!admin) {
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }

  const isValid = await bcryptjs.compare(parsed.data.password, admin.password);
  if (!isValid) {
    return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  }

  const sessionId = crypto.randomUUID();
  const sessionData: AdminSession = {
    adminUser: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  };

  // Upstash Redis: set with EX option
  await redis.set(`${ADMIN_SESSION_PREFIX}${sessionId}`, JSON.stringify(sessionData), {
    ex: ADMIN_SESSION_TTL,
  });

  const cookieStore = await cookies();
  cookieStore.set('admin_session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_TTL,
    path: '/admin',
  });

  return { success: true };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('admin_session')?.value;
  if (!sessionId) return null;

  const data = await redis.get<string>(`${ADMIN_SESSION_PREFIX}${sessionId}`);
  if (!data) return null;

  try {
    // Upstash는 자동 역직렬화할 수 있으므로 타입에 따라 분기
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return parsed as AdminSession;
  } catch {
    await redis.del(`${ADMIN_SESSION_PREFIX}${sessionId}`);
    return null;
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }
  return session;
}

export async function requireAdminRole(
  ...roles: AdminSession['adminUser']['role'][]
): Promise<AdminSession> {
  const session = await requireAdmin();
  if (!roles.includes(session.adminUser.role)) {
    redirect('/admin?error=unauthorized');
  }
  return session;
}

export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('admin_session')?.value;
  if (sessionId) {
    await redis.del(`${ADMIN_SESSION_PREFIX}${sessionId}`);
    cookieStore.delete('admin_session');
  }
}
