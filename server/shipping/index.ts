import { z } from 'zod';

import { prisma } from '@/lib/db';
import { getTrackingUrl } from '@/lib/shipping/sweettracker';

export const registerShipmentSchema = z.object({
  orderId: z.string(),
  carrier: z.string().min(1),
  trackingNo: z.string().min(1),
});

export async function registerShipment(input: z.infer<typeof registerShipmentSchema>) {
  const data = registerShipmentSchema.parse(input);

  const order = await prisma.order.findUnique({ where: { id: data.orderId } });
  if (!order || !['PAID', 'PREPARING'].includes(order.status)) {
    throw new Error('송장을 등록할 수 없는 주문 상태입니다.');
  }

  const trackingUrl = getTrackingUrl(data.carrier, data.trackingNo);

  const shipment = await prisma.shipment.create({
    data: {
      orderId: data.orderId,
      carrier: data.carrier,
      trackingNo: data.trackingNo,
      trackingUrl,
      status: 'SHIPPED',
      shippedAt: new Date(),
    },
  });

  await prisma.order.update({
    where: { id: data.orderId },
    data: { status: 'SHIPPING' },
  });

  return shipment;
}

export async function updateDeliveryStatus(shipmentId: string, isDelivered: boolean) {
  const shipment = await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      status: isDelivered ? 'DELIVERED' : 'IN_TRANSIT',
      deliveredAt: isDelivered ? new Date() : null,
    },
  });

  if (isDelivered) {
    await prisma.order.update({
      where: { id: shipment.orderId },
      data: { status: 'DELIVERED' },
    });
  }

  return shipment;
}
