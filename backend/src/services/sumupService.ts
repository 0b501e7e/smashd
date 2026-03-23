import https from 'https';

export interface SumUpCheckoutData {
  checkout_reference: string;
  amount: number;
  currency: string;
  merchant_code?: string;
  pay_to_email?: string;
  description: string;
  hosted_checkout: { enabled: boolean };
  redirect_url: string;
  custom_fields: { order_id: string };
}

export interface SumUpCheckoutResponse {
  id: string;
  hosted_checkout_url: string;
  status: string;
}

export class SumUpApiError extends Error {
  statusCode: number | undefined;
  responseData: unknown;
  rawBody: string | undefined;

  constructor(message: string, options?: { statusCode?: number | undefined; responseData?: unknown; rawBody?: string | undefined }) {
    super(message);
    this.name = 'SumUpApiError';
    this.statusCode = options?.statusCode;
    this.responseData = options?.responseData;
    this.rawBody = options?.rawBody;
  }
}

function parseJsonBody(body: string): unknown {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function getApiKey(): string {
  const key = process.env['SUMUP_API_KEY'];
  if (!key) throw new Error('SUMUP_API_KEY is not set');
  return key;
}

function getPaymentRedirectUrl(): string {
  const redirectBaseUrl =
    process.env['PAYMENT_REDIRECT_BASE_URL'] ||
    process.env['FRONTEND_URL'] ||
    'https://example.com';

  return `${redirectBaseUrl.replace(/\/+$/, '')}/order-confirmation`;
}

/**
 * Helper function for making HTTP requests to SumUp API
 */
export function makeHttpRequest(options: https.RequestOptions, postData: string | null = null): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const responseData = parseJsonBody(data);

        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseData);
          return;
        }

        reject(new SumUpApiError('SumUp API request failed', {
          statusCode: res.statusCode,
          responseData,
          rawBody: data
        }));
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

/**
 * Create SumUp checkout
 */
export async function createSumUpCheckout(
  orderId: number,
  amount: number,
  description: string
): Promise<SumUpCheckoutResponse> {
  const apiKey = getApiKey();
  const normalizedAmount = Math.round((amount + Number.EPSILON) * 100) / 100;

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const uniqueReference = `ORDER-${orderId}-${timestamp}-${randomStr}`;
  console.log(`SumUp: Creating checkout for order ${orderId} with reference ${uniqueReference}`);

  const redirectUrl = getPaymentRedirectUrl();
  console.log(`SumUp: Using redirect URL ${redirectUrl}`);

  const checkoutData: SumUpCheckoutData = {
    checkout_reference: uniqueReference,
    amount: normalizedAmount,
    currency: 'EUR',
    description,
    hosted_checkout: { enabled: true },
    redirect_url: redirectUrl,
    custom_fields: {
      order_id: orderId.toString()
    }
  };

  if (process.env['SUMUP_MERCHANT_CODE']) {
    checkoutData.merchant_code = process.env['SUMUP_MERCHANT_CODE'];
  }

  if (process.env['SUMUP_MERCHANT_EMAIL']) {
    checkoutData.pay_to_email = process.env['SUMUP_MERCHANT_EMAIL'];
  }

  console.log('SumUp: Checkout request summary:', {
    orderId,
    amount: checkoutData.amount,
    currency: checkoutData.currency,
    merchantCode: checkoutData.merchant_code,
    payToEmail: checkoutData.pay_to_email,
    checkoutReference: checkoutData.checkout_reference
  });

  const options: https.RequestOptions = {
    hostname: 'api.sumup.com',
    path: '/v0.1/checkouts',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeHttpRequest(options, JSON.stringify(checkoutData));
    console.log('SumUp: Checkout created successfully:', {
      orderId,
      checkoutId: response?.id,
      status: response?.status,
      hostedCheckoutUrl: response?.hosted_checkout_url
    });
    return response;
  } catch (error) {
    if (error instanceof SumUpApiError) {
      console.error('SumUp: Checkout creation failed:', {
        orderId,
        amount: normalizedAmount,
        checkoutReference: uniqueReference,
        statusCode: error.statusCode,
        responseData: error.responseData,
        rawBody: error.rawBody
      });
    }
    throw error;
  }
}

/**
 * Get SumUp checkout status
 */
export async function getSumUpCheckoutStatus(checkoutId: string): Promise<any> {
  const apiKey = getApiKey();

  const options: https.RequestOptions = {
    hostname: 'api.sumup.com',
    path: `/v0.1/checkouts/${checkoutId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeHttpRequest(options);
    console.log('SumUp: Checkout status fetched:', {
      checkoutId,
      status: response?.status,
      amount: response?.amount,
      checkoutReference: response?.checkout_reference
    });
    return response;
  } catch (error) {
    if (error instanceof SumUpApiError) {
      console.error('SumUp: Failed to fetch checkout status:', {
        checkoutId,
        statusCode: error.statusCode,
        responseData: error.responseData,
        rawBody: error.rawBody
      });
    }
    throw error;
  }
}

/**
 * Test SumUp connection
 */
export async function testSumUpConnection(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    getApiKey(); // throws if not set
    return {
      success: true,
      message: 'SumUp API key is configured'
    };
  } catch (error) {
    return {
      success: false,
      message: 'SUMUP_API_KEY is not configured',
      error: (error as Error).message
    };
  }
}
