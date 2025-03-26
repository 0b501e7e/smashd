'use client'

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/card"

export default function OrderConfirmation() {
  const [status, setStatus] = useState<'success' | 'failure' | 'pending'>('pending');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const searchParams = useSearchParams();

  useEffect(() => {
    const paymentStatus = searchParams.get('status');
    const amount = parseFloat(searchParams.get('amount') || '0');
    
    if (paymentStatus === 'success') {
      setStatus('success');
      // Calculate loyalty points: 1 point for every euro spent, rounded down
      const pointsEarned = Math.floor(amount);
      setLoyaltyPoints(pointsEarned);
    } else if (paymentStatus === 'failure') {
      setStatus('failure');
    }
  }, [searchParams]);

  if (status === 'pending') {
    return <div>Checking order status...</div>;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-yellow-950 border-yellow-400/20">
        <CardHeader>
          <CardTitle className="text-yellow-400">
            {status === 'success' ? 'Order Confirmed!' : 'Order Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'success' ? (
            <>
              <p className="text-white mb-4">Thank you for your order. Your payment was successful.</p>
              <p className="text-white">You earned {loyaltyPoints} loyalty points with this purchase!</p>
            </>
          ) : (
            <p className="text-white">We&apos;re sorry, but there was an issue with your payment. Please try again.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
