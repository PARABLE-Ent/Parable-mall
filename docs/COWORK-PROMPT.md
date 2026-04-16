# Parable Mall — 코워크 연속 작업 프롬프트

> 이 프롬프트를 Claude Code 코워크 세션에 붙여넣으세요.
> CLAUDE.md에 전체 컨벤션과 결정 로그가 있으니 반드시 먼저 읽을 것.

---

## 역할

너는 시니어 풀스택 엔지니어다. Parable-ENT D2C 쇼핑몰(Parable Mall)의 **미완성 부분을 전부 완성**시켜야 한다.
**한 작업이 끝나면 멈추지 말고 다음 작업으로 바로 넘어가라.** 전체 TODO가 끝날 때까지 계속 진행하라.

---

## 현재 상태 (이전 세션에서 완료됨)

### 완료된 것

- Phase 0~6 전체 구현 (59개 TypeScript 파일, 26개 라우트)
- 10회 코드리뷰 후 CRITICAL/HIGH 10건 수정 완료
- 랜딩 페이지 + Header/Footer 구현
- Redis를 ioredis → @upstash/redis로 전환
- Vercel + GCP Cloud SQL + Upstash Redis 배포 설정
- 커밋 완료 (`claude/affectionate-wiles` 브랜치)

### 핵심 파일 위치

- `CLAUDE.md` — 컨벤션, 결정 로그, 비즈니스 정책 (반드시 먼저 읽을 것)
- `prisma/schema.prisma` — 30개 엔티티 데이터 모델
- `server/` — 도메인 로직 (order, cart, catalog, review, coupon, shipping)
- `lib/` — 인프라 어댑터 (auth, cache, db, payments, storage, shipping, mailer)
- `components/shop/` — 공용 Header, Footer
- `app/(shop)/` — 고객 페이지
- `app/(admin)/admin/` — 관리자 페이지
- `app/api/` — API 라우트 핸들러

---

## TODO — 아래 순서대로 멈추지 말고 전부 완성

### 1단계: 프론트엔드 UI 보완 (가장 시급)

#### 1-1. 모바일 햄버거 메뉴

- `components/shop/header.tsx`에 모바일 메뉴 토글 구현
- 현재 햄버거 버튼은 있지만 동작 안 함
- 클릭 시 카테고리 링크 5개 + 로그인/장바구니가 슬라이드로 열려야 함

#### 1-2. Admin 대시보드 UI

- `app/(admin)/admin/page.tsx`가 현재 placeholder
- `/api/admin/dashboard` API를 호출해서 실제 대시보드 구현:
  - KPI 카드 4개: 오늘 매출, 오늘 주문, 총 회원, 대기 주문
  - 최근 주문 테이블 (주문번호, 고객명, 금액, 상태, 날짜)
  - 재고 부족 알림 뱃지

#### 1-3. Admin 사이드바 네비게이션

- `app/(admin)/admin/layout.tsx`에 사이드바 구현
- 메뉴: 대시보드, 상품관리, 주문관리, 회원관리, 쿠폰관리, 리뷰관리, 설정
- 모바일에서 햄버거로 토글

#### 1-4. 체크아웃(주문서) 페이지

- `app/(shop)/checkout/page.tsx` 신규 생성
- 장바구니 데이터로 주문서 작성: 배송지 입력, 쿠폰 선택, 적립금 사용
- 토스페이먼츠 결제창 호출 (`@tosspayments/payment-sdk` 사용)
- 결제 성공/실패 처리

#### 1-5. 마이페이지

- `app/(shop)/mypage/` 아래 구현:
  - `/mypage` — 내 정보 요약 (등급, 적립금, 쿠폰 수)
  - `/mypage/orders` — 주문 내역 목록
  - `/mypage/orders/[id]` — 주문 상세 (배송 추적)
  - `/mypage/reviews` — 내 리뷰 목록
  - `/mypage/coupons` — 내 쿠폰 목록
  - `/mypage/wishlist` — 위시리스트
  - `/mypage/addresses` — 배송지 관리

#### 1-6. 상품 상세 페이지 인터랙션

- `app/(shop)/products/[slug]/page.tsx` 개선:
  - 옵션 선택 시 SKU 변경 + 가격 업데이트 (클라이언트 상태)
  - "장바구니 담기" 실제 동작 (POST /api/cart 호출)
  - "바로 구매" → 체크아웃 페이지로 이동
  - 수량 선택 UI
  - 품절 시 "입고 알림 신청" 버튼

### 2단계: 누락 API 구현

#### 2-1. 고객 API

- `GET /api/orders` — 내 주문 목록 (인증 필요)
- `GET /api/orders/[id]` — 주문 상세
- `GET /api/profile` — 내 정보 조회
- `PATCH /api/profile` — 내 정보 수정
- `GET /api/wishlists` — 위시리스트 조회
- `POST /api/wishlists` — 위시리스트 추가
- `DELETE /api/wishlists/[id]` — 위시리스트 삭제
- `GET /api/coupons` — 내 쿠폰 목록
- `POST /api/coupons/redeem` — 쿠폰 코드 등록
- `GET /api/addresses` — 배송지 목록
- `POST /api/addresses` — 배송지 추가
- `PATCH /api/addresses/[id]` — 배송지 수정
- `DELETE /api/addresses/[id]` — 배송지 삭제
- `POST /api/orders/[id]/cancel` — 주문 취소
- `POST /api/orders/[id]/refund` — 환불 요청

#### 2-2. Admin API

- `PATCH /api/admin/orders/[id]/status` — 주문 상태 변경
- `POST /api/admin/orders/[id]/shipment` — 송장 등록
- `GET /api/admin/users` — 회원 목록
- `GET /api/admin/reviews` — 리뷰 관리 목록
- `PATCH /api/admin/reviews/[id]` — 리뷰 숨김/표시
- `POST /api/admin/qna/[id]/answer` — Q&A 답변

### 3단계: 보안 & 안정성

#### 3-1. 로그인 Rate Limiting

- Upstash Redis 기반 IP당 5회/15분 제한
- `/api/auth/[...nextauth]`와 `/api/admin/login` 모두 적용
- 실패 시 429 상태 코드 + 남은 시간 안내

#### 3-2. Error Boundary

- `app/(shop)/error.tsx` — 고객 에러 페이지
- `app/(admin)/admin/error.tsx` — 관리자 에러 페이지
- `app/(shop)/loading.tsx` — 로딩 스켈레톤
- `app/(shop)/not-found.tsx` — 404 페이지

#### 3-3. API 응답 포맷 통일

- 모든 API 응답을 `{ data: T, error?: string, pagination?: { page, limit, total, totalPages } }` 형태로 통일
- 공용 응답 헬퍼 함수 생성: `lib/utils/api-response.ts`

### 4단계: 테스트

#### 4-1. Zod 스키마 테스트

- `tests/unit/schemas.test.ts` 생성
- signupSchema, createOrderSchema, createProductSchema, createCouponSchema 각각 정상/에러 케이스

#### 4-2. 서버 로직 통합 테스트

- `tests/unit/cart.test.ts` — 장바구니 추가/수정/삭제/머지 순수 로직
- `tests/unit/coupon.test.ts` — 쿠폰 할인 계산 로직
- `tests/unit/shipping.test.ts` — 배송비 계산 로직

#### 4-3. E2E 테스트 시나리오 (Playwright)

- `tests/e2e/auth.spec.ts` — 회원가입 → 로그인 → 로그아웃
- `tests/e2e/catalog.spec.ts` — 카테고리 탐색 → 상품 상세 → 옵션 선택
- `tests/e2e/checkout.spec.ts` — 장바구니 → 주문서 → (결제는 모킹)

### 5단계: 성능 & SEO 최적화

#### 5-1. 성능

- Admin 대시보드 통계를 Redis에 5분 캐싱
- 카테고리 트리 캐싱 (revalidateTag 사용)
- 장바구니 페이지 optimistic update (useOptimistic 또는 SWR mutate)
- 상품 목록 이미지 lazy loading

#### 5-2. SEO

- 상품 상세에 JSON-LD 구조화 데이터 (Product, BreadcrumbList)
- 카테고리 페이지에 BreadcrumbList JSON-LD
- Open Graph 메타태그 (상품 이미지, 가격)

### 6단계: 마무리

#### 6-1. 접근성 (a11y)

- 모든 interactive 요소에 aria-label
- 키보드 네비게이션 (Tab 순서, Enter/Space 동작)
- 폼 에러 시 focus 이동
- prefers-reduced-motion 대응

#### 6-2. 다크 모드

- 시스템 테마 자동 감지 (already set up in globals.css)
- 다크/라이트 토글 버튼 Header에 추가

#### 6-3. 관리자 기능 페이지 UI

- `/admin/products` — 상품 목록 + 생성/수정 폼
- `/admin/orders` — 주문 목록 + 상태 변경 + 송장 등록
- `/admin/users` — 회원 목록 + 등급 관리
- `/admin/coupons` — 쿠폰 목록 + 생성 폼
- `/admin/reviews` — 리뷰 관리

---

## 작업 규칙

1. **CLAUDE.md를 먼저 읽고** 컨벤션을 따를 것
2. **TypeScript strict**, `any` 금지
3. **모든 API는 Zod 스키마 검증** 필수
4. 새로운 결정이 필요하면 CLAUDE.md 결정 로그에 추가
5. 매 단계 끝에 `pnpm typecheck && pnpm lint && pnpm test && pnpm build` 통과 확인
6. 한 단계가 끝나면 **커밋하고 다음 단계로 자동 진행**
7. 커밋 메시지는 컨벤셔널 커밋: `feat:`, `fix:`, `test:`, `chore:`
8. **멈추지 말고 전체 TODO가 끝날 때까지 계속 작업**

---

## 시작

CLAUDE.md를 읽은 뒤, 1단계 1-1(모바일 햄버거 메뉴)부터 시작해라.
