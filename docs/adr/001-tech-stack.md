# ADR-001: 기술 스택 선택

## 상태

승인됨 (2025-04-15)

## 컨텍스트

Parable-ENT의 자사 D2C 쇼핑몰을 새로 구축한다. 카페24/고도몰 같은 임대몰이 아닌 자체 운영 가능한 코드베이스가 필요하다. 모바일 우선(70%), 한국어 기본/영어 확장, 동시접속 1k, 일 주문 300건 규모.

## 결정

### Frontend: Next.js 16 + TypeScript + TailwindCSS v4 + shadcn/ui

- **이유**: App Router의 서버 컴포넌트로 초기 로딩 최적화, TailwindCSS v4의 성능 개선, shadcn/ui로 일관된 디자인 시스템
- **대안 검토**: Remix (데이터 로딩은 우수하나 한국 커뮤니티/자료 부족), Nuxt (Vue 생태계 전환 비용)

### State: Zustand + TanStack Query

- **이유**: Zustand는 보일러플레이트 최소화, TanStack Query는 서버 상태 캐싱/동기화에 최적
- **대안 검토**: Redux Toolkit (과도한 보일러플레이트), Jotai (atom 기반이 쇼핑몰 도메인에 부적합)

### Backend: Next.js Route Handlers + Server Actions

- **이유**: 1차 런칭에는 단일 앱으로 충분, 트래픽 증가 시 NestJS 분리 가능하게 모듈 경계 설계
- **대안 검토**: 처음부터 NestJS 분리 (초기 복잡도 과다), tRPC (한국 PG 연동 시 REST가 더 적합)

### ORM: Prisma 7

- **이유**: 타입 안전성, 마이그레이션 관리, 한국 개발자 커뮤니티 활발
- **대안 검토**: Drizzle (경량이나 마이그레이션 도구 미성숙), Kysely (쿼리빌더, ORM 기능 부족)

### Database: PostgreSQL 16 + Redis 7

- **이유**: PostgreSQL은 ACID 트랜잭션/JSON 지원, Redis는 세션/캐시/분산락
- **대안 검토**: MySQL (JSON 지원 약함), MongoDB (트랜잭션 복잡)

### Storage: Cloudflare R2

- **이유**: S3 호환 API, 이그레스 비용 무료, CDN 내장
- **대안 검토**: AWS S3 (이그레스 비용 발생), Supabase Storage (DB와 번들이지만 CDN 별도)

## 결과

- 단일 Next.js 앱으로 빠른 개발, 필요 시 백엔드 분리 가능
- 한국 결제/배송 생태계와의 호환성 확보
- 모바일 우선 성능 최적화 가능
