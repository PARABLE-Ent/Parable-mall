// 스마트택배 (Sweet Tracker) API 연동
// API 문서: https://tracking.sweettracker.co.kr/

const SWEET_TRACKER_API = 'https://info.sweettracker.co.kr/api/v1';

export interface TrackingInfo {
  carrier: string;
  trackingNo: string;
  status: string;
  steps: Array<{
    time: string;
    location: string;
    status: string;
    description: string;
  }>;
  isDelivered: boolean;
}

// 배송사 코드 매핑
const CARRIER_CODES: Record<string, string> = {
  CJ대한통운: '04',
  로젠택배: '06',
  우체국택배: '01',
  한진택배: '05',
  롯데택배: '08',
};

export function getCarrierCode(carrier: string): string | undefined {
  return CARRIER_CODES[carrier];
}

export async function getTrackingInfo(
  carrier: string,
  trackingNo: string,
): Promise<TrackingInfo | null> {
  const apiKey = process.env.SWEET_TRACKER_API_KEY;
  if (!apiKey) {
    // 개발 환경에서는 목업 반환
    return {
      carrier,
      trackingNo,
      status: 'IN_TRANSIT',
      steps: [
        {
          time: new Date().toISOString(),
          location: '서울 강남구',
          status: '배송중',
          description: '배달 출발',
        },
      ],
      isDelivered: false,
    };
  }

  const carrierCode = getCarrierCode(carrier);
  if (!carrierCode) return null;

  const response = await fetch(
    `${SWEET_TRACKER_API}/trackingInfo?t_key=${apiKey}&t_code=${carrierCode}&t_invoice=${trackingNo}`,
  );

  if (!response.ok) return null;

  const data = await response.json();
  if (data.result !== 'Y') return null;

  return {
    carrier,
    trackingNo,
    status: data.completeYN === 'Y' ? 'DELIVERED' : 'IN_TRANSIT',
    steps: (data.trackingDetails ?? []).map(
      (detail: { timeString: string; where: string; kind: string; telno: string }) => ({
        time: detail.timeString,
        location: detail.where,
        status: detail.kind,
        description: detail.kind,
      }),
    ),
    isDelivered: data.completeYN === 'Y',
  };
}

export function getTrackingUrl(carrier: string, trackingNo: string): string {
  const carrierCode = getCarrierCode(carrier);
  return `https://info.sweettracker.co.kr/tracking/5?t_code=${carrierCode ?? ''}&t_invoice=${trackingNo}`;
}
