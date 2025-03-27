'use client'

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Declare types for the SumUp SDK
declare global {
  interface Window {
    SumUpCard: {
      mount: (config: {
        id: string;
        checkoutId: string;
        onResponse: (type: string, body: any) => void;
      }) => void;
    };
    sumupCardCallback?: () => void;
  }
}

export default function PaymentPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  // const checkoutId = searchParams.get('checkoutId');
  const checkoutId = 'demo';
  useEffect(() => {
    console.log('PaymentPage mounted, checkoutId:', checkoutId);
    if (!checkoutId) {
      setError('No checkout ID provided');
      setIsLoading(false);
      return;
    }

    const loadSumUpScript = () => {
      const script = document.createElement('script');
      script.src = 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js';
      script.async = true;
      script.onload = () => {
        console.log('SumUp SDK script loaded manually');
        initializePayment();
      };
      script.onerror = () => {
        console.error('Failed to load SumUp SDK script manually');
        setError('Failed to load payment system');
      };
      document.body.appendChild(script);
    };

    const initializePayment = () => {
      console.log('Initializing payment...');
      if (typeof window.SumUpCard !== 'undefined') {
        console.log('SumUpCard is defined, mounting...');
        window.SumUpCard.mount({
          id: 'sumup-card',
          checkoutId: checkoutId,
          onResponse: function (type: string, body: any) {
            console.log('Type:', type);
            console.log('Body:', body);
            if (type === 'success') {
              const amount = searchParams.get('amount') || '0';
              const points = searchParams.get('points') || '0';
              router.push(`/order-confirmation?status=success&amount=${amount}&points=${points}`);
            } else {
              console.log('Payment failed:', body);
              router.push('/order-confirmation?status=failure');
            }
          },
        });
        setIsLoading(false);
      } else {
        console.error('SumUpCard is not defined');
        setError('Payment system not loaded');
      }
    };

    const checkSumUpLoaded = () => {
      if (typeof window.SumUpCard !== 'undefined') {
        console.log('SumUpCard is now defined');
        initializePayment();
      } else {
        console.log('SumUpCard still not defined, retrying...');
        setTimeout(checkSumUpLoaded, 1000); // Check again after 1 second
      }
    };

    loadSumUpScript();
    setTimeout(checkSumUpLoaded, 2000); // Start checking after 2 seconds
  }, [checkoutId, searchParams, router]);

  if (isLoading) return <div>Loading payment form...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Complete Your Payment</h1>
      <div id="sumup-card"></div>
    </div>
  );
}
