'use client'

import { useState } from 'react';
import { useBasket } from './BasketContext';
import Link from 'next/link';

export function BasketButton() {
  const { basket } = useBasket();
  const [isBasketVisible, setIsBasketVisible] = useState(false);

  const toggleBasketVisibility = () => {
    setIsBasketVisible(!isBasketVisible);
  };

  const total = basket.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="relative">
      <button 
        onClick={toggleBasketVisibility} 
        className="relative z-10 bg-white text-black px-4 py-2 rounded-full"
      >
        Basket ({basket.length})
      </button>
      {isBasketVisible && (
        <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-lg overflow-hidden z-20">
          <ul className="max-h-64 overflow-y-auto">
            {basket.map((item, index) => (
              <li key={index} className="p-2 border-b border-gray-200 text-black">
                {item.name} - €{item.price.toFixed(2)}
              </li>
            ))}
          </ul>
          <div className="p-2 bg-gray-100">
            <div className="font-bold text-black mb-2">
              Total: €{total.toFixed(2)}
            </div>
            {basket.length > 0 && (
              <Link 
                href="/checkout" 
                className="block w-full text-center bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition duration-300"
              >
                Proceed to Checkout
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}