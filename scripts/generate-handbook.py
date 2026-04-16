"""
Parable Mall 관리자 핸드북 PDF 생성 스크립트
Latin + Korean 이중 폰트 사용
"""
import os
import re
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ─────────────────────────────────────────────
# 폰트 등록
# ─────────────────────────────────────────────
pdfmetrics.registerFont(TTFont("Latin", "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("LatinBold", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Korean", "/usr/share/fonts-droid-fallback/truetype/DroidSansFallback.ttf"))

LATIN = "Latin"
LATIN_BOLD = "LatinBold"
KR = "Korean"


def mixed(text: str) -> str:
    """한글이 포함된 텍스트에서 자동으로 <font> 태그를 삽입하여
    한글은 Korean 폰트, 나머지는 Latin 폰트로 렌더링.
    이미 <font>, <b>, <bullet> 등 XML 태그가 있으면 그대로 유지."""
    # 이미 font 태그가 있으면 그대로 반환
    if '<font' in text:
        return text

    # 한글 범위: AC00-D7AF (완성형), 3131-318E (자모)
    # 한글이 포함된 구간과 아닌 구간을 분리
    parts = re.split(r'([\uAC00-\uD7AF\u3131-\u318E]+)', text)
    result = []
    for part in parts:
        if not part:
            continue
        if re.search(r'[\uAC00-\uD7AF\u3131-\u318E]', part):
            result.append(f'<font name="{KR}">{part}</font>')
        else:
            result.append(part)
    return ''.join(result)


def m(text: str) -> str:
    """mixed()의 축약형"""
    return mixed(text)


# ─────────────────────────────────────────────
# 컬러 팔레트
# ─────────────────────────────────────────────
PRIMARY = HexColor("#18181B")
ACCENT = HexColor("#6366F1")
LIGHT_BG = HexColor("#F4F4F5")
MID_GRAY = HexColor("#71717A")
TABLE_HEADER_BG = HexColor("#27272A")
TABLE_ROW_BG = HexColor("#FAFAFA")
BORDER_COLOR = HexColor("#E4E4E7")

# ─────────────────────────────────────────────
# 스타일 정의 (기본 폰트는 Latin)
# ─────────────────────────────────────────────
TITLE_STYLE = ParagraphStyle(
    "HandbookTitle", fontName=LATIN, fontSize=28, leading=36,
    textColor=PRIMARY, spaceAfter=6*mm, alignment=TA_LEFT,
)
SUBTITLE_STYLE = ParagraphStyle(
    "HandbookSubtitle", fontName=LATIN, fontSize=13, leading=18,
    textColor=MID_GRAY, spaceAfter=14*mm,
)
H1 = ParagraphStyle(
    "H1", fontName=LATIN, fontSize=20, leading=28,
    textColor=PRIMARY, spaceBefore=10*mm, spaceAfter=5*mm,
)
H2 = ParagraphStyle(
    "H2", fontName=LATIN, fontSize=15, leading=22,
    textColor=ACCENT, spaceBefore=7*mm, spaceAfter=3*mm,
)
BODY = ParagraphStyle(
    "Body", fontName=LATIN, fontSize=10, leading=16,
    textColor=PRIMARY, spaceAfter=3*mm, alignment=TA_JUSTIFY,
)
BULLET = ParagraphStyle(
    "Bullet", fontName=LATIN, fontSize=10, leading=16,
    textColor=PRIMARY, leftIndent=10*mm, spaceAfter=1.5*mm,
    bulletIndent=4*mm,
)
NOTE_STYLE = ParagraphStyle(
    "Note", fontName=LATIN, fontSize=9, leading=14,
    textColor=MID_GRAY, leftIndent=8*mm, spaceAfter=3*mm,
    borderPadding=4*mm, backColor=LIGHT_BG,
)
TOC_STYLE = ParagraphStyle(
    "TOC", fontName=LATIN, fontSize=11, leading=20,
    textColor=PRIMARY, leftIndent=4*mm, spaceAfter=1*mm,
)
COVER_VER = ParagraphStyle(
    "CoverVer", fontName=LATIN, fontSize=18, leading=24,
    textColor=ACCENT, spaceAfter=8*mm,
)
END_MARK = ParagraphStyle(
    "EndMark", fontName=LATIN, fontSize=9, textColor=MID_GRAY,
    alignment=TA_CENTER,
)


def make_table(headers: list, rows: list, col_widths=None):
    """표 생성 — 모든 셀 텍스트에 mixed() 적용"""
    proc_headers = [m(h) for h in headers]
    proc_rows = [[m(str(cell)) for cell in row] for row in rows]

    # Paragraph으로 감싸기
    cell_style = ParagraphStyle("Cell", fontName=LATIN, fontSize=9, leading=14, textColor=PRIMARY)
    header_style = ParagraphStyle("HeaderCell", fontName=LATIN, fontSize=9, leading=14, textColor=white)

    data = [[Paragraph(h, header_style) for h in proc_headers]]
    for row in proc_rows:
        data.append([Paragraph(c, cell_style) for c in row])

    if col_widths is None:
        col_widths = [None] * len(headers)

    style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
        *[("BACKGROUND", (0, i), (-1, i), TABLE_ROW_BG) for i in range(2, len(data), 2)],
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("LINEBELOW", (0, 0), (-1, 0), 1, PRIMARY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ])

    return Table(data, colWidths=col_widths, style=style, repeatRows=1)


def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont(LATIN, 8)
    canvas.setFillColor(MID_GRAY)
    canvas.drawCentredString(A4[0] / 2, 15*mm, f"Parable Mall | {doc.page}")
    canvas.restoreState()


# ─────────────────────────────────────────────
# 문서 빌드
# ─────────────────────────────────────────────
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "/sessions/determined-great-albattani/mnt/Parable-mall")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "Parable-Mall-관리자-핸드북.pdf")

doc = SimpleDocTemplate(
    OUTPUT_PATH, pagesize=A4,
    leftMargin=20*mm, rightMargin=20*mm,
    topMargin=25*mm, bottomMargin=25*mm,
    title="Parable Mall Admin Handbook",
    author="Parable-ENT",
)

story = []
W = A4[0] - 40*mm

# ═══════════════════════════════════════════════
# 표지
# ═══════════════════════════════════════════════
story.append(Spacer(1, 50*mm))
story.append(Paragraph("Parable Mall", TITLE_STYLE))
story.append(Paragraph(m("관리자 핸드북 v1.0"), COVER_VER))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT))
story.append(Spacer(1, 6*mm))
story.append(Paragraph(m("Parable-ENT D2C 쇼핑몰 운영 가이드"), SUBTITLE_STYLE))
story.append(Paragraph(m(f"작성일: {datetime.now().strftime('%Y년 %m월 %d일')}"), BODY))
story.append(Paragraph(m("대상: 쇼핑몰 운영 담당자, 관리자"), BODY))
story.append(Spacer(1, 30*mm))
story.append(Paragraph(m(
    "이 문서는 Parable Mall의 전체 기능과 관리자 패널 사용법, "
    "비즈니스 정책, 운영 가이드를 포함하고 있습니다. "
    "기능별로 목차를 참고하여 필요한 부분을 확인해 주세요."
), BODY))
story.append(PageBreak())


# ═══════════════════════════════════════════════
# 목차
# ═══════════════════════════════════════════════
story.append(Paragraph(m("목차"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))
story.append(Spacer(1, 4*mm))

toc_items = [
    ("1.", "시스템 개요", "기술 스택, 아키텍처, 접속 정보"),
    ("2.", "관리자 접속 및 인증", "로그인, 세션, 권한 체계"),
    ("3.", "대시보드", "KPI 카드, 최근 주문, 재고 알림"),
    ("4.", "상품 관리", "상품 등록/수정, 옵션/SKU, 재고, 상태"),
    ("5.", "주문 관리", "주문 상태 흐름, 송장 등록, 취소/환불"),
    ("6.", "회원 관리", "회원 등급, 적립금, 조회"),
    ("7.", "쿠폰 관리", "쿠폰 생성, 발급, 정책"),
    ("8.", "리뷰 / Q&A 관리", "리뷰 표시/숨김, Q&A 답변"),
    ("9.", "배송 정책", "배송비, 무료배송, 도서산간"),
    ("10.", "환불/반품 정책", "반품 기간, 비용, 처리 절차"),
    ("11.", "고객 쇼핑몰 기능 목록", "전체 페이지/기능 리스트"),
    ("12.", "기술 운영 가이드", "배포, 환경변수, DB, 캐시"),
    ("13.", "트러블슈팅 & FAQ", "자주 발생하는 문제와 해결 방법"),
    ("14.", "피드백 & 개선 요청", "피드백 양식"),
]

for num, title, desc in toc_items:
    story.append(Paragraph(
        f"<b>{num}</b>  {m(title)}  <font color='#71717A' size='9'>— {m(desc)}</font>",
        TOC_STYLE,
    ))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 1. 시스템 개요
# ═══════════════════════════════════════════════
story.append(Paragraph(m("1. 시스템 개요"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(Paragraph(m("1.1 프로젝트 소개"), H2))
story.append(Paragraph(m(
    "Parable Mall은 Parable-ENT의 자사 D2C(Direct to Consumer) 쇼핑몰입니다. "
    "굿즈, 콘텐츠, 디지털 상품을 판매하며, 의류/액세서리/앨범/포토카드/생활용품 등 "
    "다양한 카테고리를 운영합니다."
), BODY))

story.append(Paragraph(m("1.2 기술 스택"), H2))
story.append(make_table(
    ["구분", "기술", "비고"],
    [
        ["프론트엔드", "Next.js 16 + TypeScript + TailwindCSS", "App Router 사용"],
        ["UI 라이브러리", "shadcn/ui + Lucide Icons", "일관된 디자인 시스템"],
        ["상태 관리", "Zustand (클라이언트) + TanStack Query (서버)", ""],
        ["백엔드", "Next.js Route Handlers + Server Actions", "풀스택 통합"],
        ["데이터베이스", "PostgreSQL (GCP Cloud SQL)", "Prisma 6 ORM"],
        ["캐시/세션", "Upstash Redis (HTTP)", "Serverless 최적화"],
        ["결제", "토스페이먼츠 + 카카오페이 + 네이버페이", ""],
        ["파일 저장", "Cloudflare R2 (S3 호환)", "이그레스 비용 무료"],
        ["배포", "Vercel", "Next.js 네이티브 지원"],
        ["분석", "PostHog", "퍼널/세션리플레이/AB테스트"],
    ],
    col_widths=[30*mm, 65*mm, W - 95*mm],
))

story.append(Paragraph(m("1.3 접속 URL"), H2))
story.append(make_table(
    ["환경", "URL", "용도"],
    [
        ["프로덕션", "https://parable-mall.vercel.app (배포 후 확정)", "실 서비스"],
        ["고객 쇼핑몰", "/", "고객 접속용 메인 페이지"],
        ["관리자 패널", "/admin", "운영 담당자 전용"],
        ["관리자 로그인", "/admin/login", "이메일/비밀번호 인증"],
    ],
    col_widths=[25*mm, 60*mm, W - 85*mm],
))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 2. 관리자 접속 및 인증
# ═══════════════════════════════════════════════
story.append(Paragraph(m("2. 관리자 접속 및 인증"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(Paragraph(m("2.1 로그인 방법"), H2))
story.append(Paragraph(m(
    "관리자는 일반 고객 인증(NextAuth)과 완전히 분리된 별도 인증 체계를 사용합니다. "
    "소셜 로그인은 지원하지 않으며, 이메일/비밀번호로만 로그인합니다."
), BODY))
story.append(Paragraph(m("<bullet>&bull;</bullet> /admin/login 페이지에서 이메일과 비밀번호를 입력합니다."), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 로그인 성공 시 /admin 대시보드로 이동합니다."), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 세션 유효시간: 8시간 (이후 자동 로그아웃)"), BULLET))

story.append(Paragraph(m("2.2 보안 정책"), H2))
story.append(Paragraph(m("<bullet>&bull;</bullet> Rate Limiting: IP당 15분 내 5회 로그인 실패 시 차단"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 차단 시 429 에러 + 남은 시간 안내가 표시됩니다."), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 세션은 Redis에 저장되며, 로그아웃 시 즉시 무효화됩니다."), BULLET))

story.append(Paragraph(m("2.3 관리자 권한 등급"), H2))
story.append(make_table(
    ["권한", "설명", "접근 범위"],
    [
        ["OWNER", "최고 관리자", "모든 기능 + 관리자 계정 관리"],
        ["MANAGER", "운영 매니저", "상품/주문/회원/쿠폰/리뷰 관리"],
        ["CS", "고객 상담", "주문 조회/Q&A 답변 위주"],
    ],
    col_widths=[25*mm, 35*mm, W - 60*mm],
))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 3. 대시보드
# ═══════════════════════════════════════════════
story.append(Paragraph(m("3. 대시보드"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(Paragraph(m(
    "/admin 접속 시 나타나는 메인 화면입니다. 운영 현황을 한눈에 파악할 수 있습니다."
), BODY))

story.append(Paragraph(m("3.1 KPI 카드 (4개)"), H2))
story.append(make_table(
    ["카드", "표시 내용", "갱신 주기"],
    [
        ["오늘 매출", "당일 결제 완료 주문의 합계 금액 + 월간 매출", "5분 캐시"],
        ["오늘 주문", "당일 주문 건수 + 활성 상품 수", "5분 캐시"],
        ["총 회원", "가입된 전체 회원 수", "5분 캐시"],
        ["대기 주문", "결제 완료(PAID) 상태의 주문 수 + 재고 부족 경고", "5분 캐시"],
    ],
    col_widths=[25*mm, 60*mm, W - 85*mm],
))

story.append(Paragraph(m("3.2 최근 주문 테이블"), H2))
story.append(Paragraph(m(
    "최근 10건의 주문이 표시됩니다. 주문번호, 고객명, 상품명, 금액, 상태, 날짜를 확인할 수 있습니다. "
    "상세 관리는 '주문관리' 메뉴에서 진행합니다."
), BODY))

story.append(Paragraph(m("3.3 재고 부족 알림"), H2))
story.append(Paragraph(m(
    "재고가 5개 이하인 SKU가 있을 경우, 대기 주문 카드에 빨간색 경고 뱃지가 표시됩니다. "
    "상품관리 > 해당 상품에서 재고를 확인하고 보충해 주세요."
), BODY))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 4. 상품 관리
# ═══════════════════════════════════════════════
story.append(Paragraph(m("4. 상품 관리"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(Paragraph(m("4.1 상품 목록 (/admin/products)"), H2))
story.append(Paragraph(m(
    "모든 등록 상품을 테이블 형태로 조회합니다. 검색 필터로 상품명을 검색할 수 있으며, "
    "페이지네이션으로 탐색합니다."
), BODY))

story.append(Paragraph(m("4.2 상품 등록/수정"), H2))
story.append(Paragraph(m("상품 등록 시 필요한 필드:"), BODY))
story.append(make_table(
    ["필드", "필수", "설명"],
    [
        ["카테고리", "O", "의류/액세서리/앨범/포토카드/생활용품 중 선택"],
        ["상품명", "O", "최대 200자"],
        ["슬러그(URL)", "O", "영문 소문자, 숫자, 하이픈만 (예: summer-tshirt-01)"],
        ["기본가격", "O", "정가 (원 단위 정수, 부동소수점 금지)"],
        ["할인가", "-", "할인 적용 시 입력"],
        ["원가", "-", "원가 관리용 (고객에게 미노출)"],
        ["짧은 설명", "-", "목록에서 표시되는 한 줄 설명"],
        ["상세 설명", "-", "상세 페이지 하단에 표시"],
        ["태그", "-", "검색용 키워드 (배열)"],
        ["대표 이미지", "O", "is_primary=true인 이미지 1장 필수"],
        ["SEO 메타", "-", "metaTitle, metaDescription"],
    ],
    col_widths=[28*mm, 12*mm, W - 40*mm],
))

story.append(Paragraph(m("4.3 상품 상태"), H2))
story.append(make_table(
    ["상태", "설명", "고객 노출"],
    [
        ["DRAFT", "작성 중 (초안)", "미노출"],
        ["ACTIVE", "판매 중", "노출 + 구매 가능"],
        ["INACTIVE", "판매 중지", "미노출"],
        ["SOLDOUT", "품절", "노출 + '품절' 표시"],
    ],
    col_widths=[25*mm, 40*mm, W - 65*mm],
))

story.append(Paragraph(m("4.4 옵션 & SKU 체계"), H2))
story.append(Paragraph(m(
    "하나의 상품은 여러 옵션(예: 사이즈, 색상)을 가질 수 있습니다. "
    "옵션 조합마다 SKU(재고 관리 단위)가 생성되며, 각 SKU는 독립된 가격과 재고를 갖습니다."
), BODY))
story.append(Paragraph(m(
    "예시: 티셔츠 (옵션: 사이즈 M/L, 색상 블랙/화이트) = 4개 SKU"
), NOTE_STYLE))

story.append(Paragraph(m("4.5 재고 관리"), H2))
story.append(Paragraph(m("<bullet>&bull;</bullet> 각 SKU별로 quantity(총 재고)와 reserved(예약 수량)가 관리됩니다."), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 주문 생성 시 reserved가 증가하고, 결제 확정 시 quantity에서 차감됩니다."), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 주문 취소 시 자동으로 재고가 복원됩니다."), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 가용 재고 = quantity - reserved (이 값이 0 이하이면 품절 표시)"), BULLET))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 5. 주문 관리
# ═══════════════════════════════════════════════
story.append(Paragraph(m("5. 주문 관리"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(Paragraph(m("5.1 주문 상태 흐름"), H2))
story.append(make_table(
    ["상태", "한국어", "설명", "다음 가능 상태"],
    [
        ["PENDING_PAYMENT", "결제 대기", "주문 생성, 결제 전", "PAID / CANCELLED"],
        ["PAID", "결제 완료", "결제 확인 완료", "PREPARING / CANCELLED"],
        ["PREPARING", "상품 준비", "포장/출고 준비 중", "SHIPPING"],
        ["SHIPPING", "배송 중", "송장 등록 완료", "DELIVERED"],
        ["DELIVERED", "배송 완료", "고객 수령", "CONFIRMED / RETURN_REQUESTED"],
        ["CONFIRMED", "구매 확정", "최종 완료, 적립금 지급", "-"],
        ["CANCEL_REQUESTED", "취소 요청", "고객이 취소 요청", "CANCELLED"],
        ["CANCELLED", "취소 완료", "취소 처리 완료", "-"],
        ["RETURN_REQUESTED", "반품 요청", "수령 후 반품 요청", "RETURNED"],
        ["RETURNED", "반품 완료", "반품 처리 완료", "-"],
    ],
    col_widths=[30*mm, 18*mm, 35*mm, W - 83*mm],
))

story.append(Paragraph(m("5.2 주문 목록 (/admin/orders)"), H2))
story.append(Paragraph(m(
    "모든 주문을 테이블로 조회합니다. 주문번호, 고객명, 금액, 상태, 날짜가 표시되며, "
    "각 주문의 상태를 드롭다운으로 변경할 수 있습니다."
), BODY))

story.append(Paragraph(m("5.3 송장 등록"), H2))
story.append(Paragraph(m(
    "PAID 또는 PREPARING 상태의 주문에 대해 배송사와 송장번호를 입력하면, "
    "주문 상태가 자동으로 SHIPPING으로 변경됩니다."
), BODY))
story.append(Paragraph(m("<bullet>&bull;</bullet> 배송사 예시: CJ대한통운, 로젠택배, 한진택배 등"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 송장번호 입력 후 '등록' 버튼 클릭"), BULLET))

story.append(Paragraph(m("5.4 주문 취소 처리"), H2))
story.append(Paragraph(m(
    "고객이 상품준비 전(PENDING_PAYMENT, PAID) 상태에서 취소 요청 시 즉시 처리됩니다. "
    "취소 시 재고 복원, 쿠폰 복원, 적립금 복원이 자동으로 이루어집니다."
), BODY))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 6. 회원 관리
# ═══════════════════════════════════════════════
story.append(Paragraph(m("6. 회원 관리"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(Paragraph(m("6.1 회원 등급"), H2))
story.append(make_table(
    ["등급", "누적 구매액", "적립률", "비고"],
    [
        ["일반 (NORMAL)", "0원 ~", "1%", "기본 등급"],
        ["실버 (SILVER)", "10만원 ~", "2%", ""],
        ["골드 (GOLD)", "50만원 ~", "3%", ""],
        ["VIP", "100만원 ~", "5%", "최고 등급"],
    ],
    col_widths=[30*mm, 25*mm, 15*mm, W - 70*mm],
))

story.append(Paragraph(m("6.2 적립금 정책"), H2))
story.append(Paragraph(m("<bullet>&bull;</bullet> 기본 적립: 결제금액의 1~5% (등급별 상이)"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 포토리뷰 작성: 500원 적립"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 텍스트리뷰 작성: 200원 적립"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 최소 사용 금액: 1,000원 이상부터 사용 가능"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 유효기간: 발급일로부터 1년"), BULLET))

story.append(Paragraph(m("6.3 회원 목록 (/admin/users)"), H2))
story.append(Paragraph(m(
    "등록된 회원 목록을 이름/이메일로 검색할 수 있습니다. "
    "각 회원의 등급, 누적 구매액, 가입일을 확인할 수 있습니다."
), BODY))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 7. 쿠폰 관리
# ═══════════════════════════════════════════════
story.append(Paragraph(m("7. 쿠폰 관리"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(Paragraph(m("7.1 쿠폰 종류"), H2))
story.append(make_table(
    ["종류", "설명", "예시"],
    [
        ["정액 할인 (FIXED_AMOUNT)", "고정 금액 할인", "3,000원 할인"],
        ["정률 할인 (PERCENTAGE)", "주문금액의 %할인, 최대 할인 금액 설정 가능", "10% 할인 (최대 5,000원)"],
    ],
    col_widths=[35*mm, 50*mm, W - 85*mm],
))

story.append(Paragraph(m("7.2 쿠폰 생성 (/admin/coupons)"), H2))
story.append(Paragraph(m("쿠폰 생성 시 필요한 필드:"), BODY))
story.append(Paragraph(m("<bullet>&bull;</bullet> 쿠폰명: 관리/표시용 이름"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 쿠폰 코드: 고객이 입력할 코드 (선택 - 미입력 시 자동 발급 쿠폰)"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 할인 유형: 정액 / 정률"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 할인 값: 할인 금액(원) 또는 할인율(%)"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 최소 주문금액: 쿠폰 사용 가능한 최소 주문 금액"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 최대 할인금액: 정률 할인 시 상한"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 유효기간: 시작일 ~ 종료일"), BULLET))

story.append(Paragraph(m("7.3 쿠폰 정책"), H2))
story.append(Paragraph(m("<bullet>&bull;</bullet> 중복 사용 불가: 1주문 1쿠폰"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 적용 범위: 전체 / 카테고리 한정 / 상품 한정 / 등급 한정"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 고객은 마이페이지에서 쿠폰 코드를 등록하여 발급받을 수 있습니다."), BULLET))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 8. 리뷰 / Q&A 관리
# ═══════════════════════════════════════════════
story.append(Paragraph(m("8. 리뷰 / Q&A 관리"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(Paragraph(m("8.1 리뷰 관리 (/admin/reviews)"), H2))
story.append(Paragraph(m(
    "모든 리뷰를 목록으로 조회할 수 있습니다. 각 리뷰의 상품명, 작성자, 별점, 내용 미리보기, "
    "노출 상태를 확인하고, 부적절한 리뷰는 숨김 처리할 수 있습니다."
), BODY))
story.append(Paragraph(m("<bullet>&bull;</bullet> '표시/숨김' 토글 버튼으로 노출 상태를 변경합니다."), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 숨김 처리된 리뷰는 고객에게 표시되지 않습니다."), BULLET))

story.append(Paragraph(m("8.2 Q&A 답변"), H2))
story.append(Paragraph(m(
    "고객이 상품 페이지에서 문의한 Q&A에 답변을 등록할 수 있습니다. "
    "답변 등록 시 자동으로 '답변 완료' 상태로 변경됩니다."
), BODY))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 9. 배송 정책
# ═══════════════════════════════════════════════
story.append(Paragraph(m("9. 배송 정책"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(make_table(
    ["항목", "정책", "비고"],
    [
        ["기본 배송비", "3,000원", "모든 주문에 기본 적용"],
        ["무료배송 기준", "50,000원 이상 주문 시", "상품 합계 기준 (할인 전)"],
        ["도서산간 추가", "+3,000원", "도서산간 지역에 추가 적용"],
        ["배송업체", "추후 확정", "CJ대한통운/로젠 등 검토 중"],
    ],
    col_widths=[30*mm, 40*mm, W - 70*mm],
))

story.append(Spacer(1, 4*mm))
story.append(Paragraph(m(
    "배송비 계산은 서버에서 자동으로 처리되며, 주문서(체크아웃) 화면에서 "
    "고객이 실시간으로 확인할 수 있습니다."
), NOTE_STYLE))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 10. 환불/반품 정책
# ═══════════════════════════════════════════════
story.append(Paragraph(m("10. 환불/반품 정책"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(make_table(
    ["항목", "정책"],
    [
        ["반품 가능 기간", "수령 후 7일 이내"],
        ["단순변심 반품 배송비", "고객 부담 (왕복 6,000원)"],
        ["불량/오배송", "회사 부담, 즉시 처리"],
        ["환불 처리 기한", "반품 접수 후 영업일 3일 이내"],
        ["주문 취소 (상품준비 전)", "즉시 취소 가능 (자동)"],
        ["주문 취소 (상품준비 후)", "CS 접수를 통한 취소"],
    ],
    col_widths=[35*mm, W - 35*mm],
))

story.append(Spacer(1, 4*mm))
story.append(Paragraph(m(
    "환불 처리 시 결제 PG사(토스페이먼츠)를 통해 자동 환불됩니다. "
    "적립금/쿠폰도 자동 복원됩니다."
), BODY))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 11. 고객 쇼핑몰 기능 목록
# ═══════════════════════════════════════════════
story.append(Paragraph(m("11. 고객 쇼핑몰 기능 목록"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(Paragraph(m(
    "고객이 접속하는 쇼핑몰의 전체 페이지와 기능입니다. "
    "직접 사용해 보면서 부족한 부분이나 개선 사항을 확인해 주세요."
), BODY))

story.append(Paragraph(m("11.1 메인 페이지 & 네비게이션"), H2))
story.append(Paragraph(m("<bullet>&bull;</bullet> 랜딩 페이지 (/) — 추천 상품, 신상품, 배너"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 모바일 햄버거 메뉴 — 슬라이드 패널, 카테고리 5개 + 유틸 링크"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 다크/라이트 모드 토글 — 시스템 테마 자동 감지"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 검색, 장바구니, 마이페이지 아이콘"), BULLET))

story.append(Paragraph(m("11.2 카탈로그"), H2))
story.append(Paragraph(m("<bullet>&bull;</bullet> 카테고리 페이지 (/categories/[slug]) — 정렬(최신순/가격순), 페이지네이션"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 상품 상세 (/products/[slug]) — 이미지 갤러리, 옵션 선택, 수량, 재고 표시"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 장바구니 담기 / 바로 구매"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 품절 시 '입고 알림 신청' 버튼"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 리뷰 표시 (별점 + 내용 + 포토)"), BULLET))

story.append(Paragraph(m("11.3 장바구니 & 주문"), H2))
story.append(Paragraph(m("<bullet>&bull;</bullet> 장바구니 (/cart) — 수량 변경, 삭제, 합계 계산"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 체크아웃 (/checkout) — 배송지/쿠폰/적립금 선택, 결제 정보 확인, 토스페이먼츠 결제"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 비회원 장바구니 — Redis 기반, 로그인 시 자동 병합"), BULLET))

story.append(Paragraph(m("11.4 마이페이지"), H2))
story.append(Paragraph(m("<bullet>&bull;</bullet> /mypage — 내 정보 요약 (등급, 적립금, 쿠폰 수)"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> /mypage/orders — 주문 내역 + 주문 상세 (배송 추적)"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> /mypage/orders/[id] — 주문 취소, 환불 요청"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> /mypage/reviews — 내 리뷰 목록"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> /mypage/coupons — 내 쿠폰 + 코드 등록"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> /mypage/wishlist — 위시리스트"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> /mypage/addresses — 배송지 관리 (추가/삭제/기본 설정)"), BULLET))

story.append(Paragraph(m("11.5 회원 인증"), H2))
story.append(Paragraph(m("<bullet>&bull;</bullet> 회원가입 (/signup) — 이메일/비밀번호 + 소셜 로그인 (카카오/네이버/구글)"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 로그인 (/login) — 이메일/비밀번호 + 소셜 로그인"), BULLET))

story.append(Paragraph(m("11.6 기타"), H2))
story.append(Paragraph(m("<bullet>&bull;</bullet> 회사소개 (/about), 이용약관 (/terms), 개인정보처리방침 (/privacy), 교환/환불 안내 (/refund)"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> SEO: JSON-LD 구조화 데이터, Open Graph 메타태그, sitemap.xml, robots.txt"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 에러 페이지: 404, 500 에러 핸들링"), BULLET))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 12. 기술 운영 가이드
# ═══════════════════════════════════════════════
story.append(Paragraph(m("12. 기술 운영 가이드"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(Paragraph(m("12.1 배포 (Vercel)"), H2))
story.append(Paragraph(m(
    "GitHub의 메인 브랜치에 push하면 Vercel에서 자동 배포됩니다. "
    "PR을 생성하면 Preview 배포가 생성되어 사전 확인이 가능합니다."
), BODY))

story.append(Paragraph(m("12.2 환경 변수"), H2))
story.append(Paragraph(m("Vercel 대시보드 > Settings > Environment Variables에서 설정합니다:"), BODY))
story.append(make_table(
    ["변수명", "용도", "필수"],
    [
        ["DATABASE_URL", "PostgreSQL 연결 문자열 (GCP Cloud SQL)", "O"],
        ["UPSTASH_REDIS_REST_URL", "Upstash Redis HTTP URL", "O"],
        ["UPSTASH_REDIS_REST_TOKEN", "Upstash Redis 인증 토큰", "O"],
        ["NEXTAUTH_SECRET", "NextAuth 세션 암호화 키", "O"],
        ["NEXTAUTH_URL", "사이트 기본 URL", "O"],
        ["TOSS_SECRET_KEY", "토스페이먼츠 시크릿 키", "O"],
        ["NEXT_PUBLIC_TOSS_CLIENT_KEY", "토스페이먼츠 클라이언트 키", "O"],
        ["KAKAO_CLIENT_ID / SECRET", "카카오 소셜 로그인", "-"],
        ["NAVER_CLIENT_ID / SECRET", "네이버 소셜 로그인", "-"],
        ["GOOGLE_CLIENT_ID / SECRET", "구글 소셜 로그인", "-"],
    ],
    col_widths=[42*mm, 50*mm, W - 92*mm],
))

story.append(Paragraph(m("12.3 데이터베이스"), H2))
story.append(Paragraph(m("<bullet>&bull;</bullet> ORM: Prisma 6 — 스키마 파일: prisma/schema.prisma (30개 엔티티)"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 마이그레이션: 개발 시 prisma migrate dev, 운영 시 prisma migrate deploy"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 시드 데이터: pnpm db:seed (scripts/seed.ts)"), BULLET))

story.append(Paragraph(m("12.4 캐시 (Redis)"), H2))
story.append(Paragraph(m("<bullet>&bull;</bullet> Upstash Redis: HTTP 기반으로 Vercel Serverless에 최적"), BULLET))
story.append(Paragraph(m("<bullet>&bull;</bullet> 용도: 관리자 세션(8h TTL), 비회원 장바구니(7일), 대시보드 캐시(5분), 분산 락"), BULLET))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 13. 트러블슈팅
# ═══════════════════════════════════════════════
story.append(Paragraph(m("13. 트러블슈팅 & FAQ"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(make_table(
    ["증상", "원인", "해결 방법"],
    [
        ["관리자 로그인 실패 (429)", "15분 내 5회 이상 실패", "15분 대기 후 재시도"],
        ["관리자 로그인 후 바로 로그아웃됨", "Redis 연결 불량 또는 세션 TTL 초과", "Upstash 대시보드에서 Redis 상태 확인"],
        ["상품이 고객 페이지에 안 보임", "상태가 DRAFT/INACTIVE", "상품관리에서 ACTIVE로 변경"],
        ["주문 상태가 안 바뀜", "허용되지 않는 상태 전환", "상태 흐름도(5.1) 확인"],
        ["재고 부족 경고", "SKU 재고 <= 5", "상품관리에서 해당 SKU 재고 보충"],
        ["결제 실패", "토스페이먼츠 키 오류 또는 금액 불일치", "환경변수의 TOSS 키 확인"],
        ["빌드 에러 (Vercel)", "TypeScript 타입 에러 또는 의존성 문제", "Vercel 빌드 로그 확인"],
        ["이미지가 안 보임", "R2 스토리지 URL 또는 CORS 설정", "Cloudflare R2 콘솔 확인"],
    ],
    col_widths=[35*mm, 35*mm, W - 70*mm],
))

story.append(PageBreak())


# ═══════════════════════════════════════════════
# 14. 피드백 & 개선 요청
# ═══════════════════════════════════════════════
story.append(Paragraph(m("14. 피드백 & 개선 요청"), H1))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))

story.append(Paragraph(m(
    "아래 항목별로 사용해 보시고, 부족한 점이나 개선이 필요한 부분을 기록해 주세요. "
    "개발팀에 전달하여 우선순위를 정하고 반영하겠습니다."
), BODY))

story.append(Spacer(1, 4*mm))

feedback_items = [
    "고객 쇼핑몰 전체 플로우 (회원가입 > 상품 탐색 > 장바구니 > 주문 > 결제)",
    "마이페이지 기능 (주문 조회, 쿠폰, 위시리스트, 배송지)",
    "관리자 대시보드 정보 충분성",
    "상품 등록/수정 편의성",
    "주문 관리 워크플로우",
    "쿠폰 생성 및 관리",
    "모바일 반응형 디자인",
    "페이지 로딩 속도",
    "디자인/UI 일관성",
    "추가로 필요한 기능이나 페이지",
]

story.append(make_table(
    ["No.", "확인 항목", "상태", "피드백 메모"],
    [[str(i+1), item, "[ ]", ""] for i, item in enumerate(feedback_items)],
    col_widths=[10*mm, 55*mm, 15*mm, W - 80*mm],
))

story.append(Spacer(1, 8*mm))
story.append(Paragraph(m(
    "피드백 전달: 이 문서에 직접 메모하시거나, 별도 문서로 정리해서 개발팀에 공유해 주세요."
), NOTE_STYLE))

story.append(Spacer(1, 15*mm))
story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_COLOR))
story.append(Spacer(1, 4*mm))
story.append(Paragraph(m(
    f"Parable Mall 관리자 핸드북 v1.0 | {datetime.now().strftime('%Y.%m.%d')} | Parable-ENT"
), END_MARK))


# ─────────────────────────────────────────────
# PDF 빌드
# ─────────────────────────────────────────────
doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
print(f"PDF generated: {OUTPUT_PATH}")
