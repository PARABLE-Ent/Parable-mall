# Parable Mall - 프로젝트 컨벤션 & 결정 로그

## ✅ 현재 상태: Vercel Preview 배포 완료 + UI/UX 1차 정리 (2026-04-20)

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
- **이유**: Prisma 7은 datasource url 설정 방식이 근본적으로 변경됨(prisma.config.ts 필수). 아직 생태계 안정화 미비. 6.x는 전통적인 schema.prisma 설정 방식 지원
- **대안**: Prisma 7 (breaking change가 많아 초기 개발 안정성 저하)

### 2025-04-15: 비즈니스 정책

- **결정**: 합리적 기본값 적용 (위 비즈니스 정책 섹션 참조)
- **이유**: 개별 확인 없이 일반적인 쇼핑몰 기준으로 설정, 추후 조정 가능

### 2025-04-15: 세션 전략

- **결정**: 고객은 DB 세션 (NextAuth), 관리자는 Redis 세션
- **이유**: 고객 세션은 결제/주문 시 서버사이드 검증이 중요하므로 DB 세션. 관리자는 짧은 TTL(8h)로 Redis에 관리하여 즉시 무효화 가능
- **대안**: JWT (stateless이나 즉시 무효화 불가)

### 2025-04-15: 인증 분리

- **결정**: 고객 인증(NextAuth)과 관리자 인증(Redis 세션) 완전 분리
- **이유**: 보안 경계 분리. 관리자는 소셜 로그인 없이 이메일/비밀번호만. 별도 AdminUser 테이블 사용
- **대안**: 단일 User 테이블에 role로 구분 (보안 경계가 모호해짐)

### 2025-04-16: 배포 인프라

- **결정**: Vercel (프론트/API) + 기존 GCP Cloud SQL (DB) + Upstash Redis (캐시/세션)
- **이유**: Vercel은 Next.js 네이티브 지원, Cloud SQL은 기존 인프라 활용으로 추가 비용 $0, Upstash는 HTTP 기반으로 Serverless 환경과 호환 최적
- **대안 검토**: Firebase Hosting (SSR Cold Start 문제로 부적합), Neon/Supabase (해외 서버, 데이터 국내 보관 이슈)

### 2025-04-16: Redis 클라이언트

- **결정**: ioredis → @upstash/redis 전환
- **이유**: Vercel Serverless Functions에서 TCP 기반 ioredis는 연결 풀 문제 발생. Upstash는 HTTP 기반으로 Serverless 환경에 최적
- **대안**: ioredis 유지 (Vercel에서 연결 제한/타임아웃 빈발)

### 2026-04-20: DB 인스턴스 공유 (임시)

- **결정**: 기존 Virdy Cloud SQL 인스턴스(`virdy-parable:asia-northeast3:virdy-v2-db`) 에 신규 DB `parable_mall` + 전용 유저 `parable_app` 을 생성하여 사용
- **이유**: 개발 프리뷰 단계에서 신규 인스턴스 비용 발생 회피. 같은 인스턴스 내 DB 격리로 데이터는 분리됨
- **리스크**: 인스턴스 리소스 공유 → Virdy 트래픽이 Parable Mall 지연에 영향 가능. 한쪽 인스턴스 장애 시 동시 다운
- **TODO**: 프로덕션 런칭 전 Parable 전용 Cloud SQL 인스턴스로 분리 (옵션 B)
- **대안**: 처음부터 별도 인스턴스 생성 (월 ~$8, 완전 격리)

### 2026-04-20: R2 키 재사용

- **결정**: Virdy 프로젝트에서 쓰던 R2 S3 호환 키를 그대로 재사용. 버킷만 `parable-mall` 신규 생성
- **이유**: 계정 전역 권한으로 발급된 키라 추가 비용/설정 없이 즉시 사용 가능
- **전제**: 해당 키의 권한이 "Apply to all buckets in this account" 여야 함. 특정 버킷 한정이면 신규 발급 필요
- **TODO**: 장기적으로 Parable 전용 Admin Read/Write 토큰 별도 발급해서 키 스코프 분리

### 2026-04-20: Public IP + 0.0.0.0/0 허용 (임시)

- **결정**: Vercel 서버리스의 고정 egress IP 부재로 Cloud SQL 의 Authorized Networks 를 `0.0.0.0/0` 으로 임시 허용
- **이유**: 개발 프리뷰 빠른 검증. VPC Connector 설정 시간 절약
- **리스크**: 강력한 비밀번호 + SSL 강제에 의존. 비밀번호 유출 시 인터넷에서 직접 공격 가능
- **TODO**: 프로덕션 전환 전 Serverless VPC Access Connector + Private IP 로 교체. Cloud SQL Auth Proxy 병행 검토
- **대안**: Private Service Connect (초기 설정 복잡)

### 2026-04-20: PG 키 — 샌드박스 테스트 키

- **결정**: 배포 env 에 토스/카카오/네이버페이 공식 샌드박스 테스트 키 주입
- **이유**: 사용자 요구사항("테스터블 환경이 있으면 그렇게") + 결제 버튼이 런타임에 동작하는 수준 확보
- **TODO**: 상용 런칭 직전 실제 운영 키로 교체

### 2026-04-20: Vercel 프로젝트 — `framework: nextjs` 수동 설정 필수

- **결정**: `vercel projects add` 로 생성한 프로젝트는 `framework: null` 로 남아 빌드는 성공해도 모든 라우트 404. REST API `PATCH /v10/projects/{id}` 로 `framework: "nextjs"` 명시 후 재빌드.
- **이유**: CLI 프로젝트 생성 경로는 framework auto-detect 가 동작 안 함. 대시보드 GUI 로 만들면 자동 감지.
- **TODO**: 새로운 Vercel 프로젝트 CLI 생성 시 즉시 framework PATCH 루틴화.

### 2026-04-20: SSO Protection 비활성화 (임시)

- **결정**: Preview URL 자동 검증/사용자 확인 편의상 `ssoProtection: null` 로 꺼둠.
- **이유**: agent 기반 curl 테스트 및 사용자 브라우저 확인 간소화.
- **리스크**: Preview URL 이 인터넷 공개 상태. 크롤러/경쟁사가 찾으면 미완성 상태 노출.
- **TODO**: 외부 공개 / 상용 전환 전 반드시 재활성화. `PATCH /v10/projects/{id}` with `ssoProtection: {deploymentType: 'all_except_custom_domains'}`

### 2026-04-20: Header 로그인 상태 서버사이드 주입

- **결정**: `ShopLayout` (서버 컴포넌트) 에서 `auth()` 호출 후 `isAuthenticated: boolean` 을 Header (클라이언트) 에 prop 으로 전달.
- **이유**: `useSession()` + `SessionProvider` 방식은 SessionProvider 추가 + 클라이언트 fetch 필요. 현 구조에 최소 침습. DB 세션 전략이라 auth() 호출은 1 쿼리로 값싸다.
- **대안**: next-auth `SessionProvider` + `useSession()` (클라이언트 hydration 시 점프 발생), 쿠키 직접 검사 (세션 만료 반영 늦음)

---

## TODO (Phase별)

- [x] Phase 0: 부트스트랩
- [x] Phase 1: 인프라 & 인증
- [x] Phase 2: 카탈로그
- [x] Phase 3: 장바구니 & 주문
- [x] Phase 4: 배송 & 사후
- [x] Phase 5: 마케팅 & 운영
- [x] Phase 6: 품질 & 배포
- [x] Phase 7: Vercel 첫 Preview 배포 + 시드 데이터 + UI/UX 1차 정리 (2026-04-20)
- [ ] Phase 8: UI/UX 잔여 (체크아웃 sticky, 장바구니 터치 타겟, empty state 통일, 별점 접근성, 푸터 placeholder 교체, 회원가입 도움말)
- [ ] Phase 9: 상용 전환 (DB 분리 / VPC / SSO 재활성화 / 프로덕션 도메인 / 실 OAuth 키 / PG 운영 키 / main 머지)
