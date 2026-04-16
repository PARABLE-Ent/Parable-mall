import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. 카테고리
  const categories = await Promise.all([
    prisma.category.create({ data: { name: '의류', slug: 'clothing', sortOrder: 1 } }),
    prisma.category.create({ data: { name: '액세서리', slug: 'accessories', sortOrder: 2 } }),
    prisma.category.create({ data: { name: '앨범/음반', slug: 'albums', sortOrder: 3 } }),
    prisma.category.create({ data: { name: '포토카드', slug: 'photocards', sortOrder: 4 } }),
    prisma.category.create({ data: { name: '생활용품', slug: 'lifestyle', sortOrder: 5 } }),
  ]);

  console.log(`Created ${categories.length} categories`);

  // 2. 상품 20개
  const products = [];
  const productData = [
    { name: '로고 티셔츠 - 블랙', cat: 0, price: 35000, sale: 29000 },
    { name: '로고 티셔츠 - 화이트', cat: 0, price: 35000, sale: 29000 },
    { name: '오버핏 후디 - 그레이', cat: 0, price: 59000, sale: null },
    { name: '오버핏 후디 - 네이비', cat: 0, price: 59000, sale: null },
    { name: '크롭 맨투맨', cat: 0, price: 45000, sale: 39000 },
    { name: '볼캡 - 블랙', cat: 1, price: 25000, sale: null },
    { name: '볼캡 - 베이지', cat: 1, price: 25000, sale: null },
    { name: '키링 세트', cat: 1, price: 15000, sale: 12000 },
    { name: '실버 네크리스', cat: 1, price: 39000, sale: null },
    { name: '폰케이스', cat: 1, price: 18000, sale: 15000 },
    { name: '1st 미니앨범 [Parable]', cat: 2, price: 22000, sale: null },
    { name: '2nd 미니앨범 [Story]', cat: 2, price: 24000, sale: null },
    { name: '정규 1집 [Chapter One]', cat: 2, price: 28000, sale: 25000 },
    { name: 'DVD 콘서트 실황', cat: 2, price: 35000, sale: null },
    { name: '포토카드 세트 Vol.1', cat: 3, price: 8000, sale: null },
    { name: '포토카드 세트 Vol.2', cat: 3, price: 8000, sale: null },
    { name: '랜덤 포토카드 (5장)', cat: 3, price: 5000, sale: null },
    { name: '텀블러 500ml', cat: 4, price: 28000, sale: 24000 },
    { name: '에코백', cat: 4, price: 18000, sale: 15000 },
    { name: '스티커팩', cat: 4, price: 5000, sale: null },
  ];

  for (let i = 0; i < productData.length; i++) {
    const d = productData[i];
    const product = await prisma.product.create({
      data: {
        categoryId: categories[d.cat].id,
        name: d.name,
        slug: `product-${i + 1}`,
        description: `${d.name} - Parable-ENT 공식 굿즈`,
        basePrice: d.price,
        salePrice: d.sale,
        status: 'ACTIVE',
        tags: [categories[d.cat].name, 'Parable'],
      },
    });

    // SKU 생성 (옵션 없는 단일 SKU)
    await prisma.sku.create({
      data: {
        productId: product.id,
        skuCode: `SKU-${String(i + 1).padStart(3, '0')}`,
        price: d.sale ?? d.price,
        inventory: {
          create: { quantity: Math.floor(Math.random() * 100) + 10 },
        },
      },
    });

    products.push(product);
  }

  console.log(`Created ${products.length} products`);

  // 3. 테스트 유저
  const hashedPassword = await bcryptjs.hash('Test1234!', 12);
  const testUser = await prisma.user.create({
    data: {
      email: 'test@parable-ent.com',
      name: '테스트 사용자',
      password: hashedPassword,
      phone: '010-1234-5678',
      marketingConsent: {
        create: { emailConsent: true, smsConsent: false, pushConsent: false },
      },
    },
  });

  // 주소 추가
  const address = await prisma.address.create({
    data: {
      userId: testUser.id,
      label: '집',
      recipient: '테스트 사용자',
      phone: '010-1234-5678',
      zipCode: '06000',
      address1: '서울특별시 강남구 테헤란로 123',
      address2: '456호',
      isDefault: true,
    },
  });

  // 4. 더미 주문 10건
  const statuses = [
    'PAID',
    'PREPARING',
    'SHIPPING',
    'DELIVERED',
    'CONFIRMED',
    'PAID',
    'DELIVERED',
    'CONFIRMED',
    'CANCELLED',
    'PENDING_PAYMENT',
  ] as const;

  for (let i = 0; i < 10; i++) {
    const product = products[i % products.length];
    const sku = await prisma.sku.findFirst({ where: { productId: product.id } });
    if (!sku) continue;

    const quantity = Math.floor(Math.random() * 3) + 1;
    const subtotal = sku.price * quantity;
    const shippingFee = subtotal >= 50000 ? 0 : 3000;

    await prisma.order.create({
      data: {
        orderNumber: `ORD-20250415-${String(i + 1).padStart(4, '0')}`,
        userId: testUser.id,
        addressId: address.id,
        status: statuses[i],
        subtotal,
        shippingFee,
        discountTotal: 0,
        totalAmount: subtotal + shippingFee,
        recipientName: '테스트 사용자',
        recipientPhone: '010-1234-5678',
        zipCode: '06000',
        shippingAddress1: '서울특별시 강남구 테헤란로 123',
        shippingAddress2: '456호',
        items: {
          create: {
            skuId: sku.id,
            productName: product.name,
            quantity,
            unitPrice: sku.price,
            totalPrice: subtotal,
          },
        },
        payment: ['PAID', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CONFIRMED'].includes(statuses[i])
          ? {
              create: {
                method: 'CARD',
                status: 'COMPLETED',
                amount: subtotal + shippingFee,
                paidAt: new Date(),
              },
            }
          : undefined,
      },
    });
  }

  console.log('Created 10 dummy orders');

  // 5. 관리자 유저
  const adminPassword = await bcryptjs.hash('Admin1234!', 12);
  await prisma.adminUser.create({
    data: {
      email: 'admin@parable-ent.com',
      name: '관리자',
      password: adminPassword,
      role: 'OWNER',
    },
  });

  console.log('Created admin user: admin@parable-ent.com / Admin1234!');
  console.log('Created test user: test@parable-ent.com / Test1234!');
  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
