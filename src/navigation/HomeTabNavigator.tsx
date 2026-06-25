import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { View, Text, StyleSheet } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import NearbyScreen from '../screens/NearbyScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SavedPlacesScreen from '../screens/SavedPlacesScreen';

const Tab = createBottomTabNavigator();
// ... existing PlaceholderScreen ...
export default function HomeTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Nearby"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';

          if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Nearby') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Saved') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b2c85',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="Nearby"
        component={NearbyScreen}
        options={{ tabBarLabel: 'Nearby' }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedPlacesScreen}
        options={{ tabBarLabel: 'Saved' }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarLabel: 'Chat' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  placeholderSub: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
});
