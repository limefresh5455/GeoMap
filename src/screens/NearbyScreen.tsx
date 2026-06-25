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
import MapView, { PROVIDER_GOOGLE, Marker, Circle } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { locationService } from '../services/locationService';
import { weatherService } from '../services/weatherService';
import { discoveryService } from '../services/discoveryService';
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
import { SafeAreaView } from 'react-native-safe-area-context';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getWeatherIcon = (code: number, isDay: boolean = true) => {
  // Map weather codes (e.g. WeatherAPI) to Ionicons
  switch (code) {
    case 1000:
      return isDay ? 'sunny' : 'moon';
    case 1003:
      return isDay ? 'partly-sunny' : 'cloudy-night';
    case 1006:
    case 1009:
      return 'cloudy';
    case 1030:
    case 1135:
      return 'water';
    case 1063:
    case 1180:
    case 1183:
    case 1186:
    case 1189:
    case 1192:
    case 1195:
    case 1240:
    case 1243:
    case 1246:
      return 'rainy';
    case 1087:
    case 1273:
    case 1276:
    case 1279:
    case 1282:
      return 'thunderstorm';
    case 1114:
    case 1117:
    case 1210:
    case 1213:
    case 1216:
    case 1219:
    case 1222:
    case 1225:
    case 1255:
    case 1258:
      return 'snow';
    default:
      return 'thermometer';
  }
};

export default function NearbyScreen({ navigation }: Props) {
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

  // ... existing queries ...

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

  const handleAutocompleteSelect = (prediction: AutocompletePrediction) => {
    setSearchQuery(prediction.main_text);
    setAutocompleteResults([]);
    // Trigger search with the selected place
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
    navigation.navigate('Comparison', { placeIds: selectedPlaceIds, useBatch: false });
    setIsCompareMode(false);
    setSelectedPlaceIds([]);
  };

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
          return (response?.data || []) as NearbyPlace[];
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

        if (activeFilters.excluded_types.length > 0) {
          payload.excluded_types = activeFilters.excluded_types;
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

  // Effect to trigger search when searchQuery is cleared
  useEffect(() => {
    if (searchQuery === '' && !showSavedOnly) {
      refetchPlaces();
    }
  }, [searchQuery, showSavedOnly]);

  // Animate map when places load
  useEffect(() => {
    if (userLocation && mapRef.current) {
      const radiusInDegrees = activeFilters.radius / 111000; // rough conversion
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: radiusInDegrees * 2.5,
          longitudeDelta: radiusInDegrees * 2.5,
        },
        500,
      );
    }
  }, [userLocation, activeFilters.radius]);

  // Build photo URL from first_photo_name
  const getPhotoUrl = (photoName: string | null): string | null => {
    if (!photoName) return null;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${Config.GOOGLE_MAPS_API_KEY}`;
  };

  // Filter modal handlers
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

  // Loading state
  if (locationLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b2c85" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
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
          <Text style={styles.headerTitle}>
            {isCompareMode ? `${selectedPlaceIds.length} Selected` : 'Nearby Places'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isCompareMode ? 'Select 2-10 places' : `${nearbyPlaces?.length ?? 0} places nearby`}
          </Text>
        </View>
        
        {!isCompareMode && (
          <TouchableOpacity
            style={[styles.headerIconButton, showSavedOnly && styles.headerIconButtonActive]}
            onPress={() => setShowSavedOnly(!showSavedOnly)}>
            <Icon name={showSavedOnly ? "bookmark" : "bookmark-outline"} size={20} color={showSavedOnly ? "#ffffff" : "#3b2c85"} />
          </TouchableOpacity>
        )}

        {!isCompareMode && (
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setIsSearchVisible(!isSearchVisible)}>
            <Icon name="search-outline" size={20} color="#3b2c85" />
          </TouchableOpacity>
        )}

        {!isCompareMode && (
          weatherLoading ? (
            <View style={[styles.weatherPill, { opacity: 0.6 }]}>
              <ActivityIndicator size="small" color="#3b2c85" />
            </View>
          ) : weatherData && weatherData.temperature ? (
            <TouchableOpacity
              style={styles.weatherPill}
              onPress={() => navigation.navigate('Weather')}
              activeOpacity={0.7}
            >
              <Icon
                name={getWeatherIcon(weatherData.weather?.condition_code || 1000, weatherData.weather?.is_day ?? true)}
                size={18}
                color="#3b2c85"
              />
              <Text style={styles.weatherPillText}>
                {weatherData.temperature.current_c?.toFixed(0)}°
              </Text>
            </TouchableOpacity>
          ) : null
        )}

        {isCompareMode ? (
          <TouchableOpacity
            style={[styles.compareButton, selectedPlaceIds.length < 2 && styles.compareButtonDisabled]}
            onPress={handleCompare}
            disabled={selectedPlaceIds.length < 2}
          >
            <Text style={styles.compareButtonText}>Compare</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.filterButton,
              hasActiveFilters && styles.filterButtonActive,
            ]}
            onPress={openFilterModal}>
            <Icon
              name="options-outline"
              size={20}
              color={hasActiveFilters ? '#ffffff' : '#3b2c85'}
            />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
        )}
      </View>

      {isSearchVisible && (
        <View style={styles.searchBarContainer}>
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

      {/* Map */}
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
          {/* Radius circles */}
          {userLocation && (
            <>
              <Circle
                center={userLocation}
                radius={activeFilters.radius * 0.6}
                fillColor="rgba(59, 44, 133, 0.2)"
                strokeColor="transparent"
              />
              <Circle
                center={userLocation}
                radius={activeFilters.radius}
                fillColor="rgba(59, 44, 133, 0.06)"
                strokeColor="rgba(59, 44, 133, 0.2)"
                strokeWidth={1}
              />
            </>
          )}

          {/* Place markers */}
          {nearbyPlaces?.map(place => (
            <Marker
              key={place.place_id}
              coordinate={{
                latitude: place.latitude,
                longitude: place.longitude,
              }}
              title={place.display_name}
              description={place.formatted_address}
              onCalloutPress={() =>
                navigation.navigate('PlaceDetails', {
                  placeId: place.place_id,
                  placeName: place.display_name,
                  formatted_address:place?.formatted_address,
            latitude:place?.latitude,
            longitude:place?.longitude,
            google_maps_uri:place?.google_maps_uri,
            open_now:place?.open_now,
            photoUrl:getPhotoUrl(place?.first_photo_name),
            typeIcon:getPlaceTypeIcon(place.primary_type),
            rating:place?.rating as number,
            user_rating_count:place?.user_rating_count as number
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

          {/* Center user dot */}
          {userLocation && (
            <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.centerDotGlow}>
                <View style={styles.centerDot} />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Fetching overlay */}
        {isFetching && (
          <View style={styles.fetchingOverlay}>
            <ActivityIndicator size="small" color="#3b2c85" />
            <Text style={styles.fetchingText}>Searching...</Text>
          </View>
        )}
      </View>

      {/* Bottom Sheet — Places List */}
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
            showsVerticalScrollIndicator={false}
            renderItem={renderPlaceCard}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="location-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No places found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your filters or increasing the radius
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={openFilterModal}>
              <Text style={styles.emptyButtonText}>Adjust Filters</Text>
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
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Places</Text>
              <TouchableOpacity
                onPress={() => setFilterModalVisible(false)}
                style={styles.modalCloseButton}>
                <Icon name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}>
              {/* What are you looking for? (Place Categories) */}
              <Text style={styles.filterSectionTitle}>
                What are you looking for?
              </Text>
              <Text style={styles.filterSectionSubtitle}>
                Select categories to filter results
              </Text>

              {PLACE_TYPE_CATEGORIES.map(category => {
                const isExpanded = expandedCategory === category.id;
                const selectedCount = category.types.filter(t =>
                  tempFilters.included_types.includes(t.value),
                ).length;

                return (
                  <View key={category.id} style={styles.categoryBlock}>
                    <TouchableOpacity
                      style={styles.categoryHeader}
                      onPress={() =>
                        setExpandedCategory(isExpanded ? null : category.id)
                      }
                      activeOpacity={0.7}>
                      <View style={styles.categoryHeaderLeft}>
                        <View style={styles.categoryIconContainer}>
                          <Icon
                            name={category.icon}
                            size={18}
                            color="#3b2c85"
                          />
                        </View>
                        <Text style={styles.categoryLabel}>
                          {category.label}
                        </Text>
                        {selectedCount > 0 && (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>
                              {selectedCount}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.categoryTypes}>
                        {category.types.map(type => {
                          const isSelected =
                            tempFilters.included_types.includes(type.value);
                          return (
                            <TouchableOpacity
                              key={type.value}
                              style={[
                                styles.typeChip,
                                isSelected && styles.typeChipSelected,
                              ]}
                              onPress={() => toggleIncludedType(type.value)}
                              activeOpacity={0.7}>
                              <Text
                                style={[
                                  styles.typeChipText,
                                  isSelected && styles.typeChipTextSelected,
                                ]}>
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

              {/* Selected types summary */}
              {tempFilters.included_types.length > 0 && (
                <View style={styles.selectedSummary}>
                  <Text style={styles.selectedSummaryTitle}>
                    Selected ({tempFilters.included_types.length})
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}>
                    {tempFilters.included_types.map(typeValue => (
                      <TouchableOpacity
                        key={typeValue}
                        style={styles.selectedTypeChip}
                        onPress={() => toggleIncludedType(typeValue)}>
                        <Text style={styles.selectedTypeChipText}>
                          {getPlaceTypeLabel(typeValue)}
                        </Text>
                        <Icon name="close-circle" size={14} color="#ffffff" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Rank Preference */}
              <Text style={[styles.filterSectionTitle, { marginTop: 24 }]}>
                Sort By
              </Text>
              <View style={styles.optionRow}>
                {RANK_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionButton,
                      tempFilters.rank_preference === opt.value &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() =>
                      setTempFilters(prev => ({
                        ...prev,
                        rank_preference: opt.value,
                      }))
                    }
                    activeOpacity={0.7}>
                    <Icon
                      name={
                        opt.value === 'POPULARITY'
                          ? 'trending-up-outline'
                          : 'navigate-outline'
                      }
                      size={16}
                      color={
                        tempFilters.rank_preference === opt.value
                          ? '#ffffff'
                          : '#6b7280'
                      }
                    />
                    <Text
                      style={[
                        styles.optionButtonText,
                        tempFilters.rank_preference === opt.value &&
                          styles.optionButtonTextSelected,
                      ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Radius */}
              <Text style={[styles.filterSectionTitle, { marginTop: 24 }]}>
                Search Radius
              </Text>
              <View style={styles.optionRow}>
                {RADIUS_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionButton,
                      styles.optionButtonSmall,
                      tempFilters.radius === opt.value &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() =>
                      setTempFilters(prev => ({ ...prev, radius: opt.value }))
                    }
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.optionButtonText,
                        tempFilters.radius === opt.value &&
                          styles.optionButtonTextSelected,
                      ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Max Results */}
              <Text style={[styles.filterSectionTitle, { marginTop: 24 }]}>
                Max Results
              </Text>
              <View style={styles.optionRow}>
                {MAX_RESULT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionButton,
                      styles.optionButtonSmall,
                      tempFilters.max_result_count === opt.value &&
                        styles.optionButtonSelected,
                    ]}
                    onPress={() =>
                      setTempFilters(prev => ({
                        ...prev,
                        max_result_count: opt.value,
                      }))
                    }
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.optionButtonText,
                        tempFilters.max_result_count === opt.value &&
                          styles.optionButtonTextSelected,
                      ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}>
                <Icon name="refresh-outline" size={18} color="#6b7280" />
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
                <Icon name="checkmark" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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

  // Header
  header: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',

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
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 1,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
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

  // Map
  mapContainer: {
    flex: 0.65,
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
    top: 10,
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

  // Bottom Sheet
  bottomSheet: {
    flex: 0.35,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Place card
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerIconButtonActive: {
    backgroundColor: '#3b2c85',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#111827',
    padding: 0,
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
  placeImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
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

  // Empty state
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

  // List loading
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

  // Modal
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

  // Filter sections
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

  // Category blocks
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

  // Type chips
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

  // Selected summary
  selectedSummary: {
    marginTop: 8,
    marginBottom: 4,
  },
  selectedSummaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  selectedTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b2c85',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 4,
  },
  selectedTypeChipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },

  // Option buttons (Rank, Radius, Max Results)
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

  // Modal footer
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

  // Weather Styles
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  weatherPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b2c85',
  },
});
