import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InitialScreen from '../screens/InitialScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import OTPVerificationScreen from '../screens/Auth/OTPVerificationScreen';
import HomeScreen from '../screens/HomeScreen';
import HomeTabNavigator from './HomeTabNavigator';
import SetManualLocationScreen from '../screens/SetManualLocationScreen';
import PlaceDetailsScreen from '../screens/PlaceDetailsScreen';
import AllPhotosScreen from '../screens/AllPhotosScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import AgentTravelChatScreen from '../screens/AgentTravelChatScreen';
import CommuteScreen from '../screens/CommuteScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SavedPlacesScreen from '../screens/SavedPlacesScreen';
import WeatherScreen from '../screens/WeatherScreen';
import ComparisonScreen from '../screens/ComparisonScreen';
import CompareBasicScreen from '../screens/CompareBasicScreen';
import CompareRecommendScreen from '../screens/CompareRecommendScreen';

export type AuthStackParamList = {
  Initial: undefined;
  Login: { email?: string; password?: string } | undefined;
  Register: undefined;
  OTPVerification: { email: string; password?: string };
  Home: undefined;
  Nearby: undefined;
  SetManualLocation: undefined;
  PlaceDetails: {
    placeId?: string;
    placeName?: string;
    formatted_address?: string;
    latitude?: number;
    longitude?: number;
    google_maps_uri?: string | null;
    open_now?: boolean | null;
    photoUrl?: string | null;
    typeIcon?: string;
    rating: number;
    user_rating_count: number;
  } | undefined;
  AllPhotos: { photos?: string[] } | undefined;
  ChatDetail: {
    sessionId: string | number;
    placeName?: string;
    placeAddress?: string;
    placeId?:string
  } | undefined;
  AgentTravelChat: undefined;
  Commute: {
    placeId?: string;
    destinationName?: string;
    destinationLat?: number;
    destinationLng?: number;
  } | undefined;
  History: undefined;
  SavedPlaces: undefined;
  Weather: undefined;
  Comparison: { placeIds: string[]; mode?: 'legacy' | 'batch' | 'basic' | 'recommend' };
  CompareBasic: { placeIds: string[] };
  CompareRecommend: { placeIds: string[] };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setHasToken(!!token);
      } catch (error) {
        console.log('Error checking token:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#3b2c85" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={hasToken ? 'Home' : 'Initial'}>
      <Stack.Screen name="Initial" component={InitialScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Nearby" component={HomeTabNavigator} />
      <Stack.Screen
        name="SetManualLocation"
        component={SetManualLocationScreen}
      />
      <Stack.Screen name="PlaceDetails" component={PlaceDetailsScreen} />
      <Stack.Screen name="AllPhotos" component={AllPhotosScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="AgentTravelChat" component={AgentTravelChatScreen} />
      <Stack.Screen name="Commute" component={CommuteScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="SavedPlaces" component={SavedPlacesScreen} />
      <Stack.Screen name="Weather" component={WeatherScreen} />
      <Stack.Screen name="Comparison" component={ComparisonScreen} />
      <Stack.Screen name="CompareBasic" component={CompareBasicScreen} />
      <Stack.Screen name="CompareRecommend" component={CompareRecommendScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
