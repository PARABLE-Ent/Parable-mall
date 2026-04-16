import { redirect } from 'next/navigation';

import { auth } from './index';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return session;
}

export async function requireUser() {
  const session = await requireAuth();
  return session.user;
}
