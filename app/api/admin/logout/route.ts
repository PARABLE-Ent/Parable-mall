import { NextResponse } from 'next/server';

import { adminLogout } from '@/lib/auth/admin';

export async function POST() {
  await adminLogout();
  return NextResponse.json({ success: true });
}
