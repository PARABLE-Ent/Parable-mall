'use server';

import bcryptjs from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '@/lib/db';

const signupSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요.'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.',
    ),
  name: z.string().min(2, '이름은 2자 이상이어야 합니다.').max(20),
  phone: z
    .string()
    .regex(/^01[0-9]-?\d{3,4}-?\d{4}$/, '올바른 휴대폰 번호를 입력해주세요.')
    .optional(),
  agreeTerms: z.literal(true, { message: '이용약관에 동의해주세요.' }),
  agreePrivacy: z.literal(true, { message: '개인정보 처리방침에 동의해주세요.' }),
  agreeMarketing: z.boolean().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

export type SignupResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof SignupInput, string>>;
};

export async function signup(input: SignupInput): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof SignupInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof SignupInput;
      fieldErrors[field] = issue.message;
    }
    return { success: false, fieldErrors };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return { success: false, error: '이미 가입된 이메일입니다.' };
  }

  const hashedPassword = await bcryptjs.hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      phone: parsed.data.phone,
      password: hashedPassword,
      marketingConsent: parsed.data.agreeMarketing
        ? {
            create: {
              emailConsent: true,
              smsConsent: true,
              pushConsent: false,
            },
          }
        : {
            create: {
              emailConsent: false,
              smsConsent: false,
              pushConsent: false,
            },
          },
    },
  });

  // 가입 축하 적립금 지급 (향후 설정값으로 분리)
  await prisma.pointHistory.create({
    data: {
      userId: user.id,
      type: 'EARN',
      amount: 1000,
      balance: 1000,
      reason: '회원가입 축하 적립금',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1년
    },
  });

  return { success: true };
}
