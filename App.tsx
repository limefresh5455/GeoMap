import { View, Text } from 'react-native';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './src/navigation/AuthNavigator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { navigationRef } from './src/navigation/NavigationService';

const App = () => {
  const queryClient = new QueryClient();
  
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <QueryClientProvider client={queryClient}>
            <PaperProvider>
          <AuthNavigator />
          </PaperProvider>
        </QueryClientProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
