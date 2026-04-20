/**
 * 관리자 행동에 대한 감사 로그 헬퍼.
 * - AuditLog 스키마(이미 존재)에 기록.
 * - 실패해도 호출자 비즈니스 로직을 멈추지 않는다 (best-effort).
 * - PII 를 포함하지 않도록 changes 에는 민감 필드를 마스킹.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS';

type Changes = Record<string, [unknown, unknown]>;

const REDACT_FIELDS = new Set(['password', 'token', 'secret', 'email', 'phone']);

function redact(changes?: Changes): Prisma.InputJsonValue | undefined {
  if (!changes) return undefined;
  const out: Record<string, [unknown, unknown]> = {};
  for (const [k, v] of Object.entries(changes)) {
    if (REDACT_FIELDS.has(k)) {
      out[k] = ['[REDACTED]', '[REDACTED]'];
    } else {
      out[k] = v;
    }
  }
  return out as Prisma.InputJsonValue;
}

export interface AuditInput {
  adminUserId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  changes?: Changes;
  ipAddress?: string | null;
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminUserId: input.adminUserId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        changes: redact(input.changes),
        ipAddress: input.ipAddress ?? undefined,
      },
    });
  } catch (err) {
    logger.error('audit.log_failed', {
      entity: input.entity,
      entityId: input.entityId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function getAuditLogs(options: {
  entity?: string;
  adminUserId?: string;
  page?: number;
  limit?: number;
}) {
  const page = options.page ?? 1;
  const limit = Math.min(options.limit ?? 50, 200);
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};
  if (options.entity) where.entity = options.entity;
  if (options.adminUserId) where.adminUserId = options.adminUserId;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { adminUser: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
