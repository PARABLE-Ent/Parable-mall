/**
 * 관리자 이미지 업로드 엔드포인트.
 * - multipart/form-data 형식으로 파일을 받아 R2 에 업로드.
 * - 관리자 세션 + CSRF 검증 필요.
 * - MIME/크기 검증 후 PutObject.
 */

import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/auth/admin-api';
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { generateImageKey, uploadFile, validateImageUpload } from '@/lib/storage/r2';

export const runtime = 'nodejs';

const ALLOWED_FOLDERS = new Set(['products', 'categories', 'banners', 'reviews']);

export async function POST(request: Request) {
  const ctx = await requireAdminApi(request);
  if (ctx instanceof NextResponse) return ctx;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: '파일이 포함된 요청이 아닙니다.' }, { status: 400 });
  }

  const file = formData.get('file');
  const folderRaw = (formData.get('folder') as string | null) ?? 'products';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
  }

  if (!ALLOWED_FOLDERS.has(folderRaw)) {
    return NextResponse.json({ error: '허용되지 않은 업로드 경로입니다.' }, { status: 400 });
  }

  try {
    validateImageUpload(file.type, file.size);
  } catch (err) {
    const message = err instanceof Error ? err.message : '유효하지 않은 파일입니다.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const body = Buffer.from(arrayBuffer);
  const key = generateImageKey(folderRaw, file.name);

  try {
    const url = await uploadFile(key, body, file.type);
    await logAudit({
      adminUserId: ctx.session.adminUser.id,
      action: 'CREATE',
      entity: 'Upload',
      entityId: key,
      changes: {
        folder: [null, folderRaw],
        size: [null, file.size],
        mime: [null, file.type],
      },
      ipAddress: ctx.ip,
    });
    return NextResponse.json({ key, url });
  } catch (err) {
    logger.error('admin.upload_failed', {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: '업로드에 실패했습니다.' }, { status: 500 });
  }
}
