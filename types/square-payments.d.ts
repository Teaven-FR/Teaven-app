declare module 'react-native-square-in-app-payments' {
  interface CardDetails {
    nonce: string;
    card: {
      brand: string;
      lastFourDigits: string;
      expirationMonth: number;
      expirationYear: number;
    };
  }

  interface CardEntryConfig {
    collectPostalCode?: boolean;
  }

  interface ApplePayConfig {
    price: string;
    summaryLabel: string;
    countryCode: string;
    currencyCode: string;
    paymentType?: number;
  }

  export const SQIPCardEntry: {
    setSquareApplicationId(appId: string): Promise<void>;
    startCardEntryFlow(config: CardEntryConfig): Promise<CardDetails>;
    completeCardEntry(callback: () => void): Promise<void>;
    cancelCardEntry(): Promise<void>;
  };

  export const SQIPApplePay: {
    requestApplePayNonce(
      config: ApplePayConfig,
      onSuccess: (cardDetails: CardDetails) => void,
      onError: () => void,
    ): Promise<void>;
    completeApplePayAuthorization(success: boolean): Promise<void>;
  };
}
