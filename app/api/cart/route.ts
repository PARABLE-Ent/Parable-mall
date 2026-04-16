import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import {
  addToCart,
  addToCartSchema,
  getCart,
  removeCartItem,
  updateCartItem,
  updateCartItemSchema,
} from '@/server/cart';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const cart = await getCart(session.user.id);
  return NextResponse.json(cart);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = addToCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await addToCart(session.user.id, parsed.data);
  const cart = await getCart(session.user.id);
  return NextResponse.json(cart);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const body = await request.json();
  const { itemId, ...rest } = body;
  const parsed = updateCartItemSchema.safeParse(rest);
  if (!parsed.success || !itemId) {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  await updateCartItem(session.user.id, itemId, parsed.data);
  const cart = await getCart(session.user.id);
  return NextResponse.json(cart);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');
  if (!itemId) {
    return NextResponse.json({ error: 'itemId가 필요합니다.' }, { status: 400 });
  }

  await removeCartItem(session.user.id, itemId);
  const cart = await getCart(session.user.id);
  return NextResponse.json(cart);
}
