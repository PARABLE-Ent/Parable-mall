# Parable Mall - 운영 Runbook

## 장애 대응

### 결제 실패 시

1. Sentry에서 에러 로그 확인
2. 토스페이먼츠 대시보드에서 결제 상태 확인
3. DB에서 해당 주문의 Payment 레코드 확인
   ```sql
   SELECT * FROM payments WHERE order_id = '...' ORDER BY created_at DESC;
   ```
4. 주문 상태가 PENDING_PAYMENT인 경우:
   - 재고 예약(reserved)이 걸려있으므로, 30분 후에도 결제되지 않으면 예약 해제 필요
   - `UPDATE inventories SET reserved = reserved - N WHERE sku_id = '...';`
5. 결제 완료인데 주문이 PENDING인 경우:
   - 토스 웹훅 재시도 확인
   - 수동으로 `confirmOrder()` 호출

### DB 연결 장애

1. Docker 컨테이너 상태 확인: `docker compose ps`
2. PostgreSQL 로그 확인: `docker compose logs postgres`
3. 연결 수 확인: `SELECT count(*) FROM pg_stat_activity;`
4. 필요 시 재시작: `docker compose restart postgres`

### Redis 연결 장애

1. Redis 상태 확인: `docker compose exec redis redis-cli ping`
2. 메모리 사용량: `docker compose exec redis redis-cli info memory`
3. 비회원 장바구니, 관리자 세션에 영향
4. Redis 장애 시 관리자 로그인 불가 → 복구 후 재로그인

### 재고 불일치

1. 실제 재고 vs DB 재고 비교
   ```sql
   SELECT s.sku_code, i.quantity, i.reserved
   FROM inventories i JOIN skus s ON s.id = i.sku_id;
   ```
2. reserved가 음수면 데이터 오류 → 0으로 리셋
3. 주문 취소 후 재고 미복원 건 확인

## 배포

### Vercel 배포

1. `main` 브랜치에 Push → 자동 배포
2. Preview: PR 생성 시 프리뷰 URL 자동 생성
3. 롤백: Vercel 대시보드에서 이전 배포로 롤백

### DB 마이그레이션

1. 개발: `pnpm db:migrate`
2. 운영: `prisma migrate deploy` (마이그레이션 파일은 코드에 포함)
3. 롤백: 해당 마이그레이션의 역 SQL 수동 실행 (Prisma는 자동 롤백 미지원)

## 정기 작업

### 만료 적립금 처리

- 매일 자정: `expiresAt < NOW()`인 적립금 만료 처리
- TODO: 크론 작업 또는 서버리스 함수로 구현

### 배송 상태 동기화

- 매시간: 배송 중인 주문의 스마트택배 API 조회
- TODO: 크론 작업으로 구현

### 미결제 주문 정리

- 30분 이상 PENDING_PAYMENT인 주문: 재고 예약 해제 + 주문 취소
- TODO: 크론 작업으로 구현

## 모니터링

### Sentry

- 에러율 급증 시 Slack 알림 설정
- PII scrubbing: 이메일, 전화번호, 주소 자동 마스킹

### PostHog

- 퍼널: 상품 조회 → 장바구니 → 주문 → 결제 완료
- 핵심 지표: CVR, AOV, 재구매율

## 계정 정보

| 서비스        | 역할        | 비고                |
| ------------- | ----------- | ------------------- |
| 토스페이먼츠  | 결제 PG     | 테스트/운영 키 분리 |
| Cloudflare R2 | 이미지 저장 |                     |
| Vercel        | 호스팅      |                     |
| Sentry        | 에러 추적   |                     |
| PostHog       | 제품 분석   |                     |
