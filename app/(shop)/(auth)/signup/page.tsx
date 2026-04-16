'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signup } from '@/server/auth/signup';
import type { SignupInput } from '@/server/auth/signup';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignupInput, string>>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);

    const input: SignupInput = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      name: formData.get('name') as string,
      phone: (formData.get('phone') as string) || undefined,
      agreeTerms: (formData.get('agreeTerms') === 'on') as true,
      agreePrivacy: (formData.get('agreePrivacy') === 'on') as true,
      agreeMarketing: formData.get('agreeMarketing') === 'on',
    };

    const result = await signup(input);

    if (!result.success) {
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      if (result.error) setError(result.error);
      setLoading(false);
      return;
    }

    router.push('/login?registered=true');
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>Parable Mall 계정을 만드세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input id="name" name="name" placeholder="홍길동" required />
              {fieldErrors.name && <p className="text-destructive text-sm">{fieldErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                required
              />
              {fieldErrors.email && <p className="text-destructive text-sm">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input id="password" name="password" type="password" required />
              <p className="text-muted-foreground text-xs">8자 이상, 영문/숫자/특수문자 포함</p>
              {fieldErrors.password && (
                <p className="text-destructive text-sm">{fieldErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">휴대폰 번호 (선택)</Label>
              <Input id="phone" name="phone" placeholder="010-1234-5678" />
              {fieldErrors.phone && <p className="text-destructive text-sm">{fieldErrors.phone}</p>}
            </div>

            <div className="space-y-3 rounded-md border p-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="agreeTerms" name="agreeTerms" required />
                <Label htmlFor="agreeTerms" className="text-sm">
                  [필수] 이용약관 동의
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="agreePrivacy" name="agreePrivacy" required />
                <Label htmlFor="agreePrivacy" className="text-sm">
                  [필수] 개인정보 처리방침 동의
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="agreeMarketing" name="agreeMarketing" />
                <Label htmlFor="agreeMarketing" className="text-sm">
                  [선택] 마케팅 수신 동의
                </Label>
              </div>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '가입 중...' : '가입하기'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              로그인
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
