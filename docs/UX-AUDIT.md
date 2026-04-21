# Parable Mall UX/UI Audit — 2026-04-20

> 배포 URL: https://parable-mall-git-claude-affectio-ecbd8a-seongsul-2586s-projects.vercel.app
> 감사 범위: 데스크톱 (1280×800) + 모바일 (375×667), 라이트/다크 모드, 쇼핑 플로우 전체 (홈 → 카테고리 → 상품 → 장바구니 → 결제) + 인증 (로그인/회원가입) + 마이페이지
> 기준: WCAG 2.1 AA, 모바일 커머스 일반 관례 (토스, 무신사, 29CM 패턴 참고)

---

## 📊 Executive Summary

| 영역             | 이슈 수 | 🔴 Critical | 🟡 Major | 🟢 Minor |
| ---------------- | ------- | ----------- | -------- | -------- |
| 접근성 (WCAG AA) | 7       | 2           | 3        | 2        |
| 디자인 일관성    | 8       | 0           | 5        | 3        |
| 쇼핑 플로우 UX   | 9       | 1           | 6        | 2        |
| 반응형 (모바일)  | 4       | 1           | 2        | 1        |
| 콘텐츠 / 카피    | 5       | 1           | 2        | 2        |
| **합계**         | **33**  | **5**       | **18**   | **10**   |

**First impression**: 섀드시엔(shadcn/ui) 베이스의 깔끔한 시각 톤은 성공적이지만, 사용자가 실제 쇼핑을 시작하면 여러 틈이 드러남 — 이미지 플레이스홀더 깨짐, 깨진 링크, 접근성 사각지대, 그리고 카피/법적 정보에 `[대표자명]`, `[전화번호]` 같은 실제 더미 토큰이 노출되어 있어 "완성 전 베타" 느낌을 남김.

**Top 3 priority fixes** (이번 세션 직접 수정):

1. 🔴 푸터 더미 사업자 정보 (`[대표자명]`, `[000-00-00000]`, `[전화번호]`, `[사업장 주소]`) — 법적 이슈 소지 + 신뢰도 치명
2. 🔴 홈 "신상품 > 전체보기" 가 엉뚱한 카테고리(`/categories/clothing`)로 감 + 푸터 카테고리 목록이 헤더와 불일치 (포토카드/생활용품 누락)
3. 🔴 장바구니 수량 `-/+` 버튼이 ~28×28 CSS px → WCAG 2.5.5 (min 44×44) 불합격. 모바일 실사용 시 오터치 빈발

---

## 1️⃣ Accessibility (WCAG 2.1 AA)

### Perceivable

| #   | Issue                                                                                                                                          | WCAG  | Severity | Location                                           | Recommendation                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| A1  | 상품 카드 이미지가 없을 때 `📦` emoji 로만 대체됨 — 스크린리더 의미 불명                                                                       | 1.1.1 | 🟡 Major | `app/(shop)/page.tsx` `categories/[slug]/page.tsx` | `aria-hidden` + 텍스트 fallback 혹은 `alt="이미지 준비 중"` 처리 |
| A2  | 프로모션 배너 2종 (`앨범 & 음반 컬렉션`, `액세서리 & 소품`) — 배경 그라데이션 위 흰색 텍스트, `opacity-70~80` 로 최소 contrast 4.5:1 하회 의심 | 1.4.3 | 🟡 Major | `app/(shop)/page.tsx` 173–197행                    | opacity 제거 또는 opacity-90 이상                                |
| A3  | 카테고리 아이콘 이모지 (`👕💍💿🃏🎁`) 는 시각 장식인데 `aria-hidden` 미지정                                                                    | 1.1.1 | 🟢 Minor | `app/(shop)/page.tsx` 79–85 행                     | `<span aria-hidden>…</span>`                                     |

### Operable

| #   | Issue                                                                                                                                | WCAG         | Severity    | Location                                                                                | Recommendation                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ----------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| A4  | **장바구니 수량 버튼 / 상품 상세 수량 버튼 모두 터치 타겟 < 44×44** — 모바일에서 오터치 다수 예상                                    | 2.5.5        | 🔴 Critical | `app/(shop)/cart/page.tsx` 104–116 행, `components/shop/product-actions.tsx` 233–249 행 | `h-10 w-10 min-w-10` (상세) / `h-11 w-11` (장바구니) 로 확대 |
| A5  | 로고 `<Link href="/">` 에 aria-label 없음 — 스크린리더가 "Parable Mall" 텍스트는 읽지만 "링크" 역할만 안내되며 홈 이동 컨텍스트 부재 | 4.1.2        | 🟢 Minor    | `components/shop/header.tsx` 79 행                                                      | `aria-label="홈으로 이동"`                                   |
| A6  | 모바일 슬라이드 메뉴 `role="dialog"` + `aria-modal` 지정되지만, 포커스 트랩 미구현 → Tab 키가 배경 요소로 빠짐                       | 2.4.3, 2.1.1 | 🟡 Major    | `components/shop/header.tsx` 162–229 행                                                 | `focus-trap-react` 혹은 수동 구현                            |
| A7  | 카테고리 정렬 탭이 `<Link>` 인데 현재 선택된 항목에 `aria-current="page"` 미지정                                                     | 4.1.2        | 🟢 Minor    | `app/(shop)/categories/[slug]/page.tsx` 93–101 행                                       | `aria-current={sort === opt.value ? 'page' : undefined}`     |

---

## 2️⃣ Design Consistency

| #   | Issue                                                                                                                                  | Severity | Location                                                                          | Recommendation                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| D1  | **할인 배지가 홈에는 있고 카테고리/추천에는 없음** — 같은 상품이 페이지 따라 다르게 보임                                               | 🟡 Major | `categories/[slug]/page.tsx` (배지 없음), `page.tsx` featuredProducts (배지 없음) | 공용 `<ProductCard>` 컴포넌트 분리 후 배지 + 원가 취소선 일관 적용 |
| D2  | 홈 featured 카드는 원가 취소선 없음 / 신상품 카드는 있음                                                                               | 🟡 Major | `app/(shop)/page.tsx` 231–239 행                                                  | 동일 컴포넌트화                                                    |
| D3  | 소셜 로그인 3종 중 카카오/네이버는 브랜드 컬러 적용, **Google 만 outline variant + 아이콘 없음**                                       | 🟡 Major | `app/(shop)/(auth)/login/page.tsx` 114–121 행                                     | Google brand SVG + 동일 블록 스타일                                |
| D4  | 장바구니 수량 `-/+` 버튼이 상품 상세 페이지의 `-/+` 버튼과 시각적으로 다름 (상품 상세는 아이콘, 장바구니는 텍스트)                     | 🟡 Major | `cart/page.tsx` vs `product-actions.tsx`                                          | Minus/Plus 아이콘으로 통일                                         |
| D5  | 체크아웃 `sticky top-20` 결제요약 — 데스크톱만 고려됨. 모바일에서 스크롤 고정 시 입력칸 가림                                           | 🟡 Major | `checkout/page.tsx` 471 행                                                        | `className="lg:sticky lg:top-20"`                                  |
| D6  | 카테고리 페이지에 브레드크럼 부재 (상품 상세엔 있음)                                                                                   | 🟢 Minor | `categories/[slug]/page.tsx`                                                      | 홈 > {category.name} 브레드크럼 추가                               |
| D7  | 헤더 로그인 상태별 분기 (비로그인=텍스트버튼 / 로그인=아이콘) 는 구현됐으나, 장바구니 아이콘 옆에 개수 배지 없음 (담긴 상품 수 미표시) | 🟢 Minor | `components/shop/header.tsx` 110–116 행                                           | `api/cart` 에서 count 가져와 절대 위치 배지 표시                   |
| D8  | About 페이지 사업자 정보 테이블 라벨이 `text-muted-foreground` 로 흐려짐                                                               | 🟢 Minor | `app/(shop)/about/page.tsx` (가정)                                                | `font-semibold text-foreground`                                    |

---

## 3️⃣ Shopping Flow UX

| #   | Issue                                                                                                                                                                  | Severity    | Location                                                  | Recommendation                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| F1  | **홈 "신상품 > 전체보기" 가 `/categories/clothing` 으로** — 의류만 보이는데 "전체"라는 카피가 혼란 유발                                                                | 🔴 Critical | `app/(shop)/page.tsx` 100–105 행                          | `/categories/albums` 같은 신상 많은 카테고리로 변경 또는 해당 영역 내에 inline 페이지네이션. 임시: 제거 |
| F2  | 상품 상세: 이미지가 없을 때 좌측 컬럼이 **완전 공백** (placeholder 미표시)                                                                                             | 🟡 Major    | `app/(shop)/products/[slug]/page.tsx` 150–162 행          | `<div className="bg-muted aspect-square flex items-center justify-center">📷</div>` 폴백                |
| F3  | 장바구니 미로그인 상태에서 상품 담기 → `/login` 으로 튕기는데, **"로그인 후 다시 시도하세요" 안내 없음** + `callbackUrl` 미전달 → 로그인 후 어디로 돌아올지 알 수 없음 | 🟡 Major    | `components/shop/product-actions.tsx` 128–131, 165–168 행 | `router.push('/login?callbackUrl=' + encodeURIComponent(location.pathname))`                            |
| F4  | 결제 페이지 배송지 입력 필드들에 `autoComplete` 속성 전무 — 브라우저 자동완성 UX 손실                                                                                  | 🟡 Major    | `app/(shop)/checkout/page.tsx` 334–395 행                 | `name`, `tel`, `postal-code`, `street-address` 등 표준값 부여                                           |
| F5  | 주문서에서 우편번호/주소 검색 API 미연동 — 사용자가 수동 입력해야 함 (도움말도 없음)                                                                                   | 🟡 Major    | `app/(shop)/checkout/page.tsx`                            | 다음 postcode / 카카오 우편번호 API 연동 (Phase 2)                                                      |
| F6  | 상품 상세 "바로 구매" 버튼이 `variant="outline"` + 좁은 폭 → **실제 가장 중요한 CTA 인데 가장 약하게 보임**                                                            | 🟡 Major    | `components/shop/product-actions.tsx` 287–295 행          | "바로 구매" 를 primary 로, "장바구니 담기" 를 secondary 로 스왑 (또는 양쪽 모두 flex-1 로 동등하게)     |
| F7  | 장바구니에 상품 썸네일 없음 — 텍스트만 있어 어떤 상품인지 스캔이 어려움                                                                                                | 🟡 Major    | `app/(shop)/cart/page.tsx` 89–122 행                      | `sku.product.images[0]` 64×64 썸네일 추가                                                               |
| F8  | 결제 완료 후 주문 상세로 이동하는데, **결제 실패/취소 시 사용자에게 명확한 피드백 없음** (inline error 텍스트만)                                                       | 🟡 Major    | `app/(shop)/checkout/page.tsx` 510 행                     | Alert 컴포넌트 + 실패 사유별 메시지                                                                     |
| F9  | 상품 상세에 **리뷰 평점 요약** (평균 별점 + 총 개수 그래프) 없음 — 리뷰 탭 진입해야 개별 리뷰 보임                                                                     | 🟢 Minor    | `app/(shop)/products/[slug]/page.tsx` 198–201 행          | `averageRating`, 5~1 점 분포 추가                                                                       |

---

## 4️⃣ Responsive / Mobile

| #   | Issue                                                                                                                  | Severity    | Location                                | Recommendation                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------- | -------------------------------------------------------------------------- |
| M1  | **체크아웃 `sticky top-20` 결제 요약이 모바일에서 입력 폼을 가림**                                                     | 🔴 Critical | `app/(shop)/checkout/page.tsx` 471 행   | `className={cn("lg:sticky lg:top-20")}` — 모바일은 스크롤 끝 고정 버튼으로 |
| M2  | 카테고리 상품 그리드가 모바일 2열인데, 상품명 2줄 + 카테고리 라벨 + 가격 + (옵션) 리뷰 수 로 **세로 밀도가 너무 빡빡** | 🟡 Major    | `categories/[slug]/page.tsx` 141–157 행 | `text-xs` 를 `text-[11px]` 수준으로 축소하거나 카테고리 라벨 모바일 숨김   |
| M3  | 모바일 헤더에서 로그인 상태일 때 유저 아이콘 옆 테마 토글 + 장바구니 아이콘 3개가 좁은 폭에 몰림 — 로고가 좁아짐       | 🟡 Major    | `components/shop/header.tsx` 101–146 행 | 모바일에서는 테마 토글 햄버거 메뉴 안으로 이동                             |
| M4  | 홈 히어로 섹션 모바일 높이 `min-h-[420px]` — 작은 폰에서 과도한 여백                                                   | 🟢 Minor    | `app/(shop)/page.tsx` 37 행             | `min-h-[360px] md:min-h-[520px]`                                           |

---

## 5️⃣ Content / Copy / Legal

| #   | Issue                                                                                                                                    | Severity    | Location                                    | Recommendation                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
| C1  | **푸터 사업자 정보에 실제 플레이스홀더 노출**: `[대표자명]`, `[000-00-00000]`, `[제0000-서울강남-0000호]`, `[사업장 주소]`, `[전화번호]` | 🔴 Critical | `components/shop/footer.tsx` 53–55 행       | 실제 정보 입력 또는 "준비 중" 처리 + 커밋 메시지에 TODO 마킹                   |
| C2  | 푸터 카테고리 링크가 헤더와 불일치 — 헤더엔 `포토카드 / 생활용품` 있는데 푸터엔 없음                                                     | 🟡 Major    | `components/shop/footer.tsx` 13–17 행       | 헤더 `NAV_LINKS` 를 공통 상수화하여 재사용                                     |
| C3  | 회원가입 input 힌트가 placeholder 에만 있음 → 포커스하면 사라져서 도움말 상실                                                            | 🟡 Major    | `app/(shop)/(auth)/signup/page.tsx` (가정)  | `<Label>` 옆 `<span className="text-muted-foreground text-xs">` 으로 영구 표시 |
| C4  | 로그인 실패 에러가 모든 실패에 "이메일 또는 비밀번호가 올바르지 않습니다" 동일 — 계정 잠금/미인증/서버오류 구분 못함                     | 🟢 Minor    | `app/(shop)/(auth)/login/page.tsx` 41–42 행 | 서버가 error code 반환하도록 + 메시지 매핑 테이블                              |
| C5  | 상품 상세에 배송/반품 안내 섹션 없음 — 법적으로 전자상거래법상 의무 표시 항목 (배송기간, 반품조건) 상세 노출 필요                        | 🟢 Minor    | `app/(shop)/products/[slug]/page.tsx`       | "배송/반품 안내" accordion 섹션 추가                                           |

---

## 🎯 Priority Fixes (This Session)

이번 세션에서 직접 수정할 P1 Quick Wins:

1. **[C1]** 푸터 더미 사업자 정보 → "준비 중" 플레이스홀더 + TODO 주석
2. **[C2, F1]** 푸터 카테고리 목록 헤더와 동기화 + 홈 "전체보기" 링크 제거
3. **[A5]** 로고 링크 aria-label
4. **[A3]** 카테고리 이모지 aria-hidden
5. **[A4]** 장바구니 수량 버튼 터치 타겟 44×44
6. **[D4]** 장바구니 수량 버튼 아이콘 통일 (Minus/Plus lucide)
7. **[F7]** 장바구니 상품 썸네일 추가
8. **[D3]** Google 로그인 브랜드 아이콘 추가 + 스타일 통일
9. **[F3]** 비로그인 장바구니 담기 시 callbackUrl 포함 리다이렉트
10. **[F2]** 상품 상세 이미지 없을 때 폴백 placeholder
11. **[D5, M1]** 체크아웃 sticky 를 `lg:` 분기
12. **[F4]** 체크아웃 입력 autoComplete 속성 추가
13. **[F6]** 상품 상세 "바로 구매" / "장바구니" 버튼 hierarchy 조정 (양쪽 flex-1)

## 📋 Deferred (Phase 2)

- F5 우편번호 검색 API 연동 (외부 SDK)
- F8 결제 실패 메시지 구조화 (PG 사 에러코드 매핑)
- F9 리뷰 평점 요약 위젯
- C5 상품 배송/반품 accordion
- M2–M3 모바일 밀도 / 헤더 레이아웃 재조정 (리서치 + 디자인 시스템 작업 필요)
- A6 모바일 메뉴 포커스 트랩 (focus-trap-react 의존성 추가 필요)

## 색상 대비 체크 (샘플)

| 요소                              | Foreground    | Background      | 비율    | 필요  | 결과                 |
| --------------------------------- | ------------- | --------------- | ------- | ----- | -------------------- |
| 바디 텍스트 (light)               | `neutral-900` | `white`         | ~21:1   | 4.5:1 | ✅                   |
| muted-foreground 텍스트           | `neutral-500` | `white`         | ~5.7:1  | 4.5:1 | ✅                   |
| 프로모션 배너 텍스트 (opacity-70) | `white` @ 0.7 | violet-600 grad | ~3.9:1  | 4.5:1 | ❌                   |
| 카카오 버튼                       | `#191919`     | `#FEE500`       | ~16.8:1 | 4.5:1 | ✅                   |
| 네이버 버튼                       | `white`       | `#03C75A`       | ~3.1:1  | 4.5:1 | ⚠️ (large-text only) |

---

**다음 단계**: 아래 커밋에서 P1 13개 수정 적용. 상세 diff 는 `git log --stat -p` 참조.
