import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import MapView, { PROVIDER_GOOGLE, Marker, Circle, Polygon } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { locationService } from '../services/locationService';
import { weatherService } from '../services/weatherService';
import { discoveryService } from '../services/discoveryService';
import { placeService } from '../services/placeService';
import { AutocompletePrediction } from '../services/types';
import Config from 'react-native-config';
import {
  PLACE_TYPE_CATEGORIES,
  RANK_OPTIONS,
  RADIUS_OPTIONS,
  MAX_RESULT_OPTIONS,
  getPlaceTypeIcon,
  getPlaceTypeLabel,
} from '../constants/placeTypes';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Nearby'>;
};

type LocationType = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

type NearbyPlace = {
  place_id: string;
  display_name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  user_rating_count: number | null;
  primary_type: string | null;
  types: string[] | null;
  business_status: string | null;
  google_maps_uri: string | null;
  open_now: boolean | null;
  price_level: string | null;
  first_photo_name: string | null;
};

type FilterState = {
  radius: number;
  max_result_count: number;
  included_types: string[];
  excluded_types: string[];
  rank_preference: string;
};

const DEFAULT_FILTERS: FilterState = {
  radius: 500,
  max_result_count: 15,
  included_types: [],
  excluded_types: [],
  rank_preference: 'POPULARITY',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getCirclePoints = (center: { latitude: number; longitude: number }, radius: number, numPoints: number = 64) => {
  const points = [];
  const earthRadius = 6371000; // meters
  const lat = (center.latitude * Math.PI) / 180;
  const lon = (center.longitude * Math.PI) / 180;
  const dByR = radius / earthRadius;

  for (let i = 0; i <= numPoints; i++) {
    const bearing = (i * 2 * Math.PI) / numPoints;
    const lat2 = Math.asin(
      Math.sin(lat) * Math.cos(dByR) +
        Math.cos(lat) * Math.sin(dByR) * Math.cos(bearing)
    );
    const lon2 =
      lon +
      Math.atan2(
        Math.sin(bearing) * Math.sin(dByR) * Math.cos(lat),
        Math.cos(dByR) - Math.sin(lat) * Math.sin(lat2)
      );
    points.push({
      latitude: (lat2 * 180) / Math.PI,
      longitude: (lon2 * 180) / Math.PI,
    });
  }
  return points;
};

const getWeatherIcon = (code: number, isDay: boolean = true) => {
  switch (code) {
    case 0:
    case 1: return isDay ? 'sunny' : 'moon';
    case 2:
    case 3: return isDay ? 'partly-sunny' : 'cloudy-night';
    case 45:
    case 48: return 'water';
    case 51:
    case 53:
    case 55:
    case 61:
    case 63:
    case 65:
    case 80:
    case 81:
    case 82: return 'rainy';
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86: return 'snow';
    case 95:
    case 96:
    case 99: return 'thunderstorm';
    default: return 'thermometer';
  }
};

export default function NearbyScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [tempFilters, setTempFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompletePrediction[]>([]);
  const mapRef = useRef<MapView>(null);

  // Fetch user's saved location
  const { data: userLocation, isLoading: locationLoading } = useQuery({
    queryKey: ['GetSavedLocation'],
    queryFn: async () => {
      try {
        const response = await locationService.getMe();
        const resData = response?.data;
        if (resData && resData.latitude !== undefined && resData.latitude !== null && resData.longitude !== undefined && resData.longitude !== null) {
          const lat = typeof resData.latitude === 'string' ? parseFloat(resData.latitude) : resData.latitude;
          const lng = typeof resData.longitude === 'string' ? parseFloat(resData.longitude) : resData.longitude;
          return { latitude: lat, longitude: lng };
        }
        return null;
      } catch (error) {
        console.log('No saved location found.');
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch weather data
  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ['weather', userLocation?.latitude, userLocation?.longitude],
    queryFn: async () => {
      try {
        const response = await weatherService.getForecast();
        return response?.data;
      } catch (error: any) {
        console.log('Error fetching weather data:', error.message);
        return null;
      }
    },
    enabled: !!userLocation,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch nearby places from backend
  const {
    data: nearbyPlaces,
    isLoading: placesLoading,
    refetch: refetchPlaces,
    isFetching,
  } = useQuery({
    queryKey: ['NearbyPlaces', activeFilters, showSavedOnly],
    queryFn: async () => {
      try {
        if (showSavedOnly) {
          const response = await placeService.getSavedNearby();
          return (response?.data || []) as unknown as NearbyPlace[];
        }

        if (searchQuery.length > 2) {
          const response = await discoveryService.textSearch({ text_query: searchQuery });
          return (response?.data || []) as NearbyPlace[];
        }

        const payload: any = {
          radius: activeFilters.radius,
          max_result_count: activeFilters.max_result_count,
          rank_preference: activeFilters.rank_preference,
        };

        if (activeFilters.included_types.length > 0) {
          payload.preset = 'preferred_types';
          payload.included_types = activeFilters.included_types;
        }

        const response = await discoveryService.nearbySearch(payload);
        return (response?.data || []) as NearbyPlace[];
      } catch (error: any) {
        console.log('Search error:', error.message);
        return [];
      }
    },
    enabled: !!userLocation,
    staleTime: 5 * 60 * 1000,
  });

  const { data: autocompleteData, isFetching: autocompleteLoading } = useQuery({
    queryKey: ['autocomplete', searchQuery],
    queryFn: () => discoveryService.autocomplete(searchQuery, userLocation?.latitude, userLocation?.longitude),
    enabled: searchQuery.length > 2 && isSearchVisible,
  });

  useEffect(() => {
    if (autocompleteData?.predictions) {
      setAutocompleteResults(autocompleteData.predictions);
    } else {
      setAutocompleteResults([]);
    }
  }, [autocompleteData]);

  // Adjust map view when radius changes
  useEffect(() => {
    if (userLocation && mapRef.current) {
      const delta = (activeFilters.radius * 2) / 111320;
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: delta * 1.2,
        longitudeDelta: delta * 1.2,
      }, 1000);
    }
  }, [activeFilters.radius, userLocation]);

  const handleAutocompleteSelect = (prediction: AutocompletePrediction) => {
    setSearchQuery(prediction.main_text);
    setAutocompleteResults([]);
    refetchPlaces();
  };

  const togglePlaceSelection = (placeId: string) => {
    setSelectedPlaceIds(prev => {
      if (prev.includes(placeId)) {
        return prev.filter(id => id !== placeId);
      }
      if (prev.length >= 10) {
        Alert.alert('Limit Reached', 'You can compare up to 10 places at once.');
        return prev;
      }
      return [...prev, placeId];
    });
  };

  const handleCompare = () => {
    if (selectedPlaceIds.length < 2) {
      Alert.alert('Select Places', 'Please select at least 2 places to compare.');
      return;
    }
    
    Alert.alert(
      'Comparison Type',
      'Choose how you want to compare these places:',
      [
        {
          text: 'Detailed Table',
          onPress: () => {
            navigation.navigate('CompareBasic', { placeIds: selectedPlaceIds });
            setIsCompareMode(false);
            setSelectedPlaceIds([]);
          }
        },
        {
          text: 'Smart Recommendation',
          onPress: () => {
            navigation.navigate('CompareRecommend', { placeIds: selectedPlaceIds });
            setIsCompareMode(false);
            setSelectedPlaceIds([]);
          }
        },
        {
          text: 'Simple Table',
          onPress: () => {
            navigation.navigate('Comparison', { placeIds: selectedPlaceIds });
            setIsCompareMode(false);
            setSelectedPlaceIds([]);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const getPhotoUrl = (photoName: string | null): string | null => {
    if (!photoName) return null;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${Config.GOOGLE_MAPS_API_KEY}`;
  };

  const openFilterModal = () => {
    setTempFilters({ ...activeFilters });
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setActiveFilters({ ...tempFilters });
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setTempFilters({ ...DEFAULT_FILTERS });
  };

  const toggleIncludedType = (typeValue: string) => {
    setTempFilters(prev => {
      const exists = prev.included_types.includes(typeValue);
      return {
        ...prev,
        included_types: exists
          ? prev.included_types.filter(t => t !== typeValue)
          : [...prev.included_types, typeValue],
      };
    });
  };

  const hasActiveFilters =
    activeFilters.included_types.length > 0 ||
    activeFilters.radius !== DEFAULT_FILTERS.radius ||
    activeFilters.max_result_count !== DEFAULT_FILTERS.max_result_count ||
    activeFilters.rank_preference !== DEFAULT_FILTERS.rank_preference;

  const renderPlaceCard = ({ item }: { item: NearbyPlace }) => {
    const photoUrl = getPhotoUrl(item.first_photo_name);
    const typeLabel = getPlaceTypeLabel(item.primary_type);
    const typeIcon = getPlaceTypeIcon(item.primary_type);
    const isSelected = selectedPlaceIds.includes(item.place_id);

    return (
      <TouchableOpacity
        style={[styles.placeCard, isSelected && styles.placeCardSelected]}
        activeOpacity={0.7}
        onPress={() => {
          if (isCompareMode) {
            togglePlaceSelection(item.place_id);
          } else {
            navigation.navigate('PlaceDetails', {
              placeId: item.place_id,
              placeName: item.display_name,
              formatted_address: item?.formatted_address,
              latitude: item?.latitude,
              longitude: item?.longitude,
              google_maps_uri: item?.google_maps_uri,
              open_now: item?.open_now,
              photoUrl: photoUrl,
              typeIcon: typeIcon,
              rating: item?.rating as number,
              user_rating_count: item?.user_rating_count as number
            });
          }
        }}
        onLongPress={() => {
          if (!isCompareMode) {
            setIsCompareMode(true);
            togglePlaceSelection(item.place_id);
          }
        }}>
        <View style={styles.cardLeft}>
          {isCompareMode && (
            <View style={[styles.selectionCircle, isSelected && styles.selectionCircleActive]}>
              {isSelected && <Icon name="checkmark" size={14} color="#ffffff" />}
            </View>
          )}
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.placeImage} />
          ) : (
            <View style={[styles.placeImage, styles.placeImagePlaceholder]}>
              <Icon name={typeIcon} size={24} color="#9ca3af" />
            </View>
          )}
        </View>
        <View style={styles.placeInfo}>
          <Text style={styles.placeName} numberOfLines={1}>
            {item.display_name}
          </Text>
          <Text style={styles.placeAddress} numberOfLines={1}>
            {item.formatted_address}
          </Text>
          <View style={styles.placeMetaRow}>
            <View style={styles.typeBadge}>
              <Icon name={typeIcon} size={10} color="#6b7280" />
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
            {item.open_now !== null && (
              <Text
                style={[
                  styles.openStatus,
                  { color: item.open_now ? '#10b981' : '#ef4444' },
                ]}>
                {item.open_now ? 'Open' : 'Closed'}
              </Text>
            )}
          </View>
        </View>
        {item.rating && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            <Icon name="star" size={12} color="#f59e0b" />
            {item.user_rating_count && (
              <Text style={styles.ratingCount}>
                ({item.user_rating_count > 999 ? `${(item.user_rating_count / 1000).toFixed(1)}k` : item.user_rating_count})
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (locationLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b2c85" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: userLocation?.latitude ?? 0,
            longitude: userLocation?.longitude ?? 0,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={true}
          zoomEnabled={true}>
          {userLocation && (
            <>
              <Polygon
                coordinates={getCirclePoints(userLocation, activeFilters.radius * 0.6)}
                fillColor="rgba(59, 44, 133, 0.15)"
                strokeColor="transparent"
              />
              <Polygon
                coordinates={getCirclePoints(userLocation, activeFilters.radius)}
                fillColor="rgba(59, 44, 133, 0.05)"
                strokeColor="rgba(59, 44, 133, 0.3)"
                strokeWidth={1.5}
              />
              <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.centerDotGlow}>
                  <View style={styles.centerDot} />
                </View>
              </Marker>
            </>
          )}

          {nearbyPlaces?.map(place => (
            <Marker
              key={place.place_id}
              coordinate={{
                latitude: place.latitude || 0,
                longitude: place.longitude || 0,
              }}
              title={place.display_name}
              onCalloutPress={() =>
                navigation.navigate('PlaceDetails', {
                  placeId: place.place_id,
                  placeName: place.display_name,
                  formatted_address: place.formatted_address,
                  latitude: place.latitude,
                  longitude: place.longitude,
                  rating: place.rating || 0,
                  user_rating_count: place.user_rating_count || 0,
                })
              }>
              <View style={styles.mapIconContainer}>
                <Icon
                  name={getPlaceTypeIcon(place.primary_type)}
                  size={14}
                  color="#3b2c85"
                />
              </View>
            </Marker>
          ))}
        </MapView>

        {isFetching && (
          <View style={styles.fetchingOverlay}>
            <ActivityIndicator size="small" color="#3b2c85" />
            <Text style={styles.fetchingText}>Searching...</Text>
          </View>
        )}
      </View>

      {/* Floating Header */}
      <View style={[styles.header, { top: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (isCompareMode) {
              setIsCompareMode(false);
              setSelectedPlaceIds([]);
            } else {
              navigation.getParent()?.goBack();
            }
          }}>
          <Icon name={isCompareMode ? "close" : "arrow-back"} size={22} color="#111827" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isCompareMode ? `${selectedPlaceIds.length} Selected` : 'Nearby'}
          </Text>
          {!isCompareMode && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {nearbyPlaces?.length ?? 0} places
            </Text>
          )}
        </View>
        
        {!isCompareMode && (
          <>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setIsCompareMode(true)}>
              <Icon name="git-compare-outline" size={20} color="#3b2c85" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerIconButton, showSavedOnly && styles.headerIconButtonActive]}
              onPress={() => setShowSavedOnly(!showSavedOnly)}>
              <Icon name={showSavedOnly ? "bookmark" : "bookmark-outline"} size={20} color={showSavedOnly ? "#ffffff" : "#3b2c85"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setIsSearchVisible(!isSearchVisible)}>
              <Icon name="search-outline" size={20} color="#3b2c85" />
            </TouchableOpacity>

            {weatherData?.current_weather && (
              <TouchableOpacity
                style={styles.weatherPill}
                onPress={() => navigation.navigate('Weather')}
              >
                <Icon
                  name={getWeatherIcon(weatherData.current_weather.weathercode, !!weatherData.current_weather.is_day)}
                  size={18}
                  color="#3b2c85"
                />
                <Text style={styles.weatherPillText}>
                  {weatherData.current_weather.temperature?.toFixed(0)}°
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
              onPress={openFilterModal}>
              <Icon name="options-outline" size={20} color={hasActiveFilters ? '#ffffff' : '#3b2c85'} />
              {hasActiveFilters && <View style={styles.filterDot} />}
            </TouchableOpacity>
          </>
        )}

        {isCompareMode && (
          <TouchableOpacity
            style={[styles.compareButton, selectedPlaceIds.length < 2 && styles.compareButtonDisabled]}
            onPress={handleCompare}
            disabled={selectedPlaceIds.length < 2}
          >
            <Text style={styles.compareButtonText}>Compare</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      {isSearchVisible && (
        <View style={[styles.searchBarContainer, { top: insets.top + 70 }]}>
          <View style={styles.searchInputWrapper}>
            <Icon name="search" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for places..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {autocompleteLoading && <ActivityIndicator size="small" color="#3b2c85" style={{ marginRight: 8 }} />}
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setAutocompleteResults([]);
              }}>
                <Icon name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          
          {autocompleteResults.length > 0 && (
            <View style={styles.autocompleteContainer}>
              {autocompleteResults.map((item) => (
                <TouchableOpacity
                  key={item.place_id}
                  style={styles.autocompleteItem}
                  onPress={() => handleAutocompleteSelect(item)}
                >
                  <Icon name="location-outline" size={16} color="#6b7280" />
                  <View style={styles.autocompleteTextContainer}>
                    <Text style={styles.autocompleteMainText}>{item.main_text}</Text>
                    <Text style={styles.autocompleteSecondaryText}>{item.secondary_text}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHandle} />
        {placesLoading ? (
          <View style={styles.listLoadingContainer}>
            <ActivityIndicator size="small" color="#3b2c85" />
            <Text style={styles.listLoadingText}>Finding nearby places...</Text>
          </View>
        ) : nearbyPlaces && nearbyPlaces.length > 0 ? (
          <FlatList
            data={nearbyPlaces}
            keyExtractor={item => item.place_id}
            renderItem={renderPlaceCard}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="map-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No places found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters or searching in a different area.</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                setSearchQuery('');
                resetFilters();
              }}>
              <Text style={styles.emptyButtonText}>Reset All</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Places</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.modalCloseButton}>
                <Icon name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.filterSectionTitle}>What are you looking for?</Text>
              <Text style={styles.filterSectionSubtitle}>Select categories to filter results</Text>

              {PLACE_TYPE_CATEGORIES.map(category => {
                const isExpanded = expandedCategory === category.id;
                const selectedCount = category.types.filter(t => tempFilters.included_types.includes(t.value)).length;

                return (
                  <View key={category.id} style={styles.categoryBlock}>
                    <TouchableOpacity
                      style={styles.categoryHeader}
                      onPress={() => setExpandedCategory(isExpanded ? null : category.id)}
                    >
                      <View style={styles.categoryHeaderLeft}>
                        <View style={styles.categoryIconContainer}>
                          <Icon name={category.icon} size={18} color="#3b2c85" />
                        </View>
                        <Text style={styles.categoryLabel}>{category.label}</Text>
                        {selectedCount > 0 && (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>{selectedCount}</Text>
                          </View>
                        )}
                      </View>
                      <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.categoryTypes}>
                        {category.types.map(type => {
                          const isSelected = tempFilters.included_types.includes(type.value);
                          return (
                            <TouchableOpacity
                              key={type.value}
                              style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                              onPress={() => toggleIncludedType(type.value)}
                            >
                              <Text style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>
                                {type.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}

              <Text style={[styles.filterSectionTitle, { marginTop: 24 }]}>Sort By</Text>
              <View style={styles.optionRow}>
                {RANK_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionButton, tempFilters.rank_preference === opt.value && styles.optionButtonSelected]}
                    onPress={() => setTempFilters(prev => ({ ...prev, rank_preference: opt.value }))}
                  >
                    <Icon
                      name={opt.value === 'POPULARITY' ? 'trending-up-outline' : 'navigate-outline'}
                      size={16}
                      color={tempFilters.rank_preference === opt.value ? '#ffffff' : '#6b7280'}
                    />
                    <Text style={[styles.optionButtonText, tempFilters.rank_preference === opt.value && styles.optionButtonTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.filterSectionTitle, { marginTop: 24 }]}>Search Radius</Text>
              <View style={styles.optionRow}>
                {RADIUS_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionButton, styles.optionButtonSmall, tempFilters.radius === opt.value && styles.optionButtonSelected]}
                    onPress={() => setTempFilters(prev => ({ ...prev, radius: opt.value }))}
                  >
                    <Text style={[styles.optionButtonText, tempFilters.radius === opt.value && styles.optionButtonTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Icon name="refresh-outline" size={18} color="#6b7280" />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
                <Icon name="checkmark" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#6b7280',
  },
  header: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6b7280',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  headerIconButtonActive: {
    backgroundColor: '#3b2c85',
  },
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 6,
    gap: 4,
  },
  weatherPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3b2c85',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  filterButtonActive: {
    backgroundColor: '#3b2c85',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#3b2c85',
  },
  searchBarContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 99,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#e5e7eb',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  centerDotGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  mapIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fetchingOverlay: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffffee',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  fetchingText: {
    fontSize: 13,
    color: '#3b2c85',
    fontWeight: '600',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 16,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingHorizontal: 4,
  },
  placeCardSelected: {
    backgroundColor: '#f5f3ff',
    borderRadius: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionCircleActive: {
    backgroundColor: '#3b2c85',
    borderColor: '#3b2c85',
  },
  compareButton: {
    backgroundColor: '#3b2c85',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  compareButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  compareButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  placeImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
  },
  placeImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeInfo: {
    flex: 1,
    marginLeft: 14,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  placeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  typeBadgeText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  openStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  ratingContainer: {
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  ratingCount: {
    fontSize: 10,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 40,
  },
  emptyButton: {
    backgroundColor: '#3b2c85',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  listLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  listLoadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  filterSectionSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 12,
  },
  categoryBlock: {
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f3f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  selectedBadge: {
    backgroundColor: '#3b2c85',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  selectedBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
    paddingLeft: 42,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeChipSelected: {
    backgroundColor: '#3b2c85',
    borderColor: '#3b2c85',
  },
  typeChipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  typeChipTextSelected: {
    color: '#ffffff',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  optionButtonSmall: {
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  optionButtonSelected: {
    backgroundColor: '#3b2c85',
    borderColor: '#3b2c85',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  optionButtonTextSelected: {
    color: '#ffffff',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3b2c85',
    gap: 6,
  },
  applyButtonText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '700',
  },
  autocompleteContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 200,
    overflow: 'hidden',
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  autocompleteTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  autocompleteMainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  autocompleteSecondaryText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
