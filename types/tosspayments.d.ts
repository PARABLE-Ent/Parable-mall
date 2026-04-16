declare module '@tosspayments/payment-sdk' {
  interface TossPaymentsInstance {
    requestPayment(
      method: string,
      params: {
        amount: number;
        orderId: string;
        orderName: string;
        successUrl: string;
        failUrl: string;
      },
    ): Promise<void>;
  }

  export function loadTossPayments(clientKey: string): Promise<TossPaymentsInstance>;
}
