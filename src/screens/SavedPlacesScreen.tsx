import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { placeService } from '../services/placeService';
import { locationService } from '../services/locationService';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import Config from 'react-native-config';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SavedPlaces'>;
};

export default function SavedPlacesScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);

  // Fetch user's saved location for nearby filtering
  const { data: userLocation } = useQuery({
    queryKey: ['GetSavedLocation'],
    queryFn: async () => {
      try {
        const response = await locationService.getMe();
        const resData = response?.data;
        if (resData && resData.latitude !== undefined && resData.latitude !== null) {
          return {
            latitude: typeof resData.latitude === 'string' ? parseFloat(resData.latitude) : resData.latitude,
            longitude: typeof resData.longitude === 'string' ? parseFloat(resData.longitude) : resData.longitude,
          };
        }
        return null;
      } catch (error) {
        return null;
      }
    },
  });

  const { data: savedPlaces, isLoading, error, refetch } = useQuery({
    queryKey: ['savedPlaces', searchQuery, selectedTag, showNearbyOnly],
    queryFn: async () => {
      if (showNearbyOnly && userLocation) {
        const response = await placeService.getSavedNearby(userLocation.latitude, userLocation.longitude);
        return response.data || [];
      }
      const response = await placeService.listSaved(1, 50, selectedTag || undefined, searchQuery || undefined);
      return response.data || [];
    },
  });

  // Extract unique tags from saved places (this is a client-side optimization, 
  // ideally the API would provide a list of tags)
  const allTags = Array.from(new Set(
    (savedPlaces || []).flatMap((p: any) => p.tags || [])
  )) as string[];

  const unsaveMutation = useMutation({
    mutationFn: (savedId: number) => placeService.unsavePlace(savedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedPlaces'] });
    },
  });

  const getPhotoUrl = (photoName: string | null): string | null => {
    if (!photoName) return null;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${Config.GOOGLE_MAPS_API_KEY}`;
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
            navigation.navigate('Comparison', { placeIds: selectedPlaceIds, useBatch: true });
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

  const renderSavedItem = ({ item }: { item: any }) => {
    const isSelected = selectedPlaceIds.includes(item.place_id);
    
    return (
      <TouchableOpacity
        style={[styles.placeCard, isSelected && styles.placeCardSelected]}
        onPress={() => {
          if (isCompareMode) {
            togglePlaceSelection(item.place_id);
          } else {
            navigation.navigate('PlaceDetails', { placeId: item.place_id, rating: item.rating || 0, user_rating_count: 0 });
          }
        }}
        onLongPress={() => {
          if (!isCompareMode) {
            setIsCompareMode(true);
            togglePlaceSelection(item.place_id);
          }
        }}
      >
        <View style={styles.cardContent}>
          {isCompareMode && (
            <View style={[styles.selectionCircle, isSelected && styles.selectionCircleActive]}>
              {isSelected && <Icon name="checkmark" size={14} color="#ffffff" />}
            </View>
          )}
          <View style={styles.placeInfo}>
            <Text style={styles.placeName} numberOfLines={1}>
              {item.display_name || 'Unknown Place'}
            </Text>
            <Text style={styles.placeAddress} numberOfLines={1}>
              {item.formatted_address}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{item.primary_type || 'Place'}</Text>
              </View>
              {item.rating && (
                <View style={styles.ratingRow}>
                  <Icon name="star" size={14} color="#f59e0b" />
                  <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>
          {!isCompareMode && (
            <TouchableOpacity
              style={styles.unsaveButton}
              onPress={() => unsaveMutation.mutate(item.id)}
            >
              <Icon name="bookmark" size={24} color="#3b2c85" />
            </TouchableOpacity>
          )}
        </View>
        {item.notes && (
          <View style={styles.notesContainer}>
            <Icon name="document-text-outline" size={14} color="#6b7280" />
            <Text style={styles.notesText} numberOfLines={1}>
              {item.notes}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (isCompareMode) {
              setIsCompareMode(false);
              setSelectedPlaceIds([]);
            } else {
              navigation.goBack();
            }
          }} 
          style={styles.backButton}
        >
          <Icon name={isCompareMode ? "close" : "arrow-back"} size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isCompareMode ? `${selectedPlaceIds.length} Selected` : 'Saved Places'}
        </Text>
        <View style={styles.headerRight}>
          {isCompareMode ? (
            <TouchableOpacity
              style={[styles.compareButton, selectedPlaceIds.length < 2 && styles.compareButtonDisabled]}
              onPress={handleCompare}
              disabled={selectedPlaceIds.length < 2}
            >
              <Text style={styles.compareButtonText}>Compare</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.nearbyToggle, { width: 'auto', paddingHorizontal: 12, borderRadius: 20, gap: 6, flexDirection: 'row', marginRight: 8 }]}
                onPress={() => setIsCompareMode(true)}>
                <Icon name="git-compare-outline" size={18} color="#3b2c85" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b2c85' }}>Compare</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.nearbyToggle, showNearbyOnly && styles.nearbyToggleActive]}
                onPress={() => setShowNearbyOnly(!showNearbyOnly)}
              >
                <Icon name="navigate-outline" size={20} color={showNearbyOnly ? "#ffffff" : "#3b2c85"} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search saved places..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {allTags.length > 0 && (
        <View style={styles.tagsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsScroll}>
            <TouchableOpacity
              style={[styles.tagChip, !selectedTag && styles.tagChipActive]}
              onPress={() => setSelectedTag(null)}
            >
              <Text style={[styles.tagText, !selectedTag && styles.tagTextActive]}>All</Text>
            </TouchableOpacity>
            {allTags.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, selectedTag === tag && styles.tagChipActive]}
                onPress={() => setSelectedTag(tag)}
              >
                <Text style={[styles.tagText, selectedTag === tag && styles.tagTextActive]}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b2c85" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load saved places</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : savedPlaces && savedPlaces.length > 0 ? (
        <FlatList
          data={savedPlaces}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSavedItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Icon name="bookmark-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No saved places yet</Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Nearby')}
          >
            <Text style={styles.exploreText}>Explore Nearby</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
  nearbyToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nearbyToggleActive: {
    backgroundColor: '#3b2c85',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#111827',
  },
  tagsContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tagsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tagChipActive: {
    backgroundColor: '#3b2c85',
    borderColor: '#3b2c85',
  },
  tagText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  tagTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
  },
  placeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  placeCardSelected: {
    backgroundColor: '#f5f3ff',
    borderColor: '#3b2c85',
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectionCircleActive: {
    backgroundColor: '#3b2c85',
    borderColor: '#3b2c85',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeInfo: {
    flex: 1,
    marginRight: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
    textTransform: 'capitalize',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  unsaveButton: {
    padding: 8,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 6,
  },
  notesText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#3b2c85',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
    marginBottom: 20,
  },
  exploreButton: {
    backgroundColor: '#3b2c85',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exploreText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
