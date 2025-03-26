'use client'

import { useBasket } from './BasketContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/card"
import { Button } from "@/app/components/button"

export function Checkout() {
  const { basket, clearBasket } = useBasket();
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const total = basket.reduce((sum, item) => sum + item.price, 0);

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    try {
      // Step 1: Create the order
      const orderResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: basket.map(item => ({
            menuItemId: item.id,
            quantity: 1,
            price: item.price
          })),
          total: total
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const orderData = await orderResponse.json();

      // Step 2: Initiate checkout
      const checkoutResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/initiate-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderData.order.id
        }),
      });

      if (!checkoutResponse.ok) {
        throw new Error('Failed to initiate checkout');
      }

      const checkoutData = await checkoutResponse.json();

      // Step 3: Redirect to payment page
      router.push(`/payment?checkoutId=${checkoutData.checkoutId}&orderId=${checkoutData.orderId}`);

      // Clear the basket
      clearBasket();

    } catch (error) {
      console.error('Error placing order:', error);
      alert('There was an error placing your order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-yellow-950 border-yellow-400/20">
      <CardHeader>
        <CardTitle className="text-yellow-400">Your Order</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="mb-4 text-white">
          {basket.map((item, index) => (
            <li key={index} className="flex justify-between items-center mb-2">
              <span>{item.name}</span>
              <span>€{item.price.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-yellow-400/20 pt-4">
          <div className="flex justify-between items-center font-bold text-yellow-400">
            <span>Total:</span>
            <span>€{total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handlePlaceOrder} 
          disabled={isProcessing || basket.length === 0}
          className="w-full bg-yellow-400 text-black hover:bg-yellow-500 disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Place Order'}
        </Button>
      </CardFooter>
    </Card>
  );
}
