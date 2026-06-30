import { View, Text } from 'react-native';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './src/navigation/AuthNavigator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { navigationRef } from './src/navigation/NavigationService';
import { StripeProvider } from '@stripe/stripe-react-native';
import Config from 'react-native-config';

const App = () => {
  const queryClient = new QueryClient();
  
  if (!StripeProvider) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
          Native Module Error
        </Text>
        <Text style={{ marginTop: 10, textAlign: 'center' }}>
          Stripe native module not found. Please run "npx react-native run-android" to rebuild the app.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StripeProvider
        publishableKey={Config.STRIPE_PUBLISHABLE_KEY || ''}
        merchantIdentifier="merchant.com.geo" // required for Apple Pay
      >
        <NavigationContainer ref={navigationRef}>
          <QueryClientProvider client={queryClient}>
            <PaperProvider>
              <AuthNavigator />
            </PaperProvider>
          </QueryClientProvider>
        </NavigationContainer>
      </StripeProvider>
    </SafeAreaProvider>
  );
};

export default App;
