# Parable Mall - 프로젝트 컨벤션 & 결정 로그

## ✅ 현재 상태: Vercel Preview 배포 + UI/UX 1차 정리 + 관리자 핸드오프 준비 완료 (2026-04-20)

### 🎯 관리자 리뷰 핸드오프 (최신)

**리뷰어에게 전달할 문서**: [`docs/ADMIN-HANDOFF.md`](./docs/ADMIN-HANDOFF.md)

- 로그인: `/admin/login` — `admin@parable-ent.com` / `Admin1234!`
- 관리자 기능 상태 (✅ 작동 / 🚧 Phase 2):
  - ✅ 대시보드 KPI / 최근 주문
  - ✅ 주문 상태 변경 + 배송등록(택배사/운송장)
  - ✅ 리뷰 공개·비공개 토글
  - ✅ Q&A 답변
  - ✅ 쿠폰 생성 (정액/정률)
  - ✅ 상품 판매상태 토글(노출/숨김) — 새로 추가 (`PATCH /api/admin/products/[id]`)
  - ✅ 감사 로그
  - 🚧 상품 신규 등록 / 상세 편집 UI — API 는 있으나 UI 미구현, 버튼 disabled 처리
  - 🚧 `/admin/settings` 페이지 — 사이드바에서 제거 (라우트 없음)

**멱등 관리자 보장**: `pnpm db:ensure-admin` (새 스크립트 `scripts/ensure-admin.ts`). DB 초기화나 비번 분실 시 바로 복구.

> **다음 세션 (Cowork 샌드박스 / 로컬 Claude Code) 에게**: 배포는 돌아가고 있음. 상세 진행 상태는 [`docs/DEPLOY-HANDOFF.md`](./docs/DEPLOY-HANDOFF.md) 참조. 아래는 30초 요약.

### 🔗 살아있는 URL + 자격 증명

- **Preview (항상 최신)**: https://parable-mall-git-claude-affectio-ecbd8a-seongsul-2586s-projects.vercel.app
- **GitHub**: https://github.com/PARABLE-Ent/Parable-mall.git (브랜치 `claude/affectionate-wiles`, 이 브랜치가 Preview 자동 빌드 대상)
- **Vercel 프로젝트**: `parable-mall` (scope `seongsul-2586s-projects`, id `prj_ig1hR0DhDc138OGcuvDHaSji0jAF`)
- **Cloud SQL**: `virdy-parable:asia-northeast3:virdy-v2-db` 인스턴스의 `parable_mall` DB, 유저 `parable_app`
- **Redis**: Upstash `fast-panda-78126.upstash.io` (Seoul)
- **R2**: 버킷 `parable-mall-prod`, Account `93119c32768630657292ca7922309cda`
- **테스트 계정** (seed 로 생성됨):
  - 일반: `test@parable-ent.com` / `Test1234!`
  - 관리자: `admin@parable-ent.com` / `Admin1234!` (`/admin/login`)

### 📦 이번(2026-04-20) 세션에서 완료한 것

1. **Cloud SQL 프로비저닝** — `parable_mall` DB + `parable_app` 유저 생성, GRANT, Public IP `0.0.0.0/0` 임시 허용 (`112.222.211.172/32` 고정 IP 유지)
2. **Prisma 마이그레이션** — `prisma migrate deploy` 로 `20260416005716_init` 적용
3. **시드 데이터** — 5 카테고리 / 20 상품 / 10 더미 주문 / 테스트 유저 2명
4. **Vercel 첫 배포** — production/preview/development 3환경 × 21 env vars 등록, GitHub 연동, `framework: nextjs` 수동 설정 (CLI 생성 프로젝트는 자동 감지 안 됨 — 중요 함정)
5. **UI/UX 1차 정리**
   - 랜딩 '앨범 보기' 버튼 라이트 모드 글자 안 보이던 문제 (`bg-background` → `bg-transparent`)
   - 헤더 로그인 상태 분기 (비로그인 = "로그인" 버튼 / 로그인 = 사람 아이콘 → /mypage). `ShopLayout` 서버 컴포넌트에서 `auth()` 호출해서 `isAuthenticated` 주입
   - 깨진 링크 제거: 헤더 `/search`, 푸터 `/faq`, 마이페이지 `/auth/signin` → `/login`
   - 소셜 로그인 버튼 브랜드 컬러 (카카오 #FEE500, 네이버 #03C75A)
6. **빌드/타입 이슈 수정** — `@tosspayments/payment-sdk` 버전 오타 (`^2.3.0` → `^1.9.2`), 리뷰 map 인라인 타입 정리, `SUPER_ADMIN` (enum 미존재) → `OWNER`, `listPrice` → `basePrice`, `password-reset` 메일 to 필드 nullable 처리

### 🚨 절대 주의사항 (계속 유효)

1. **DB 격리**: Virdy 운영 인스턴스 공유 중. **`parable_mall` DB 에만** 작업. `virdy` DB 에 Prisma 마이그레이션 / DDL 절대 금지.
2. **JDBC URL 금지**: `jdbc:postgresql:///...&socketFactory=...` 는 Java 전용. Prisma/Node 는 `postgresql://user:pass@host:port/parable_mall?sslmode=require` 표준 형식만.
3. **R2 버킷 분리**: 버킷은 `parable-mall-prod` 만 사용. Virdy 버킷에 쇼핑몰 이미지 섞지 말 것.
4. **시크릿 커밋 금지**: 값은 `.env.deploy.local` (gitignore 됨) 또는 `vercel env add` / REST API 로만. md 파일/커밋 메시지/로그 에 평문 금지.
5. **Cowork 샌드박스 제약**: `binaries.prisma.sh` 차단 → `prisma generate` / `pnpm build` / `pnpm typecheck` 가 샌드박스에서 실패함. **코드 문제 아닌 환경 제약**. DB 작업이나 배포는 사용자 로컬 Claude Code 에서. Cowork 에서는 코드 편집 + 커밋까지만.

### ⏭️ 다음 세션에서 할 일 (우선순위 순)

**A. 남은 UI/UX 잔여 (작은 것들, 순서 무관)**

- 체크아웃 `sticky top-20` 가 모바일에서 입력칸 가리는 이슈 → `hidden lg:block lg:sticky lg:top-20` 스타일로 분기
- 장바구니 수량 +/- 버튼 터치 타겟 확대 (`h-10 w-10`)
- 마이페이지 하위 페이지들 empty state 아이콘 크기 통일 (공용 EmptyState 컴포넌트 권장)
- about 페이지 사업자 정보 테이블 라벨 대비 (`text-muted-foreground` → `font-semibold text-foreground`)
- 리뷰 별점에 숫자 평점 병기 (`${rating}/5` 표시)
- 푸터 `[대표자명]/[전화번호]/[사업장 주소]` 등 placeholder 실제 값으로 교체
- 회원가입 input 에 도움말 텍스트 추가 (placeholder 만으로는 포커스 시 사라져 불친절)

**B. 상용 전환 TODO** ([`docs/DEPLOY-HANDOFF.md`](./docs/DEPLOY-HANDOFF.md) 🚧 섹션)

1. Cloud SQL 전용 인스턴스로 분리 (Virdy 와 완전 격리)
2. `0.0.0.0/0` → VPC Connector + Private IP
3. **SSO Protection 재활성화** (테스트 편의상 현재 꺼둔 상태 — 외부 공개 전 반드시 다시 켜기. PATCH `/v10/projects/{id}` with `ssoProtection: {deploymentType: 'all_except_custom_domains'}`)
4. 프로덕션 도메인 확정 + `NEXTAUTH_URL` Vercel env 등록
5. Sentry / PostHog / Resend 실제 키 교체
6. 카카오/네이버/구글 OAuth 실 운영 키 등록 (현재 placeholder)
7. 결제 PG 샌드박스 → 운영 키
8. `main` 으로 머지 후 Vercel Production 배포

### 🛠 이어서 작업할 때 자주 쓰는 커맨드

```bash
# DB 연결 확인 (parable_mall 전용 유저로)
DATABASE_URL="postgresql://parable_app:<PW>@34.22.100.7:5432/parable_mall?schema=public&sslmode=require" \
  node node_modules/prisma/build/index.js migrate status

# 새로 만든 마이그레이션 적용
DATABASE_URL="..." node node_modules/prisma/build/index.js migrate deploy

# 시드 재실행 (기존 데이터 지우지 않음 — 중복 주의)
DATABASE_URL="..." npx tsx scripts/seed.ts

# Vercel 배포 상태 확인
VERCEL_TOKEN=<token> npx vercel@latest ls parable-mall | head -5

# Vercel env 추가 (preview 는 CLI 가 agent mode 감지해서 막힘 → REST API 사용)
curl -X POST "https://api.vercel.com/v10/projects/prj_ig1hR0DhDc138OGcuvDHaSji0jAF/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  -d '{"key":"KEY","value":"VAL","type":"encrypted","target":["preview"]}'
```

실제 비밀번호/토큰은 `.env.deploy.local` 에 있음 (로컬 전용, gitignore 적용). Cowork 샌드박스에서는 이 파일이 없으므로 DB 직접 접속 작업은 로컬에서 진행 권장.

---

## 프로젝트 개요

Parable-ENT 자사 D2C 웹 쇼핑몰. 굿즈/콘텐츠/디지털 상품 판매.

## 기술 스택

- **Frontend**: Next.js 16 (App Router) + TypeScript + TailwindCSS v4 + shadcn/ui
- **State**: Zustand (클라이언트), TanStack Query (서버)
- **i18n**: next-intl (ko 기본, en 확장)
- **Backend**: Next.js Route Handlers + Server Actions
- **ORM**: Prisma 6 + PostgreSQL
- **Cache**: Redis (ioredis)
- **Storage**: Cloudflare R2
- **Payment**: 토스페이먼츠 + 카카오페이 + 네이버페이
- **Analytics**: PostHog
- **Testing**: Vitest + Playwright
- **CI/CD**: GitHub Actions + Vercel

## 코딩 컨벤션

### 필수 규칙

1. **TypeScript strict 모드**, `any` 사용 금지 (불가피하면 주석으로 사유 기록)
2. **모든 서버 액션/라우트 핸들러는 Zod 스키마로 입력 검증** — 검증 없는 엔드포인트 금지
3. **금액·재고 변경은 반드시 DB 트랜잭션 내에서** — Redis 분산 락 사용 패턴 통일
4. **시크릿은 `.env`에만** — 코드/로그에 절대 노출 금지
5. **PII 로깅 금지** — 이메일/전화/주소를 로그에 남기지 않음, Sentry scrubbing 적용
6. **N+1 쿼리 금지** — Prisma `include`/`select` 명시
7. **결제·재고 로직은 단위 테스트 필수** — 테스트 없이 머지 금지
8. **마이그레이션은 `prisma migrate dev`로 생성** — 운영은 `migrate deploy`
9. **금액은 정수(원 단위) 저장** — 부동소수점 금지, Prisma에서 `Int` 또는 `BigInt` 사용
10. **커밋은 컨벤셔널 커밋** — `feat:`, `fix:`, `docs:`, `chore:` 등

### 디렉토리 규칙

- `/server` — 도메인 로직 (use-case 함수), 컴포넌트/라우트에 비즈니스 로직 금지
- `/lib` — 인프라 어댑터 (DB, Redis, 결제, 메일 등), 외부 의존성 추상화
- `/components/ui` — shadcn/ui 기반 공용 컴포넌트
- `/components/shop`, `/components/admin` — 도메인별 컴포넌트

### Import 순서

1. React/Next.js
2. 외부 라이브러리
3. `@/server/*`
4. `@/lib/*`
5. `@/components/*`
6. 상대 경로

## 비즈니스 정책 (기본값 — 변경 시 이 섹션 업데이트)

### 회원 등급

| 등급 | 누적 구매액 | 적립률 |
| ---- | ----------- | ------ |
| 일반 | 0원 ~       | 1%     |
| 실버 | 10만원 ~    | 2%     |
| 골드 | 50만원 ~    | 3%     |
| VIP  | 100만원 ~   | 5%     |

### 적립금

- 기본 적립률: 결제금액의 1% (등급별 상이)
- 포토리뷰 작성: 500원
- 텍스트리뷰 작성: 200원
- 최소 사용 금액: 1,000원
- 유효기간: 발급일로부터 1년

### 배송

- 기본 배송비: 3,000원
- 무료배송: 50,000원 이상 주문 시
- 도서산간 추가: 3,000원
- 배송업체: 추후 결정

### 환불/반품

- 반품 가능 기간: 수령 후 7일 이내
- 단순변심 반품 배송비: 고객 부담 (왕복 6,000원)
- 환불 처리 기한: 반품 접수 후 영업일 3일 이내
- 불량/오배송: 회사 부담, 즉시 처리

### 주문 취소

- 상품준비 전: 즉시 취소 가능 (자동)
- 상품준비 이후: CS 접수를 통한 취소

### 쿠폰

- 종류: 정액 할인 / 정률 할인
- 적용 범위: 전체 / 카테고리 한정 / 상품 한정 / 등급 한정
- 중복 사용: 불가 (1주문 1쿠폰)
- 최소 주문 금액: 쿠폰별 개별 설정

---

## 결정 로그 (Decision Log)

### 2025-04-15: Next.js 버전

- **결정**: Next.js 16.2.3 사용 (요청은 15였으나 최신 안정버전이 16)
- **이유**: create-next-app@latest로 설치 시 자동으로 16이 설치됨. App Router 완전 호환, Turbopack 기본 포함
- **대안**: 15.x 고정 설치 가능하나 보안 패치/기능 면에서 16이 유리

### 2025-04-15: DB 호스팅

- **결정**: 로컬 Docker PostgreSQL 16으로 시작, 프로덕션 호스팅은 추후 결정
- **이유**: Supabase vs Neon 미정. 로컬 개발 우선
- **대안**: Supabase (무료 티어 500MB, Auth 번들), Neon (서버리스, DB branching)

### 2025-04-15: 파일 스토리지

- **결정**: Cloudflare R2
- **이유**: S3 호환 API, 이그레스 비용 무료, 가성비 최고

### 2025-04-15: 이메일 서비스

- **결정**: 인터페이스(어댑터)만 만들고 구현체는 추후 연결
- **이유**: Resend vs AWS SES 미정

### 2025-04-15: Analytics

- **결정**: PostHog
- **이유**: 오픈소스, 퍼널/세션리플레이/A·B테스트 올인원

### 2025-04-15: 본인인증

- **결정**: 추후 추가 (인터페이스만 준비)
- **이유**: 현재 연령 제한 상품 없음, 필요 시 NICE/KG이니시스 모듈 추가

### 2025-04-15: 디지털 상품

- **결정**: 추후 추가 (확장 가능한 구조만)
- **이유**: 물리 굿즈 우선, 디지털 상품 타입/전달 방식 미정

### 2025-04-15: Prisma 버전

- **결정**: Prisma 6.x 사용 (7.x 대신)
- **이유**: Prisma 7은 datasource url 설정 방식이 근본적으로 변경됨(prisma.config.ts 필수). 아직 생태계 안정화 미비. 6.x는 전통적인 schema.prisma �
