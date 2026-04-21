# 로컬 Claude Code 에게 넘길 프롬프트

> Cowork 샌드박스에서는 `binaries.prisma.sh` 차단 때문에 `prisma generate` / `pnpm typecheck` / `pnpm build` / DB 직접 접속이 불가능합니다.
> 아래 프롬프트를 **로컬 Claude Code (저장소 루트에서)** 에 복붙하면 됩니다.

---

## 복붙용 프롬프트

```
# 컨텍스트
Parable Mall 레포 작업 이어받기. 브랜치: claude/affectionate-wiles.
직전 Cowork 세션에서 관리자 핸드오프 준비를 끝냈어. 요약:

1. 관리자 사이드바에서 깨진 /admin/settings 링크 제거
2. 상품관리 페이지: 비활성 버튼(상품등록/수정)을 판매상태 토글(노출/숨김)로 교체,
   신규 API `PATCH /api/admin/products/[id]` 추가 (감사 로그 연동)
3. 관리자 페이지 전반 alert() → inline role="alert" 오류/성공 배너
4. /admin/login 에러 UI 업그레이드 + autoComplete 추가
5. 멱등 관리자 스크립트 scripts/ensure-admin.ts 추가 + package.json 에 "db:ensure-admin" 등록
6. docs/ADMIN-HANDOFF.md 생성 (리뷰어 전달용)
7. CLAUDE.md 최신화

변경된 파일 목록:
- components/admin/sidebar.tsx
- app/(admin)/admin/products/page.tsx
- app/(admin)/admin/orders/page.tsx
- app/(admin)/admin/coupons/page.tsx
- app/(admin)/admin/qna/page.tsx
- app/(admin)/admin/reviews/page.tsx
- app/(admin)/admin/login/page.tsx
- app/api/admin/products/[id]/route.ts (신규)
- scripts/ensure-admin.ts (신규)
- package.json (db:ensure-admin 추가)
- docs/ADMIN-HANDOFF.md (신규)
- CLAUDE.md
- .gitignore (.check-syntax.js 추가)

# 해 줄 일

## 1) 검증 (무조건 먼저)
- `git status` 로 변경 확인
- `pnpm install` (ensure-admin 이 쓰는 bcryptjs/tsx/@prisma/client 는 이미 있음)
- `pnpm typecheck` — 타입 에러 0 여야 함. 에러 있으면 고치기.
- `pnpm lint` — 경고 0. 에러 있으면 고치기.
- 이슈 없으면 "검증 통과" 찍고 다음 단계로.

## 2) DB 에 관리자 계정 보장
.env.deploy.local 의 DATABASE_URL 사용:
```

DATABASE_URL="postgresql://parable_app:<PW>@34.22.100.7:5432/parable_mall?schema=public&sslmode=require" \
 pnpm db:ensure-admin

```
출력에 "관리자 계정 갱신 완료" 또는 "신규 생성 완료" 확인.

## 3) 커밋 + 푸시
- 변경사항 리뷰 후 컨벤셔널 커밋으로 하나 만들기:
  - feat(admin): 관리자 리뷰 핸드오프 준비 완료
  - 또는 의미 단위로 2~3개 분할 (판단 맡김)
- git push origin claude/affectionate-wiles
- 30초~2분 안에 Vercel Preview 빌드 시작됨. 빌드 URL 확인해서 SUCCESS 확인.

## 4) 배포된 Preview 에서 스모크 테스트
Preview URL: https://parable-mall-git-claude-affectio-ecbd8a-seongsul-2586s-projects.vercel.app

브라우저 또는 playwright 로 다음 플로우 검증:
a) /admin/login → admin@parable-ent.com / Admin1234! 로그인 성공
b) 대시보드 KPI 카드 숫자 정상 표시
c) 상품관리 → 아무 상품 "숨김" 클릭 → 상태 배지 "비활성" 변경 + 성공
d) 고객 탭에서 해당 상품이 카테고리 목록/상세에서 빠졌는지 확인
e) 다시 "노출" 로 토글 → 원상복구
f) 주문관리 → 상태 드롭다운 1회 변경 → 성공 배너
g) 리뷰관리 → 리뷰 하나 "숨기기" 토글 → 성공
h) 쿠폰관리 → "쿠폰 생성" → 가짜 쿠폰 하나 생성 → 성공 배너 + 목록에 추가
i) Q&A 관리 → 답변 대기 건 있으면 답변 등록 테스트

하나라도 실패하면 즉시 원인 디버깅 (서버 로그 / 네트워크 응답).

## 5) 결과 보고
- 위 스모크 테스트 전부 통과 스크린샷 또는 텍스트 요약
- 새로 발견된 이슈 있으면 별도 리스트
- 이상 없으면 "관리자 핸드오프 배포 완료. admin@parable-ent.com / Admin1234! 로 로그인 테스트 가능." 한 줄 보고

# 절대 지킬 것
- virdy DB 에 절대 마이그레이션/DDL 금지. parable_mall DB 에만 작업.
- 시크릿은 커밋/로그에 절대 노출 금지. .env.deploy.local 값 그대로 붙여넣지 말고 환경변수로만 참조.
- main 브랜치에 머지 금지. claude/affectionate-wiles 에만 푸시.
- Cloud SQL 0.0.0.0/0 허용은 임시 조치 — 이번 작업에서 건드리지 않음.

참고 문서:
- CLAUDE.md (프로젝트 전반)
- docs/ADMIN-HANDOFF.md (이번 세션 산출물, 리뷰어용 가이드)
- docs/DEPLOY-HANDOFF.md (배포 인프라)
- docs/UX-AUDIT.md (지난 UX 감사 리포트)
```

---

## 추가로 시간 되면 이어서 맡길 작업 (선택)

위 프롬프트가 끝난 뒤 이어서 하고 싶다면 다음 프롬프트 이어붙이기:

```
# 추가 작업: UI/UX 잔여 퀵윈

CLAUDE.md 의 "⏭️ 다음 세션 할 일 A. 남은 UI/UX 잔여" 항목 반영:

- 체크아웃 페이지 주문요약 카드의 sticky 가 모바일에서 폼 가림
  → `sticky top-20` 을 `lg:sticky lg:top-20` 로 변경 (이미 app/(shop)/checkout/page.tsx 에 반영됐는지 확인)
- 리뷰 별점 표시에 숫자 병기 (예: ⭐⭐⭐⭐☆ 4/5)
  → 영향받는 파일: 상품 상세, 마이페이지 리뷰, 관리자 리뷰
- about 페이지 사업자 정보 라벨을 `font-semibold text-foreground` 로 대비 강화
- 푸터 [대표자명]/[전화번호]/[사업장 주소] placeholder 를 "준비 중" 대신 실제 값 대기 표시로 통일 (또는 사용자에게 실제 값 물어봐서 채움)
- 회원가입 폼 각 input 밑에 도움말 텍스트 추가 (비밀번호 규칙 등)

각 수정마다 `pnpm typecheck && pnpm lint` 한 번씩 돌리고 커밋.
```

---

## 시크릿 관련 주의

위 프롬프트에 `<PW>` 자리는 로컬 `.env.deploy.local` 의 실제 값으로 자동 치환되거나, Claude Code 가 `.env.deploy.local` 를 읽어서 쓰게끔 둬주세요. 절대 md 파일이나 커밋에 평문 비번이 들어가면 안 됩니다.
