# Vercel 첫 배포 핸드오프 (진행 중)

> **마지막 갱신**: 2026-04-20
> **상태**: 🟡 사용자 자격 증명 수집 대기 중 — 모든 코드/설정 준비 완료
> **이어받는 Agent 에게**: 이 문서는 세션이 끊긴 Vercel 첫 배포 작업을 그대로 이어받기 위한 런북입니다. "📋 체크리스트" 섹션부터 순서대로 따라가면 됩니다. **`⚠️ 절대 주의사항` 은 건너뛰지 말 것.**

---

## ⚠️ 절대 주의사항 (이것부터 읽고 시작)

1. **DB 격리 철칙**
   - 타겟 인스턴스 `virdy-parable:asia-northeast3:virdy-v2-db` 는 **Virdy 서비스가 운영 데이터를 쓰는 DB 서버** 이다.
   - Parable Mall 은 **같은 인스턴스에 신규 DB `parable_mall` 만 생성** 해서 사용한다 (사용자 결정 — 옵션 A).
   - **`virdy` DB 에는 절대로 `prisma migrate deploy` / DDL 실행 금지.**
   - 반드시 연결 문자열의 path 가 `/parable_mall` 로 끝나는지, 유저가 `parable_app` 전용인지 두 번 확인.

2. **JDBC URL 금지**
   - 사용자가 처음에 공유한 `jdbc:postgresql:///virdy?cloudSqlInstance=...&socketFactory=...` 는 **Java 전용** 형식. Prisma/Node 에서 못 씀.
   - Prisma 에 넣을 값은 반드시 `postgresql://user:pass@host:port/db?sslmode=require` 표준 형식.

3. **R2 버킷 격리**
   - 키는 기존 Virdy 프로젝트의 키를 재사용할 수 있지만(계정 전역 권한 가정), **버킷은 `parable-mall` 신규 생성 필수**. Virdy 버킷에 쇼핑몰 이미지 섞지 말 것.

4. **Sandbox 제약 (이 세션의 Cowork 환경 기준)**
   - `binaries.prisma.sh` 차단 → `prisma generate` 불가 → `pnpm build` / `pnpm typecheck` 가 로컬(샌드박스)에서 실패함. **이건 환경 제약이지 코드 문제 아님**. Vercel CI 에서는 정상 동작.
   - `gcloud` CLI 미설치 → DB 프로비저닝 커맨드는 **사용자 로컬에서 실행 필요** (사용자 로컬에 gcloud 인증됨).
   - Claude Code(로컬 CLI) 에서 이어받으면 위 두 제약은 모두 사라진다.

5. **시크릿 커밋 금지**
   - 이 문서, CLAUDE.md, 어떤 `.md` 파일에도 실제 비밀번호/토큰을 적지 말 것.
   - 값은 전부 `.env.deploy.local` (gitignore 됨) 또는 `vercel env add` 로만 주입.

---

## 📋 체크리스트 (순서대로 실행)

### ☐ 1. 사용자에게서 받아야 할 값 확인

| 키 | 출처 | 수집 상태 |
|---|---|---|
| `VERCEL_TOKEN` | https://vercel.com/account/tokens | ⏳ 미수령 |
| `UPSTASH_REDIS_REST_URL` | Upstash 콘솔 신규 생성 | ⏳ 미수령 |
| `UPSTASH_REDIS_REST_TOKEN` | 동일 | ⏳ 미수령 |
| DB 유저(`parable_app`) 비밀번호 | 사용자가 Step 2 에서 정함 | ⏳ 미수령 |
| Cloud SQL Public IP | `gcloud sql instances describe` 결과 | ⏳ 미수령 |
| R2 Bucket 이름 | `parable-mall` (신규 생성) | ⏳ 미수령 |
| `R2_ACCOUNT_ID` | `93119c32768630657292ca7922309cda` | ✅ 확인됨 |
| `R2_ACCESS_KEY_ID` | Virdy R2 키 재사용 | ✅ 확인됨 (사용자 보관) |
| `R2_SECRET_ACCESS_KEY` | 동일 | ✅ 확인됨 (사용자 보관) |
| `R2_ENDPOINT` | `https://93119c32768630657292ca7922309cda.r2.cloudflarestorage.com` | ✅ 확인됨 |

### ☐ 2. Cloud SQL 프로비저닝 (사용자 로컬에서 실행)

```bash
# 0. 프로젝트 선택
gcloud config set project virdy-parable

# 1. 새 DB 생성 (같은 인스턴스 안에)
gcloud sql databases create parable_mall --instance=virdy-v2-db

# 2. 전용 앱 유저 생성 — <PW> 는 강력한 랜덤 비밀번호로 교체
#    (예: openssl rand -base64 24 으로 생성)
APP_DB_PASSWORD="$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)"
echo "비밀번호: $APP_DB_PASSWORD  (복사해서 보관)"

gcloud sql users create parable_app \
  --instance=virdy-v2-db \
  --password="$APP_DB_PASSWORD"

# 3. parable_mall DB 에 parable_app 유저 권한 부여
gcloud sql connect virdy-v2-db --user=postgres
# 인터랙티브 프롬프트에서 실행:
#   \c parable_mall
#   GRANT ALL ON DATABASE parable_mall TO parable_app;
#   GRANT ALL ON SCHEMA public TO parable_app;
#   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO parable_app;
#   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO parable_app;
#   \q

# 4. Public IP 확인 (이미 켜져 있음, 혹시 꺼졌으면 --assign-ip 로 활성화)
PUBLIC_IP=$(gcloud sql instances describe virdy-v2-db \
  --format="value(ipAddresses[0].ipAddress)")
echo "Public IP: $PUBLIC_IP"

# 5. Vercel egress 를 위해 전체 네트워크 허용 (⚠️ 개발 프리뷰 한정, 프로덕션 전환 시 VPC Connector 로 교체 TODO)
gcloud sql instances patch virdy-v2-db --authorized-networks=0.0.0.0/0
```

→ 결과로 조합되는 `DATABASE_URL`:
```
postgresql://parable_app:<위에서_생성한_PW>@<PUBLIC_IP>:5432/parable_mall?schema=public&sslmode=require
```

**비밀번호에 `@`, `/`, `:`, `?`, `#` 등이 들어가면 URL encoding 필요**. 위 `tr -d` 옵션으로 이미 특수문자 제거했으므로 그대로 써도 됨.

### ☐ 3. Upstash Redis 생성

웹 콘솔에서 5초:
1. https://console.upstash.com/redis → "Create Database"
2. Name: `parable-mall-prod`
3. Type: **Regional**, Region: `ap-northeast-2` (Seoul)
4. TLS: Enabled
5. 생성 후 "REST API" 탭 → `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 복사

### ☐ 4. R2 버킷 생성

1. Cloudflare 대시보드 → R2 → "Create bucket"
2. 이름: `parable-mall` (또는 `parable-mall-dev`)
3. Location: APAC
4. 기존 키가 "Apply to all buckets in this account" 권한인지 확인 (Manage R2 API Tokens). 특정 버킷 한정이었으면 계정 전체 권한 토큰 새로 발급.

### ☐ 5. Vercel 토큰 발급

https://vercel.com/account/tokens → Create Token → 이름 `parable-mall-cli`, 만료 1년.

### ☐ 6. 환경변수 파일 준비 (gitignore 됨)

프로젝트 루트에 `.env.deploy.local` 작성 (이 파일은 절대 커밋되지 않음):

```bash
# === 배포 자동화용 (로컬에서만 읽음, 커밋 금지) ===
VERCEL_TOKEN=vercel_xxxxxxxxxxxxxxxx

# === Vercel 에 등록할 실제 값 ===
DATABASE_URL="postgresql://parable_app:비번@PUBLIC_IP:5432/parable_mall?schema=public&sslmode=require"
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxx
R2_ACCOUNT_ID=<r2-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET=parable-mall-prod
R2_ENDPOINT=https://<r2-account-id>.r2.cloudflarestorage.com
```

확인:
```bash
# .gitignore 에 .env.deploy.local 포함되었는지
grep -q ".env.deploy.local" .gitignore || echo ".env.deploy.local" >> .gitignore
```

### ☐ 7. 자동 생성 시크릿 + PG 샌드박스 값

나머지는 다음 명령으로 자동 채우기 (Claude Code agent 가 실행):

```bash
# 암호학적 시크릿 생성
NEXTAUTH_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 32)
CSRF_SECRET=$(openssl rand -hex 32)

# PG 공식 샌드박스 키 (공개된 테스트 값)
TOSS_SECRET_KEY=test_sk_docs_ovdxA4EE8VKg1Aqk0MKErk9po9v1
TOSS_CLIENT_KEY=test_ck_docs_Ovk5rk1EwkEbP0W43n07xlzm
KAKAO_CID=TC0ONETIME
KAKAO_ADMIN_KEY=TEST_KAKAO_ADMIN_KEY_PLACEHOLDER
NAVER_PAY_CLIENT_ID=HN3_TEST_SANDBOX
NAVER_PAY_CLIENT_SECRET=TEST_SANDBOX_SECRET

# Placeholder (no-op fallback 존재)
RESEND_API_KEY=placeholder-resend-noop
RESEND_FROM=no-reply@parable-mall.dev
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NODE_ENV=production
```

### ☐ 8. Vercel CLI 로 env 일괄 등록 + 배포

Claude Code agent 가 실행할 명령 흐름:

```bash
set -euo pipefail
source .env.deploy.local  # VERCEL_TOKEN, DATABASE_URL 등 로드

export VERCEL_TOKEN

# 프로젝트 링크 (이미 어제 연결되어 있어도 안전)
vercel link --yes --project parable-mall

# env 일괄 등록 함수
add_env() {
  local key=$1 value=$2
  for env in production preview development; do
    printf "%s" "$value" | vercel env add "$key" "$env" --force >/dev/null 2>&1 || \
    printf "%s" "$value" | vercel env add "$key" "$env" >/dev/null
    echo "  ✓ $key [$env]"
  done
}

add_env DATABASE_URL "$DATABASE_URL"
add_env UPSTASH_REDIS_REST_URL "$UPSTASH_REDIS_REST_URL"
add_env UPSTASH_REDIS_REST_TOKEN "$UPSTASH_REDIS_REST_TOKEN"
add_env R2_ACCOUNT_ID "$R2_ACCOUNT_ID"
add_env R2_ACCESS_KEY_ID "$R2_ACCESS_KEY_ID"
add_env R2_SECRET_ACCESS_KEY "$R2_SECRET_ACCESS_KEY"
add_env R2_BUCKET "$R2_BUCKET"
add_env R2_ENDPOINT "$R2_ENDPOINT"
add_env NEXTAUTH_SECRET "$(openssl rand -hex 32)"
add_env CRON_SECRET "$(openssl rand -hex 32)"
add_env CSRF_SECRET "$(openssl rand -hex 32)"
add_env TOSS_SECRET_KEY "test_sk_docs_ovdxA4EE8VKg1Aqk0MKErk9po9v1"
add_env TOSS_CLIENT_KEY "test_ck_docs_Ovk5rk1EwkEbP0W43n07xlzm"
add_env NEXT_PUBLIC_TOSS_CLIENT_KEY "test_ck_docs_Ovk5rk1EwkEbP0W43n07xlzm"
add_env KAKAO_CID "TC0ONETIME"
add_env KAKAO_ADMIN_KEY "TEST_KAKAO_ADMIN_KEY_PLACEHOLDER"
add_env NAVER_PAY_CLIENT_ID "HN3_TEST_SANDBOX"
add_env NAVER_PAY_CLIENT_SECRET "TEST_SANDBOX_SECRET"
add_env RESEND_API_KEY "placeholder-resend-noop"
add_env RESEND_FROM "no-reply@parable-mall.dev"
add_env NEXT_PUBLIC_POSTHOG_HOST "https://us.i.posthog.com"

# (Preview 에서는 Vercel 이 NEXTAUTH_URL 을 VERCEL_URL 로 자동 채움.
#  프로덕션 도메인 확정 후 별도로 add_env NEXTAUTH_URL https://parable-mall.com)

# 커밋 후 푸시 → Vercel Preview 자동 빌드
git add -A
git commit -m "chore: finalize lint/format/test cleanup for Vercel deploy"
git push origin claude/affectionate-wiles

# CLI 로도 Preview 배포 한번 더 트리거 (원하면)
vercel deploy --yes --archive=tgz
```

### ☐ 9. 최초 마이그레이션 (신규 DB 는 비어 있음)

Vercel 빌드 스크립트는 `prisma generate && next build`. **`migrate deploy` 는 자동 실행하지 않음** (실수 방지). 최초 1회 수동 실행:

```bash
# 로컬에서 실제 Cloud SQL 로 접속해서 마이그레이션
DATABASE_URL="postgresql://parable_app:...@PUBLIC_IP:5432/parable_mall?..." \
  pnpm prisma migrate deploy

# 시드 데이터가 필요하면
DATABASE_URL="..." pnpm db:seed
```

### ☐ 10. 배포 검증

1. Vercel 대시보드에서 Preview URL 획득 (예: `https://parable-mall-xxxxx-parable-ent.vercel.app`)
2. `curl https://<preview>/api/health` → `{"status":"ok"}` 확인
3. 브라우저로 접속해서:
   - 홈 페이지 렌더
   - `/categories/clothing` 등 카테고리 페이지 SSR 정상
   - 다크모드 토글, 모바일 메뉴 열기/닫기
4. 관리자 진입 (`/admin`) — 초기 관리자 계정 있으면 로그인, 없으면 시드로 생성한 계정 사용
5. 결제 플로우는 토스 샌드박스라 테스트 카드로 한 번 주문 성공 여부 확인

---

## 🗂 이 세션에서 수집/확정한 정보

| 항목 | 값 |
|---|---|
| GitHub Repo | https://github.com/PARABLE-Ent/Parable-mall.git |
| 푸시 브랜치 | `claude/affectionate-wiles` (origin/main 대비 4 커밋 + 로컬 unstaged 변경) |
| GCP Project | `virdy-parable` |
| Cloud SQL Instance | `virdy-v2-db` (region: `asia-northeast3`) |
| 사용할 DB 이름 | `parable_mall` (**신규 생성 필요**) |
| DB 앱 유저 | `parable_app` (**신규 생성 필요**) |
| R2 Account ID | `93119c32768630657292ca7922309cda` |
| R2 Bucket | `parable-mall` (**신규 생성 필요**) |
| Redis | Upstash Regional, `ap-northeast-2`, 신규 DB `parable-mall-prod` |
| 결제 PG | 공식 샌드박스 테스트 키 사용 |
| Resend/Sentry/PostHog | skip (no-op fallback) |
| NEXTAUTH_URL | Preview 는 `VERCEL_URL` 자동, 프로덕션은 추후 결정 |

---

## 🚧 TODO (이번 배포 이후 과제)

- [ ] Cloud SQL 전용 인스턴스로 분리 (Virdy 와 완전 격리)
- [ ] Public IP `0.0.0.0/0` 허용 → VPC Connector + Private IP 로 전환
- [ ] 프로덕션 도메인 결정 및 `NEXTAUTH_URL` 확정
- [ ] Sentry / PostHog 실제 프로젝트 연결
- [ ] Resend 실제 API 키 + 도메인 verify
- [ ] 결제 PG 실 운영 키 교체 (상용 런칭 직전)
- [ ] `main` 브랜치로 병합 및 Vercel Production 배포
- [ ] CI 에서 `prisma migrate deploy` 를 수동 승인 필요 워크플로로 분리

---

## 🔗 관련 문서

- [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md) — Phase 6 전체 구현 보고서
- [runbook.md](./runbook.md) — 운영 런북
- [adr/](./adr/) — 아키텍처 결정 기록
