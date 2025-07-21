'use client'

import { useBasket, BasketItem } from './BasketContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';

export function Checkout() {
  const { basket, clearBasket, getTotalPrice } = useBasket();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const total = getTotalPrice();

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    setError(null);
    const token = localStorage.getItem('token');

    if (!token) {
      setError("You must be logged in to place an order.");
      setIsProcessing(false);
      return;
    }

    try {
      // Step 1: Create the order with detailed items
      const orderPayload = {
        items: basket.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.unitPrice,
          customizations: item.customizations || {}
        })),
        total: total
      };

      const orderResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({ error: `HTTP error ${orderResponse.status}` }));
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();
      console.log('Order creation response:', orderData);
      
      // Handle new API response structure
      const createdOrderId = orderData.data?.order?.id || orderData.order?.id || orderData.id;
      
      if (!createdOrderId) {
        console.error('Failed to extract order ID from response:', orderData);
        throw new Error('Order creation failed - no order ID returned');
      }

      // Step 1.5: Store orderId in sessionStorage BEFORE redirecting to SumUp
      sessionStorage.setItem('pendingOrderId', createdOrderId.toString());
      console.log(`Stored pendingOrderId: ${createdOrderId} in sessionStorage`);

      // Step 2: Initiate SumUp checkout - FIXED ROUTE
      const initiateCheckoutResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payment/initiate-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: createdOrderId }),
      });

      if (!initiateCheckoutResponse.ok) {
        const errorData = await initiateCheckoutResponse.json().catch(() => ({ error: `HTTP error ${initiateCheckoutResponse.status}` }));
        throw new Error(errorData.error || 'Failed to initiate checkout process');
      }

      const checkoutData = await initiateCheckoutResponse.json();
      
      // Handle both old and new response formats
      const sumupCheckoutUrl = checkoutData.checkoutUrl || checkoutData.data?.checkoutUrl;

      if (!sumupCheckoutUrl) {
          throw new Error('SumUp checkout URL not received from backend.');
      }

      // Step 3: Redirect directly to SumUp's hosted payment page
      console.log(`Redirecting to SumUp hosted page: ${sumupCheckoutUrl}`);
      window.location.href = sumupCheckoutUrl; // Use window.location.href for external redirect

      // Clear the basket only after successful initiation
      // Note: Basket clearing might happen before payment confirmation with this flow.
      // Consider moving clearBasket() to the order confirmation page upon successful verification.
      clearBasket();

    } catch (err) {
      console.error('Error placing order:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to render customizations cleanly
  const renderCustomizations = (item: BasketItem) => {
    if (!item.customizations || Object.keys(item.customizations).length === 0) {
      return null;
    }

    const { extras = [], sauces = [], toppings = [] } = item.customizations;
    const allCustomizations = [...extras, ...sauces, ...toppings];

    if (allCustomizations.length === 0) return null;

    return (
      <p className="text-xs text-gray-400 ml-2">({allCustomizations.join(', ')})</p>
    );
  };

  return (
    <Card className="w-full max-w-md bg-gray-950 border border-yellow-400/30 text-white">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-yellow-400">Your Order</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {basket.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Your basket is empty.</p>
        ) : (
          <ul className="mb-4 space-y-3">
            {basket.map((item) => (
              <li key={item.cartItemId} className="flex justify-between items-start text-sm text-white">
                <div className="flex items-center">
                  <span>{item.name} x {item.quantity}</span>
                  {renderCustomizations(item)}
                </div>
                <span>€{(item.unitPrice * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
        {basket.length > 0 && (
          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center font-bold text-yellow-400 text-lg">
              <span>Total:</span>
              <span>€{total.toFixed(2)}</span>
            </div>
          </div>
        )}
        {error && (
            <Alert variant="destructive" className="mt-4">
                <AlertTitle>Order Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Button
          onClick={handlePlaceOrder}
          disabled={isProcessing || basket.length === 0}
          className="w-full disabled:opacity-50 text-lg py-3"
        >
          {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          {isProcessing ? 'Processing...' : 'Proceed to Payment'}
        </Button>
      </CardFooter>
    </Card>
  );
}
