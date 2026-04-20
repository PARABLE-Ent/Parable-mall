'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminFetch } from '@/lib/auth/admin-fetch';

interface QnAItem {
  id: string;
  title: string;
  question: string;
  answer: string | null;
  isAnswered: boolean;
  createdAt: string;
  user?: { name?: string | null; email?: string | null } | null;
  product?: { id: string; name: string } | null;
}

// QnA 목록은 공용 GET 엔드포인트가 없으므로 이 페이지는 간단한 샘플 UI 로 동작.
// 답변 API는 /api/admin/qna/[id]/answer 를 사용한다.
export default function AdminQnaPage() {
  const [items, setItems] = useState<QnAItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 고객용 Q&A 리스트 엔드포인트를 활용 (관리자 전용 목록 엔드포인트 대신)
      const res = await adminFetch('/api/qna?limit=50');
      if (!res.ok) throw new Error('Q&A 목록을 불러올 수 없습니다.');
      const json = (await res.json()) as { data?: QnAItem[] } | QnAItem[];
      const rows = Array.isArray(json) ? json : (json.data ?? []);
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const submitAnswer = async (id: string) => {
    if (!answerText.trim()) {
      alert('답변 내용을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminFetch(`/api/admin/qna/${id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: answerText }),
      });
      if (!res.ok) throw new Error('답변 등록에 실패했습니다.');
      setSelectedId(null);
      setAnswerText('');
      void fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Q&amp;A 관리</h1>
        <Button variant="outline" onClick={() => void fetchItems()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <AlertTriangle className="text-destructive h-10 w-10" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>문의 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-muted h-12 w-full animate-pulse rounded" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">문의가 없습니다.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((q) => (
                <li key={q.id} className="rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{q.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {q.product?.name ?? '일반'} · {q.user?.name ?? '익명'} ·{' '}
                        {new Date(q.createdAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        q.isAnswered
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}
                    >
                      {q.isAnswered ? '답변 완료' : '답변 대기'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm whitespace-pre-line">{q.question}</p>
                  {q.answer && (
                    <div className="bg-muted mt-3 rounded p-3 text-sm">
                      <p className="text-muted-foreground mb-1 text-xs font-semibold">
                        관리자 답변
                      </p>
                      <p className="whitespace-pre-line">{q.answer}</p>
                    </div>
                  )}
                  {!q.isAnswered && (
                    <div className="mt-3">
                      {selectedId === q.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                            placeholder="답변 내용을 입력하세요 (최대 2000자)"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => void submitAnswer(q.id)}
                              disabled={submitting}
                            >
                              {submitting ? '등록 중...' : '답변 등록'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedId(null);
                                setAnswerText('');
                              }}
                            >
                              취소
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedId(q.id);
                            setAnswerText('');
                          }}
                        >
                          <MessageSquare className="mr-1 h-3 w-3" />
                          답변 작성
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
