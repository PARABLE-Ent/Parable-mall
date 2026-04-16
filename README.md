# Parable Mall

Parable-ENT 공식 D2C 웹 쇼핑몰

## 기술 스택

- **Frontend**: Next.js 16 (App Router) + TypeScript + TailwindCSS v4 + shadcn/ui
- **State**: Zustand (client) + TanStack Query (server)
- **Backend**: Next.js Route Handlers + Server Actions + Prisma ORM
- **Database**: PostgreSQL 16 + Redis 7
- **Storage**: Cloudflare R2
- **Testing**: Vitest + Playwright

## 로컬 개발 환경 설정

### 사전 요구사항

- Node.js >= 20.0.0
- pnpm >= 10.x
- Docker & Docker Compose

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열어 필요한 값을 입력합니다.

### 3. 로컬 DB/Redis 실행

```bash
docker compose up -d
```

### 4. DB 마이그레이션

```bash
pnpm prisma migrate dev
```

### 5. 개발 서버 실행

```bash
pnpm dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## 주요 명령어

| 명령어           | 설명                 |
| ---------------- | -------------------- |
| `pnpm dev`       | 개발 서버 실행       |
| `pnpm build`     | 프로덕션 빌드        |
| `pnpm start`     | 프로덕션 서버 실행   |
| `pnpm lint`      | ESLint 검사          |
| `pnpm typecheck` | TypeScript 타입 검사 |
| `pnpm test`      | 단위 테스트 실행     |
| `pnpm test:e2e`  | E2E 테스트 실행      |
| `pnpm format`    | 코드 포맷팅          |

## 디렉토리 구조

```
/app
  /(shop)/          - 고객 페이지
  /(admin)/admin/   - 운영자 관리 페이지
  /api/             - API Route Handlers
/components
  /ui/              - shadcn/ui 기반 공용 컴포넌트
  /shop/            - 쇼핑몰 도메인 컴포넌트
  /admin/           - 관리자 도메인 컴포넌트
/lib                - 인프라 어댑터 (DB, Redis, 결제 등)
/server             - 도메인 로직 (use-case 함수)
/prisma             - Prisma 스키마 & 마이그레이션
/tests              - 테스트 (unit, e2e)
/docs               - 문서 (ERD, ADR, Runbook)
/messages           - i18n 번역 파일
```
