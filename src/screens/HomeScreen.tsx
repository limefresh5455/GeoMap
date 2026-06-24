import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View,  TouchableOpacity, PermissionsAndroid, Platform, Alert, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { api } from '../services/api';
import Icon from 'react-native-vector-icons/Ionicons';
import CustomButton from '../components/Buttons/Button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const [location, setLocation] = useState<{latitude: number, longitude: number, accuracy?: number} | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const query = useQueryClient();


  const {mutate,isPending}=useMutation({
    mutationFn: async ({latitude,longitude,accuracy}:{latitude:number,longitude:number,accuracy?:number}) => {
        try {
          // Sync with backend in the background
         const response = await api.post('/locations/gps', { latitude, longitude, accuracy });
         return response.data
        } catch (error:any) {
          const message=error?.response ??error
          console.log('Error saving location to backend:', message);
          throw error
        }
    },
    onSuccess:()=>{
      refetch();
      query.invalidateQueries({queryKey:['NearbyPlaces']});
      query.invalidateQueries({queryKey:['GetSavedLocation']});
      query.invalidateQueries({queryKey:['locationsHistory']});
      navigation.navigate('Nearby');
    }
    
    
  })

  const requestLocationPermission = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'ios') {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        if (auth === 'granted') {
          setPermissionGranted(true);
          getCurrentLocation();
        } else {
          setPermissionGranted(false);
          setLoading(false);
        }
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'We need access to your location to show it on the map.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
       
          setPermissionGranted(true);
          getCurrentLocation();
        } else {
          setPermissionGranted(false);
          setLoading(false);
        }
      }
    } catch (err) {
      console.warn(err);
      setPermissionGranted(false);
      setLoading(false);
    }
  };

  const {data,isLoading,refetch}=useQuery({
    queryKey:['GetSavedLocation'],
    queryFn:async()=>{
      try {
      const response = await api.get('/locations/me');
      const data = response?.data?.data;

      
      if (data && data.latitude && data.longitude) {
        setLocation((prev) => prev || {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          accuracy: parseInt(data.accuracy)
        });
      }
       return data;
    } catch (error) {
      // Silently fail if GET API has no location, we fallback to device GPS
      console.log('No saved location found.');
    }
    },
    staleTime:5*60*1000,
  });


  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Update UI immediately for better UX
        setLocation({ latitude, longitude, accuracy });
        setLoading(false);
       
    
      },
      (error) => {
        console.log('GPS Error:', error.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleConfirmLocation = () => {
    if (location) {
       mutate({latitude:location?.latitude,longitude:location?.longitude,accuracy:location?.accuracy})
     
    }
  };



  useEffect(() => {
  requestLocationPermission();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Fetching Location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (permissionGranted === false || !location) {
    return (
      <SafeAreaView style={styles.safeAreaLoading}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Location permission is required to view the map.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={requestLocationPermission}>
            <Text style={styles.retryButtonText}>Retry Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Location</Text>
        <TouchableOpacity>
          <Icon name="settings-outline" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        {location && !isNaN(location.latitude) && !isNaN(location.longitude) ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={false}
            onMapReady={() => console.log('Google Maps is successfully ready')}
          >
            <Marker coordinate={location} title="You are here" />
          </MapView>
        ) : (
          <View style={styles.centerContainer}>
            <Text style={{ color: '#111827', marginTop: 20 }}>Invalid Coordinates!</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.cardHeader}>
          <Icon name="location" size={24} color="#4f46e5" />
          <Text style={styles.cardTitle}>Current Location</Text>
        </View>
        
        <Text style={styles.addressText}>
          {`Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`}
        </Text>
        {location.accuracy && (
          <Text style={styles.accuracyText}>Accuracy: {location.accuracy.toFixed(2)} m</Text>
        )}

        <View style={styles.buttonGroup}>
          <CustomButton 
            title="Confirm GPS Location"
            onPress={handleConfirmLocation}
            loading={loading ||isPending}
            disabled={loading ||isPending}
            />

               <CustomButton textStyle={styles.secondaryButtonText}
            title="Set Manually"
            buttonStyle={styles.secondaryButton}
            onPress={() => navigation.navigate('SetManualLocation')}
            disabled={loading ||isPending}
            />
          
       
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaLoading: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop:30,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 20,
    marginTop: -30, // Overlap the map
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 4,
  },
  accuracyText: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 24,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#3b2c85',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
