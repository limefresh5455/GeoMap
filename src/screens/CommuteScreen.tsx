import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Commute'>;
  route: RouteProp<AuthStackParamList, 'Commute'>;
};

type RouteData = {
  polyline: string;
  distance_meters: number;
  duration_seconds: number;
  start_location: { latitude: number; longitude: number };
  end_location: { latitude: number; longitude: number };
};

export default function CommuteScreen({ navigation, route }: Props) {
  const { placeId, destinationName, destinationLat, destinationLng } = route.params || {};
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: destinationLat || 0,
    longitude: destinationLng || 0,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const { mutate: computeRoute, isPending: isLoading } = useMutation({
    mutationFn: async () => {
      // Set departure time to 5 minutes in the future to satisfy "future time" requirement
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 5);
      
      const requestBody = {
        place_id: placeId || "",
        destination_latitude: destinationLat || 0,
        destination_longitude: destinationLng || 0,
        waypoints: [],
        optimize_waypoint_order: false,
        language_code: 'en-US',
        avoid_tolls: false,
        avoid_highways: false,
        avoid_ferries: false
      };
      
      console.log('Compute Route Request:', JSON.stringify(requestBody, null, 2));
      const response = await api.post('/routes/compute', requestBody);
      return response?.data;
    },
    onSuccess: (raw) => {
      console.log('Compute Route Response:', JSON.stringify(raw, null, 2));
      const data = raw?.data || raw;
      if (data) {
        setRouteData(data);
        // Adjust map to show the whole route
        const start = data.start_location;
        const end = data.end_location;
        
        if (start && end) {
          const midLat = (start.latitude + end.latitude) / 2;
          const midLng = (start.longitude + end.longitude) / 2;
          const latDelta = Math.abs(start.latitude - end.latitude) * 3;
          const lngDelta = Math.abs(start.longitude - end.longitude) * 3;
          
          setMapRegion({
            latitude: midLat,
            longitude: midLng,
            latitudeDelta: Math.max(latDelta, 0.05),
            longitudeDelta: Math.max(lngDelta, 0.05),
          });
        }
      }
    },
    onError: (error: any) => {
      const errorMessage =
          error?.response?.data?.detail ||
          error?.response?.data?.message || "Could not compute route."
      Alert.alert('Error', errorMessage);
    },
  });

  useEffect(() => {
    if (placeId || (destinationLat && destinationLng)) {
      computeRoute();
    }
  }, [placeId, destinationLat, destinationLng]);

  const decodePolyline = (t: string) => {
    let points = [];
    for (let step = 0, lat = 0, lng = 0; step < t.length; ) {
      let b, shift = 0, result = 0;
      do {
        b = t.charCodeAt(step++) - 63;
        result |= (b & 31) << shift;
        shift += 5;
      } while (b >= 32);
      lat += (result & 1 ? ~(result >> 1) : result >> 1);
      shift = result = 0;
      do {
        b = t.charCodeAt(step++) - 63;
        result |= (b & 31) << shift;
        shift += 5;
      } while (b >= 32);
      lng += (result & 1 ? ~(result >> 1) : result >> 1);
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  const polylinePoints = routeData?.polyline ? decodePolyline(routeData.polyline) : [];

  const handleStartNavigation = () => {
    const lat = destinationLat || routeData?.end_location?.latitude;
    const lng = destinationLng || routeData?.end_location?.longitude;
    
    if (lat && lng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `google.navigation:q=${lat},${lng}`,
      });
      if (url) {
        Linking.openURL(url).catch(() => {
          Alert.alert('Error', 'Could not open maps application');
        });
      }
    } else {
      Alert.alert('Error', 'Destination coordinates not available');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Commute to {destinationName || 'Destination'}</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={mapRegion}
          onRegionChangeComplete={setMapRegion}
        >
          {routeData?.start_location && (
            <Marker coordinate={routeData.start_location} title="Start" pinColor="green" />
          )}
          {routeData?.end_location && (
            <Marker coordinate={routeData.end_location} title={destinationName || "Destination"} />
          )}
          {polylinePoints.length > 0 && (
            <Polyline
              coordinates={polylinePoints}
              strokeWidth={4}
              strokeColor="#3b2c85"
            />
          )}
        </MapView>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3b2c85" />
            <Text style={styles.loadingText}>Computing route...</Text>
          </View>
        )}
      </View>

      {routeData && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Icon name="time-outline" size={20} color="#3b2c85" />
              <Text style={styles.infoValue}>
                {Math.round(routeData.duration_seconds / 60)} min
              </Text>
              <Text style={styles.infoLabel}>Duration</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <Icon name="navigate-outline" size={20} color="#3b2c85" />
              <Text style={styles.infoValue}>
                {(routeData.distance_meters / 1000).toFixed(1)} km
              </Text>
              <Text style={styles.infoLabel}>Distance</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <Icon name="car-outline" size={20} color="#3b2c85" />
              <Text style={styles.infoValue}>Drive</Text>
              <Text style={styles.infoLabel}>Mode</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartNavigation}>
            <Text style={styles.startButtonText}>Start Navigation</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#3b2c85',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
  },
  startButton: {
    backgroundColor: '#3b2c85',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
