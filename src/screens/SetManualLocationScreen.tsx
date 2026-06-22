import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import MapView, { PROVIDER_GOOGLE, Region, Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../services/api';
import Geolocation from 'react-native-geolocation-service';
import Config from 'react-native-config';
import axios from 'axios';
import { useMutation, useQuery } from '@tanstack/react-query';
import CustomButton from '../components/Buttons/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  navigation: NativeStackNavigationProp<
    AuthStackParamList,
    'SetManualLocation'
  >;
};

export default function SetManualLocationScreen({ navigation }: Props) {
  const [loading, setLoading] = useState<boolean>(false);
  const [label, setLabel] = useState<string>('');
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState(
    'Move map or search to select location',
  );
  const mapRef = useRef<MapView>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['GetSavedLocation'],
    queryFn: async () => {
      try {
        const response = await api.get('/locations/me');
        const data = response?.data?.data;
        console.log(data,"THIS IS SAVED LOCATION>>>>>>>>>>>>>>>>>>+++++++++++++++++++++++++++++++")

        if (data && data.latitude && data.longitude) {
          setLocation({
                latitude: parseFloat(data.latitude),
                longitude: parseFloat(data.longitude),
                accuracy: parseInt(data.accuracy),
              });
        } else {
          fallbackToGPS();
        }
         return data;
      } catch (error) {
        console.log('No saved location found, falling back to GPS.');
        fallbackToGPS();
      }
    },
    staleTime: 5 * 60 * 1000,
    // refetchOnWindowFocus: false,
  });

  const { mutate, isPending } = useMutation({
    onMutate: async ({
      latitude,
      longitude,
      label,
    }: {
      latitude: number;
      longitude: number;
      label: string;
    }) => {
      try {
        const response = await api.put('/locations/manual', {
          latitude,
          longitude,label
        });
        navigation.navigate('Nearby');
        return response?.data
      } catch (error:any) {
        console.log('Error updating manual location', error?.response);
        throw error;
      }
    },
    onSuccess: () => {
      refetch();
      navigation.navigate('Nearby');
    },
    onError: () => {
      fallbackToGPS();
    },
  });

  const UpdateLocation = async () => {
    if (!location) {
      return;
    }
    mutate({
      latitude: location?.latitude,
      longitude: location?.longitude,
      label,
    });
  };

  const searchPlaces = async (text: string) => {
    setSearchQuery(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (text.length > 2) {
      debounceTimer.current = setTimeout(async () => {
        try {
          const response = await axios.post(
            `https://places.googleapis.com/v1/places:autocomplete`,
            { input: text },
            {
              headers: {
                'X-Goog-Api-Key': Config.GOOGLE_MAPS_API_KEY,
                'Content-Type': 'application/json',
              },
            },
          );

          const suggestions = response.data.suggestions || [];
          const formattedPredictions = suggestions.map((s: any) => ({
            place_id: s.placePrediction.placeId,
            description: s.placePrediction.text.text,
          }));

          setPredictions(formattedPredictions);
        } catch (error) {
          console.log('Autocomplete error:', error);
        }
      }, 500);
    } else {
      setPredictions([]);
    }
  };

  const handlePlaceSelect = async (placeId: string, description: string) => {
    try {
      const response = await axios.get(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            'X-Goog-Api-Key': Config.GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'location,displayName,formattedAddress',
          },
        },
      );

      const loc = response.data.location;
      if (loc) {
        setLocation({
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: 10,
        });

        // Animate the map to the selected location
        mapRef.current?.animateToRegion(
          {
            latitude: loc.latitude,
            longitude: loc.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          1000,
        );
      }

      setSearchQuery(description);
      setSelectedAddress(response.data.formattedAddress || description);
      setPredictions([]);
    } catch (e) {
      console.log('Place Details error:', e);
    }
  };

  const fallbackToGPS = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLoading(false);
          return;
        }
      }
      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude, accuracy } = position?.coords;
          setLocation(prev => prev || { latitude, longitude, accuracy });
          setLoading(false);
        },
        error => {
          console.log('GPS Error:', error.message);
          setLoading(false);
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 },
      );
    } catch (err) {
      console.warn('GPS Permission Error:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cleanup debounce timer on unmount to prevent memory leaks
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Map takes the full screen behind everything */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: location?.latitude || 0,
            longitude: location?.longitude || 0,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onMapReady={() => console.log('Google Maps is successfully ready')}
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title={selectedAddress}
              draggable
              onDragEnd={e => {
                const { latitude, longitude } = e.nativeEvent.coordinate;

                setLocation({
                  latitude,
                  longitude,
                  accuracy: 10,
                });
              }}
            />
          )}
        </MapView>
      </View>

      {/* Floating Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Manual Location</Text>
        <View style={{ width: 24 }} /> {/* Spacer to center the title */}
      </View>

      {/* Floating Search Bar */}
      <View style={styles.searchContainer}>
        <Icon
          name="search-outline"
          size={20}
          color="#9ca3af"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a place or address"
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={searchPlaces}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setPredictions([]);
            }}
          >
            <Icon name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Autocomplete Predictions List */}
      {predictions.length > 0 ? (
        <View style={styles.predictionsContainer}>
          <FlatList
            data={predictions}
            keyExtractor={item => item.place_id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.predictionItem}
                onPress={() =>
                  handlePlaceSelect(item.place_id, item.description)
                }
              >
                <Icon
                  name="location-outline"
                  size={20}
                  color="#6b7280"
                  style={styles.predictionIcon}
                />
                <Text style={styles.predictionText} numberOfLines={2}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      {/* Floating Bottom Card */}
      <View style={styles.bottomCard}>
        <View style={styles.locationHeader}>
          <View style={styles.iconContainer}>
            <Icon name="location" size={20} color="#3b2c85" />
          </View>
          <Text style={styles.cardTitle}>Selected Location</Text>
        </View>

        <View style={styles.locationDetails}>
          <Text style={styles.addressText} numberOfLines={2}>
            {selectedAddress}
          </Text>
          {location && (
            <Text style={styles.coordsText}>
              {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}
              ° E
            </Text>
          )}
        </View>

        {/* Label Input */}
        <View style={styles.labelInputContainer}>
          <Icon name="pricetag-outline" size={18} color="#6b7280" style={styles.labelIcon} />
          <TextInput
            style={styles.labelInput}
            placeholder="Add a label (e.g. Home, Office)"
            placeholderTextColor="#9ca3af"
            value={label}
            onChangeText={setLabel}
          />
          {label.length > 0 && (
            <TouchableOpacity onPress={() => setLabel('')}>
              <Icon name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <CustomButton
          onPress={UpdateLocation}
          loading={isPending}
          title="Confirm Location"
          disabled={!location}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mapContainer: {
    ...StyleSheet.absoluteFill,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  centerTargetContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -40, // half of width
    marginTop: -40, // half of height
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(79, 70, 229, 0.2)', // Light purple glow
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 16,
  },
  pinCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b2c85', // Solid purple
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b2c85',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  predictionsContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  predictionIcon: {
    marginRight: 12,
  },
  predictionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 20,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  locationDetails: {
    marginBottom: 24,
    paddingLeft: 44, // Align with text
  },
  addressText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 4,
  },
  coordsText: {
    fontSize: 13,
    color: '#6b7280',
  },
  labelContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  labelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },

   labelInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  labelIcon: {
    marginRight: 8,
  },
  labelInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  confirmButton: {
    backgroundColor: '#3b2c85',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
