/**
 * 멱등(idempotent) 관리자 계정 보장 스크립트
 *
 * 사용법:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/ensure-admin.ts
 *
 * 환경변수 옵션:
 *   ADMIN_EMAIL      (기본값: admin@parable-ent.com)
 *   ADMIN_PASSWORD   (기본값: Admin1234!)
 *   ADMIN_NAME       (기본값: 관리자)
 *   ADMIN_ROLE       (기본값: OWNER, 가능한 값: OWNER | MANAGER | CS)
 *
 * 동작:
 *   - 해당 이메일로 이미 관리자 계정이 있으면 비밀번호/이름/역할만 업데이트 (update)
 *   - 없으면 새로 생성 (create)
 *
 * seed.ts 와 달리 기존 DB 상태를 보존하면서 관리자만 보장하고 싶을 때 사용한다.
 * DB 가 리셋되거나 재배포 후 관리자 계정이 날아갔을 때 빠르게 복구하는 용도.
 */

import bcryptjs from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@parable-ent.com';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin1234!';
  const name = process.env.ADMIN_NAME ?? '관리자';
  const roleRaw = (process.env.ADMIN_ROLE ?? 'OWNER').toUpperCase();

  if (!['OWNER', 'MANAGER', 'CS'].includes(roleRaw)) {
    throw new Error(`유효하지 않은 ADMIN_ROLE: ${roleRaw} (OWNER | MANAGER | CS)`);
  }
  const role = roleRaw as 'OWNER' | 'MANAGER' | 'CS';

  const hashed = await bcryptjs.hash(password, 12);

  const existing = await prisma.adminUser.findUnique({ where: { email } });

  if (existing) {
    await prisma.adminUser.update({
      where: { email },
      data: {
        password: hashed,
        name,
        role,
        deletedAt: null,
      },
    });
    console.log(`✓ 관리자 계정 갱신 완료: ${email} (role=${role})`);
    console.log(`  → 비밀번호가 재설정되었습니다. 값: ${password}`);
  } else {
    await prisma.adminUser.create({
      data: { email, name, password: hashed, role },
    });
    console.log(`✓ 관리자 계정 신규 생성 완료: ${email} (role=${role})`);
    console.log(`  → 비밀번호: ${password}`);
  }

  console.log('\n로그인 URL: /admin/login');
}

main()
  .catch((e) => {
    console.error('관리자 계정 보장 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
