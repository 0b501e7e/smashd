'use client'

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Confetti from 'react-confetti';
import { formatCurrency } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from 'framer-motion';

// Define a type for the order details we expect
interface OrderDetails {
  id: number;
  status: string;
  total: number;
  items: { name: string; quantity: number; price: number; customizations?: any }[]; // Add more details if needed
  // Add other fields returned by the verify endpoint if necessary
}

// More detailed Skeleton component
function OrderConfirmationSkeleton() {
  return (
    <Card className="w-full max-w-lg bg-gray-950 border-yellow-400/30 animate-pulse">
      <CardHeader>
        <Skeleton className="h-7 w-3/5 mb-2 bg-gray-700" />
        <Skeleton className="h-5 w-1/4 bg-gray-700" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full bg-gray-700" />
        <Skeleton className="h-4 w-5/6 bg-gray-700" />
        <div className="pt-3 border-t border-border mt-4">
          <Skeleton className="h-5 w-1/3 mb-3 bg-gray-700" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full bg-gray-700" />
            <Skeleton className="h-4 w-full bg-gray-700" />
          </div>
          <Skeleton className="h-6 w-1/4 mt-3 bg-gray-700" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Skeleton className="h-10 w-full sm:w-1/2 bg-gray-700 rounded-md" />
          <Skeleton className="h-10 w-full sm:w-1/2 bg-primary rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrderConfirmation() {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // Get orderId from sessionStorage
    const storedOrderId = sessionStorage.getItem('pendingOrderId');
    console.log('OrderConfirmation mounted, retrieved orderId from sessionStorage:', storedOrderId);

    if (storedOrderId) {
        setOrderId(storedOrderId);
        // Don't remove from sessionStorage yet - only remove after successful verification
    } else {
         setError('Could not retrieve order details. Session may have expired.');
         setIsLoading(false);
         return;
    }

    // Dependency array now includes the state `orderId`
  }, []); // Run only once on mount to get orderId

  useEffect(() => {
    // This effect runs when the `orderId` state is set
    if (!orderId) {
      // If orderId is null even after the first effect, something is wrong
      // (Error state should already be set by the first effect)
      return;
    }

    const verifyAndFetchOrder = async () => {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      try {
        // Call the backend to verify payment and get updated order status
        const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${orderId}/verify-payment`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!verifyResponse.ok) {
           const errorData = await verifyResponse.json().catch(() => ({})); // Attempt to parse error
           throw new Error(errorData.error || `Verification failed (${verifyResponse.status})`);
        }

        const response = await verifyResponse.json();
        console.log('Order verification response received:', response); // Debug log
        
        // Extract the actual order data from the API response structure
        const data: OrderDetails = response.data || response;
        console.log('Order verification data extracted:', data); // Debug log
        setOrderDetails(data);

        // Remove orderId from sessionStorage after successful verification
        sessionStorage.removeItem('pendingOrderId');

        // Trigger confetti if payment was successful
        if (data.status === 'PAID' || data.status === 'PAYMENT_CONFIRMED') {
            setShowConfetti(true);
            // Optional: Hide confetti after a few seconds
            setTimeout(() => setShowConfetti(false), 8000);
        }

      } catch (err) {
        console.error('Error verifying order:', err);
        setError(err instanceof Error ? err.message : 'Failed to verify order status.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyAndFetchOrder();
  }, [orderId]); // Now depends on the orderId state

  const renderContent = () => {
    if (isLoading) {
      // Use the detailed skeleton component
      return <OrderConfirmationSkeleton />;
    }

    if (error) {
      // Use Alert for error state
      return (
         <Alert variant="destructive" className="max-w-lg">
            <AlertTitle>Error Verifying Order</AlertTitle>
            <AlertDescription>
                <p>{error}</p>
                <p className="mt-2 text-sm">Please check your order history or contact support if the problem persists.</p>
                <Link href="/profile" className="mt-4 inline-block">
                    {/* Use destructive_outline or similar if defined, otherwise outline */}
                    <Button variant="outline" size="sm">Go to Order History</Button>
                 </Link>
            </AlertDescription>
        </Alert>
      );
    }

    if (!orderDetails) {
      // Fallback if orderDetails is null
       return (
         // Change variant from secondary to default
         <Alert variant="default" className="max-w-lg bg-gray-800 border-gray-600 text-gray-300"> { /* Optional: Add custom subtle styling */}
            <AlertTitle className="text-yellow-300">Order Not Found</AlertTitle>
            <AlertDescription>
                Could not load order details.
                 <Link href="/profile" className="mt-4 inline-block">
                    <Button variant="outline" size="sm">Go to Order History</Button>
                 </Link>
            </AlertDescription>
        </Alert>
      );
    }

    // Determine status styling
    let title = "We've received your order!";
    let message = "Your order is being prepared. You can track its status in your order history.";
    let titleColor = "text-yellow-300"; // Default to yellow

    if (orderDetails.status === 'PAID') {
      title = "Payment Successful!";
      message = "Thank you for your order! We'll get it ready for you shortly.";
      titleColor = "text-green-400";
    } else if (orderDetails.status === 'PAYMENT_FAILED' || orderDetails.status === 'EXPIRED') {
      title = "Payment Issue";
      message = "There was an issue with the payment for this order. Please check your payment method or contact support.";
      titleColor = "text-orange-400"; // Use orange for failure
    }

    return (
      // Update card styling
      <Card className="w-full max-w-lg bg-gray-950 border-yellow-400/30 shadow-lg shadow-yellow-600/10">
        <CardHeader className="pb-4 border-b border-border"> {/* Added border */}
          <CardTitle className={`text-2xl font-bold ${titleColor}`}>{title}</CardTitle>
          <p className="text-gray-400 text-sm pt-1">Order #{orderDetails.id}</p>
        </CardHeader>
        <CardContent className="p-6 space-y-4"> {/* Added padding */}
          <p className="text-gray-200">{message}</p>
          {/* Update Order Summary styles */}
          <div className="pt-4 border-t border-border">
              <h4 className="font-semibold mb-2 text-yellow-300">Order Summary:</h4>
              <ul className="text-sm text-gray-300 space-y-1 mb-3">
                  {(orderDetails.items || []).map((item, index) => (
                      <li key={index}>{item.quantity} x {item.name}</li>
                  ))}
              </ul>
              <p className="font-bold text-lg text-white">Total: {formatCurrency(Number(orderDetails.total) || 0)}</p>
          </div>
          {/* Update Button styles */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link href="/" className='w-full sm:w-auto'>
                 {/* Keep outline, ensure theme colors apply */}
                <Button variant="outline" className="w-full">Continue Shopping</Button>
              </Link>
              <Link href="/profile" className='w-full sm:w-auto'>
                 {/* Change to default (primary) variant */}
                <Button variant="default" className="w-full">View Order History</Button>
              </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        {showConfetti && <Confetti recycle={false} numberOfPieces={300} width={typeof window !== 'undefined' ? window.innerWidth : 0} height={typeof window !== 'undefined' ? window.innerHeight : 0} />}
        {/* Animate the content appearance */}        
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            {renderContent()}
        </motion.div>
    </div>
  );
}
