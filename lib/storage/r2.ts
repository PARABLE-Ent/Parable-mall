import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

import { logger } from '@/lib/logger';

let cachedClient: S3Client | null = null;

function getStorageClient(): S3Client {
  if (cachedClient) return cachedClient;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing required R2 environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)',
    );
  }

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

const BUCKET = process.env.R2_BUCKET_NAME ?? 'parable-mall';

// 업로드 제약
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

export function validateImageUpload(contentType: string, size: number): void {
  if (!ALLOWED_MIME.has(contentType)) {
    throw new Error(`지원하지 않는 이미지 형식입니다 (${contentType}).`);
  }
  if (size > MAX_IMAGE_BYTES) {
    throw new Error(`파일 크기가 허용된 최대값(10MB)을 초과했습니다.`);
  }
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const client = getStorageClient();
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  const publicUrl = process.env.R2_PUBLIC_URL;
  return publicUrl ? `${publicUrl}/${key}` : key;
}

export async function deleteFile(key: string): Promise<void> {
  const client = getStorageClient();
  try {
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    logger.warn('r2.delete_failed', {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function fileExists(key: string): Promise<boolean> {
  const client = getStorageClient();
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * URL 안전한 파일 키를 생성한다. 파일명은 확장자만 추출하고,
 * 나머지 이름은 랜덤 토큰으로 교체한다 (사용자 입력 경로 전파 방지).
 */
export function generateImageKey(folder: string, filename: string): string {
  const timestamp = Date.now();
  const extRaw = filename.split('.').pop() ?? 'bin';
  const ext =
    extRaw
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 6) || 'bin';
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '');
  return `${safeFolder}/${timestamp}-${rand}.${ext}`;
}

/**
 * 공개 URL 에서 R2 오브젝트 키를 추출한다 (삭제 API 용).
 */
export function extractKeyFromUrl(url: string): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl && url.startsWith(publicUrl)) {
    return url.slice(publicUrl.length).replace(/^\/+/, '');
  }
  return null;
}
