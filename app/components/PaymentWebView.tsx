import React, { useState, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';

type PaymentWebViewProps = {
  checkoutUrl: string;
  onPaymentComplete: (success: boolean) => void;
};

export function PaymentWebView({ 
  checkoutUrl,
  onPaymentComplete 
}: PaymentWebViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clean up any timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // Handle navigation state changes to detect payment completion
  const handleNavigationStateChange = (navState: { url: string }) => {
    // Only log URLs in development
    if (__DEV__) {
      console.log('Navigation URL:', navState.url);
    }
    
    // Check for success indicators in URL
    const isSuccessUrl = 
      navState.url.includes('status=success') ||
      navState.url.includes('/receipt') ||
      navState.url.includes('/payment-complete') ||
      navState.url.includes('/success') ||
      navState.url.startsWith('smashd://');
      
    // Check for failure indicators in URL
    const isFailureUrl = 
      navState.url.includes('status=failure') ||
      navState.url.includes('status=cancelled') ||
      navState.url.includes('payment-failed');
    
    // If we detect success or failure, notify the parent
    if (isSuccessUrl) {
      redirectTimeoutRef.current = setTimeout(() => {
        onPaymentComplete(true);
      }, 300);
    } else if (isFailureUrl) {
      redirectTimeoutRef.current = setTimeout(() => {
        onPaymentComplete(false);
      }, 300);
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.errorText}>
          {error}
        </ThemedText>
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: checkoutUrl }}
      onNavigationStateChange={handleNavigationStateChange}
      onError={(e) => setError('Failed to load payment page. Please try again.')}
      onHttpError={(e) => {
        // Only set error for 4xx and 5xx status codes, excluding 408 (timeout)
        const statusCode = e.nativeEvent.statusCode;
        if (statusCode >= 400 && statusCode !== 408) {
          setError(`Payment error (${statusCode}). Please try again.`);
        }
      }}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      originWhitelist={['*']}
      mixedContentMode="compatibility"
      startInLoadingState={true}
      renderLoading={() => (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff8c00" />
          <ThemedText style={styles.loadingText}>Loading payment page...</ThemedText>
        </View>
      )}
      userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    fontSize: 16,
  }
}); 