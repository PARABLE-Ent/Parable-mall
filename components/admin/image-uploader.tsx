'use client';

import { Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/auth/admin-fetch';

interface Props {
  folder?: 'products' | 'categories' | 'banners' | 'reviews';
  onUploaded?: (payload: { key: string; url: string }) => void;
  disabled?: boolean;
}

const MAX_SIZE_MB = 10;

export function AdminImageUploader({ folder = 'products', onUploaded, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', folder);
      const res = await adminFetch('/api/admin/upload', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? '업로드에 실패했습니다.');
      }
      const json = (await res.json()) as { key: string; url: string };
      onUploaded?.(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? '업로드 중...' : '이미지 선택'}
        </Button>
        {preview && !uploading && (
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            <X className="mr-1 h-3 w-3" />
            지우기
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={(e) => void handleFileChange(e)}
      />
      {preview && (
        <div className="mt-2 overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="업로드 미리보기" className="h-40 w-40 object-cover" />
        </div>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
