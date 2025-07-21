import https from 'https';

export interface SumUpCheckoutData {
  checkout_reference: string;
  amount: number;
  currency: string;
  pay_to_email: string;
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

/**
 * Helper function for making HTTP requests to SumUp API
 */
export function makeHttpRequest(options: https.RequestOptions, postData: string | null = null): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`SumUp API error: ${JSON.stringify(responseData)}`));
          }
        } catch (error) {
          reject(new Error(`Error parsing response: ${(error as Error).message}`));
        }
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
 * Get SumUp access token for API authentication
 */
export async function getSumupAccessToken(): Promise<string> {
  const postData = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.SUMUP_CLIENT_ID || '',
    client_secret: process.env.SUMUP_CLIENT_SECRET || ''
  }).toString();

  const options: https.RequestOptions = {
    hostname: 'api.sumup.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  };

  try {
    const responseData = await makeHttpRequest(options, postData);
    if (responseData.access_token) {
      return responseData.access_token;
    } else {
      throw new Error(`Failed to get access token: ${JSON.stringify(responseData)}`);
    }
  } catch (error) {
    console.error('Error getting SumUp access token:', error);
    throw error;
  }
}

/**
 * Create SumUp checkout
 */
export async function createSumUpCheckout(
  orderId: number,
  amount: number,
  description: string
): Promise<SumUpCheckoutResponse> {
  const accessToken = await getSumupAccessToken();
  
  // Create a unique reference by adding a timestamp and a random string
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const uniqueReference = `ORDER-${orderId}-${timestamp}-${randomStr}`;
  console.log(`Creating checkout with reference: ${uniqueReference}`);
  
  // Define the redirect URL
  const frontendBaseUrl = process.env['FRONTEND_URL'] || 'https://example.com';
  const redirectUrl = `${frontendBaseUrl}/order-confirmation`;
  console.log(`Setting redirect URL: ${redirectUrl}`);

  // Prepare checkout data
  const checkoutData: SumUpCheckoutData = {
    checkout_reference: uniqueReference,
    amount: amount,
    currency: 'EUR',
    pay_to_email: process.env['SUMUP_MERCHANT_EMAIL'] || '',
    description: description,
    hosted_checkout: { enabled: true },
    redirect_url: redirectUrl,
    custom_fields: {
      order_id: orderId.toString()
    }
  };

  console.log('Checkout request data:', JSON.stringify(checkoutData, null, 2));

  const options: https.RequestOptions = {
    hostname: 'api.sumup.com',
    path: '/v0.1/checkouts',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };

  return await makeHttpRequest(options, JSON.stringify(checkoutData));
}

/**
 * Get SumUp checkout status
 */
export async function getSumUpCheckoutStatus(checkoutId: string): Promise<any> {
  const accessToken = await getSumupAccessToken();
  
  const options: https.RequestOptions = {
    hostname: 'api.sumup.com',
    path: `/v0.1/checkouts/${checkoutId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };

  return await makeHttpRequest(options);
}

/**
 * Test SumUp connection
 */
export async function testSumUpConnection(): Promise<{ success: boolean; message: string; token_prefix?: string; error?: string }> {
  try {
    const accessToken = await getSumupAccessToken();
    return {
      success: true,
      message: 'SumUp connection successful',
      token_prefix: accessToken.substring(0, 5) + '...'
    };
  } catch (error) {
    console.error('Error testing SumUp connection:', error);
    return {
      success: false,
      message: 'Error connecting to SumUp',
      error: (error as Error).message
    };
  }
}

/**
 * Get SumUp merchant profile
 */
export async function getSumUpMerchantProfile(): Promise<any> {
  const accessToken = await getSumupAccessToken();
  
  const options: https.RequestOptions = {
    hostname: 'api.sumup.com',
    path: '/v0.1/me',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };

  const profileData = await makeHttpRequest(options);
  console.log('SumUp Merchant Profile:', profileData);
  
  return {
    success: true,
    profile: profileData,
    merchant_code: profileData.merchant_profile?.merchant_code,
    merchant_email: profileData.personal_profile?.email,
    message: 'You should set these values in your environment variables'
  };
} 