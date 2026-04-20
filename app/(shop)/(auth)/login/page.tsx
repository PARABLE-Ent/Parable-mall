'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const result = await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false,
    });

    if (result?.error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  }

  function handleSocialLogin(provider: string) {
    signIn(provider, { callbackUrl });
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>Parable Mall 계정으로 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
              회원가입
            </Link>
            <span className="text-muted-foreground mx-2">|</span>
            <Link
              href="/forgot-password"
              className="text-primary underline-offset-4 hover:underline"
            >
              비밀번호 찾기
            </Link>
          </div>

          <Separator className="my-6" />

          <div className="space-y-2">
            <Button
              type="button"
              className="w-full border border-transparent bg-[#FEE500] text-[#191919] hover:bg-[#FADA0A] dark:bg-[#FEE500] dark:text-[#191919]"
              onClick={() => handleSocialLogin('kakao')}
            >
              카카오로 로그인
            </Button>
            <Button
              type="button"
              className="w-full border border-transparent bg-[#03C75A] text-white hover:bg-[#02B351] dark:bg-[#03C75A] dark:text-white"
              onClick={() => handleSocialLogin('naver')}
            >
              네이버로 로그인
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin('google')}
            >
              Google로 로그인
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
