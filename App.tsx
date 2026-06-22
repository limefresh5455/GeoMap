import { View, Text } from 'react-native';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './src/navigation/AuthNavigator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const App = () => {
  const queryClient = new QueryClient();
  
  return (
    <NavigationContainer>
      <QueryClientProvider client={queryClient}>
        <AuthNavigator />
      </QueryClientProvider>
    </NavigationContainer>
  );
};

export default App;
