# SumUp Payment Integration

This document outlines how the SumUp React Native SDK is integrated into our application.

## Overview

We use the SumUp React Native SDK (`sumup-react-native-alpha`) to provide a native payment experience for our customers. The SDK provides a payment sheet that allows customers to enter their payment details and process payments.

## Dependencies

The following dependencies are required:

```bash
# Main SumUp SDK
npm install sumup-react-native-alpha

# Required dependencies
npm install react-native-webview
npm install react-native-localization
```

## Implementation

### 1. SumUp Provider Setup

The application wraps the main component tree with the `SumUpProvider` to initialize the SDK:

```tsx
// app/providers/SumUpProvider.tsx
import React, { ReactNode } from 'react';
import { SumUpProvider as SUProvider } from 'sumup-react-native-alpha';

const SUMUP_API_KEY = process.env.EXPO_PUBLIC_SUMUP_API_KEY || 'sup_sk_your_key_here';

export function SumUpProvider({ children }: { children: ReactNode }) {
  return (
    <SUProvider publicKey={SUMUP_API_KEY}>
      {React.createElement(React.Fragment, null, children)}
    </SUProvider>
  );
}
```

### 2. Backend Checkout Creation

When a customer initiates a payment, the app calls the backend to create a checkout:

```typescript
// app/services/sumupService.ts
createCheckout: async (orderId: number) => {
  const response = await api.post('/v1/initiate-checkout', { orderId });
  return response.data; // Returns { checkoutId, ... }
}
```

### 3. Payment Flow

The payment screen follows this flow:

1. Create a checkout on the backend
2. Initialize the SumUp payment sheet with the checkout ID
3. Present the payment sheet to the user
4. Handle the payment result

```tsx
// Simplified example from app/app/payment.tsx
const { initPaymentSheet, presentPaymentSheet } = useSumUp();

// Step 1: Create checkout
const checkout = await sumupService.createCheckout(orderId);

// Step 2: Initialize payment sheet
await initPaymentSheet({
  checkoutId: checkout.checkoutId,
  language: 'en',
});

// Step 3: Present payment sheet
const { error } = await presentPaymentSheet();

// Step 4: Handle result
if (error) {
  // Handle payment failure
} else {
  // Handle payment success
}
```

## Environment Variables

The following environment variables must be set:

- `EXPO_PUBLIC_SUMUP_API_KEY`: Your SumUp API key

## Backend Requirements

The backend needs to implement:

1. Endpoint to create a SumUp checkout
2. Endpoint to check payment status
3. Webhook handler for SumUp payment notifications

## Testing

For testing, use the SumUp test mode by configuring a test API key. Refer to SumUp's documentation for test card numbers and scenarios.

## Resources

- [SumUp React Native SDK Documentation](https://developer.sumup.com/online-payments/tools/react-native-sdk) 