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

            {error && (
              <div
                role="alert"
                className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
              >
                {error}
              </div>
            )}

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
              aria-label="카카오 계정으로 로그인"
            >
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.73 1.77 5.13 4.44 6.53l-.93 3.4c-.08.3.24.55.51.39l4.05-2.68c.64.09 1.28.14 1.93.14 5.52 0 10-3.48 10-7.78S17.52 3 12 3z" />
              </svg>
              카카오로 로그인
            </Button>
            <Button
              type="button"
              className="w-full border border-transparent bg-[#03C75A] text-white hover:bg-[#02B351] dark:bg-[#03C75A] dark:text-white"
              onClick={() => handleSocialLogin('naver')}
              aria-label="네이버 계정으로 로그인"
            >
              <span
                className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-sm bg-white text-[10px] font-black text-[#03C75A]"
                aria-hidden="true"
              >
                N
              </span>
              네이버로 로그인
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin('google')}
              aria-label="Google 계정으로 로그인"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              Google로 로그인
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
