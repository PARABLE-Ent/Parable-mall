import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/auth/admin-api';
import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/utils/api-response';

const answerQnaSchema = z.object({
  answer: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdminApi(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;

  const body: unknown = await request.json();
  const parsed = answerQnaSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('답변 내용을 입력해주세요. (최대 2000자)', 400);
  }

  const qna = await prisma.qnA.findUnique({
    where: { id, deletedAt: null },
  });

  if (!qna) {
    return apiError('Q&A를 찾을 수 없습니다.', 404);
  }

  const updated = await prisma.qnA.update({
    where: { id },
    data: {
      answer: parsed.data.answer,
      isAnswered: true,
    },
  });

  await logAudit({
    adminUserId: ctx.session.adminUser.id,
    action: 'UPDATE',
    entity: 'QnA',
    entityId: id,
    changes: { answered: [qna.isAnswered, true] },
    ipAddress: ctx.ip,
  });

  return apiSuccess(updated);
}
