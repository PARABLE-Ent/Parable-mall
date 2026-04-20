'use client';

import { ClipboardList, Heart, Loader2, MapPin, MessageSquare, Ticket, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Profile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  gradeLevel: string;
  totalSpent: number;
  createdAt: string;
  pointsBalance: number;
}

const GRADE_LABELS: Record<string, string> = {
  NORMAL: '일반',
  SILVER: '실버',
  GOLD: '골드',
  VIP: 'VIP',
};

const quickLinks = [
  { href: '/mypage/orders', label: '주문내역', icon: ClipboardList },
  { href: '/mypage/reviews', label: '리뷰', icon: MessageSquare },
  { href: '/mypage/coupons', label: '쿠폰', icon: Ticket },
  { href: '/mypage/wishlist', label: '위시리스트', icon: Heart },
  { href: '/mypage/addresses', label: '배송지관리', icon: MapPin },
];

export default function MyPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((res: { data: Profile | null; error?: string }) => {
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          setProfile(res.data);
        }
      })
      .catch(() => setError('프로필을 불러오는데 실패했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-16">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-destructive">{error ?? '프로필을 불러올 수 없습니다.'}</p>
        <Link href="/auth/signin" className="text-primary mt-2 inline-block underline">
          로그인하기
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">마이페이지</h1>

      {/* Profile Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            회원 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-muted-foreground text-sm">이름</p>
              <p className="font-medium">{profile.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">이메일</p>
              <p className="font-medium">{profile.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">회원 등급</p>
              <p className="font-medium">
                <span className="bg-primary/10 text-primary rounded px-2 py-0.5 text-sm">
                  {GRADE_LABELS[profile.gradeLevel] ?? profile.gradeLevel}
                </span>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">총 구매 금액</p>
              <p className="font-medium">{profile.totalSpent.toLocaleString('ko-KR')}원</p>
            </div>
          </div>
          <div className="bg-muted mt-4 rounded-lg p-4">
            <p className="text-muted-foreground text-sm">적립금</p>
            <p className="text-xl font-bold">{profile.pointsBalance.toLocaleString('ko-KR')}P</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {quickLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="flex flex-col items-center gap-2 p-6">
                <Icon className="h-6 w-6" />
                <span className="text-sm font-medium">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
