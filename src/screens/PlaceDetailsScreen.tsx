import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  StatusBar,
  FlatList,
  Linking,
  Dimensions,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewToken,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Share,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {AuthStackParamList} from '../navigation/AuthNavigator';
import Icon from 'react-native-vector-icons/Ionicons';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {placeService} from '../services/placeService';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Config from 'react-native-config';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CAROUSEL_HEIGHT = 280;

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'PlaceDetails'>;
  route: RouteProp<AuthStackParamList, 'PlaceDetails'>;
};

export default function PlaceDetailsScreen({navigation, route}: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const {
    placeId,
    placeName = 'Place',
    formatted_address,
    latitude,
    longitude,
    google_maps_uri,
    open_now,
    typeIcon,
    user_rating_count,
    rating,
    photoUrl,
  } = route.params || {};

  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisitModalVisible, setIsVisitModalVisible] = useState(false);
  const [visitRating, setVisitRating] = useState(5);
  const [visitReview, setVisitReview] = useState('');
  const [visitMood, setVisitMood] = useState('');

  const {data, isLoading} = useQuery({
    queryKey: ['GetPlaceDetailsById', placeId],
    queryFn: async () => {
      try {
        const response = await placeService.getDetails(placeId!);
        return response?.data;
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.detail ||
          error?.response?.data?.message || "";
        Alert.alert('Error Getting Place Details', errorMessage);
        throw error;
      }
    },
    staleTime: 60 * 10 * 1000,
    enabled: !!placeId,
  });

  const {data: savedPlaces} = useQuery({
    queryKey: ['savedPlaces'],
    queryFn: () => placeService.listSaved(),
  });

  const savedPlace = savedPlaces?.data?.find((p: any) => p.place_id === placeId);
  const isSaved = !!savedPlace;

  const saveMutation = useMutation({
    mutationFn: () => placeService.savePlace(placeId!),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['savedPlaces']});
      Alert.alert('Success', 'Place saved successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to save place');
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: () => placeService.unsavePlace(savedPlace!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['savedPlaces']});
      Alert.alert('Success', 'Place removed from saved');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to unsave place');
    },
  });

  const logVisitMutation = useMutation({
    mutationFn: () => placeService.logVisit(placeId!, {
      rating_given: visitRating,
      review_text: visitReview,
      mood: visitMood,
    }),
    onSuccess: () => {
      setIsVisitModalVisible(false);
      queryClient.invalidateQueries({queryKey: ['visits']});
      Alert.alert('Success', 'Visit logged successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to log visit');
    },
  });

  const getPhotoUrl: any = (photoName: string | null): string | null => {
    if (!photoName) return null;
    if (photoName.startsWith('http')) return photoName;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${Config.GOOGLE_MAPS_API_KEY}`;
  };

  // Build photos array from API data, falling back to the passed photoUrl
  const photos: any[] = data?.photos?.length
    ? data.photos
    : photoUrl
    ? [{ name: photoUrl }]
    : [];

  // Create new chat session and navigate to ChatDetail
  const {mutate: startChat, isPending: isStartingChat} = useMutation({
    mutationFn: async () => {
      return await placeService.askQuestion(placeId!, {
        question: `Tell me about ${placeName || data?.display_name}`,
      });
    },
    onSuccess: (responseData: any) => {
      const sessionId = responseData?.session_id;
      if (sessionId) {
        navigation.navigate('ChatDetail', {
          sessionId,
          placeName: (placeName || data?.display_name) ?? undefined,
          placeAddress: (formatted_address || data?.formatted_address) ?? undefined,
          placeId: placeId ?? undefined,
        });
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message || "";
      Alert.alert('Error Sending Message', errorMessage);
    },
  });

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: ViewToken[]}) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({viewAreaCoveragePercentThreshold: 50}).current;

  const onShare = async () => {
    try {
      const shareUrl = google_maps_uri || data?.google_maps_uri;
      const title = placeName || data?.display_name || 'Checkout this place';
      
      const message = `${title}  ${shareUrl ? `\n${shareUrl}` : ''}`;
      
      await Share.share({
        message,
        url: shareUrl || undefined,
        title,
      });
    } catch (error: any) {
      Alert.alert(error.message);
    }
  };

  const renderStars = (ratingValue: number = 0) => {
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = ratingValue % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.stars}>
        {[...Array(fullStars)].map((_, index) => (
          <Icon key={`full-${index}`} name="star" size={14} color="#f59e0b" />
        ))}
        {hasHalfStar && <Icon name="star-half" size={14} color="#f59e0b" />}
        {[...Array(emptyStars)].map((_, index) => (
          <Icon
            key={`empty-${index}`}
            name="star-outline"
            size={14}
            color="#d1d5db"
          />
        ))}
      </View>
    );
  };

  const renderCarouselItem = ({item}: {item: {name:string}}) => (
      <Image
        source={{uri: getPhotoUrl(item?.name)}}
        style={styles.carouselImage}
        resizeMode="cover"
      />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      {/* ===== ZONE 1: Floating Header Buttons ===== */}
      <View style={[styles.headerOverlay, { top: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => {
              if (isSaved) {
                unsaveMutation.mutate();
              } else {
                saveMutation.mutate();
              }
            }}
            style={[styles.iconButton, {marginRight: 12}]}>
            <Icon name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color={isSaved ? "#3b2c85" : "#111827"} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              navigation.navigate('Commute', {
                placeId,
                destinationName: (placeName || data?.display_name) ?? undefined,
                destinationLat: (latitude || data?.latitude) ?? undefined,
                destinationLng: (longitude || data?.longitude) ?? undefined,
              });
            }}
            style={styles.iconButton}>
            <Icon name="navigate" size={20} color="#111827" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={onShare}
            style={[styles.iconButton, {marginLeft: 12}]}>
            <Icon name="share-social-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== ZONE 2: Centered Image Carousel ===== */}
      <View style={styles.carouselContainer}>
        {photos.length > 0 ? (
          <>
            <FlatList
              data={photos.slice(0, 4)}
              renderItem={renderCarouselItem as any}
              keyExtractor={(item, index) => `photo-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              bounces={false}
              style={styles.carouselList}
            />
            {/* Dot Indicators */}
            {photos.slice(0, 4).length > 1 && (
              <View style={styles.dotContainer}>
                {photos.slice(0, 4).map((_, index) => (
                  <View
                    key={`dot-${index}`}
                    style={[
                      styles.dot,
                      index === activeIndex
                        ? styles.dotActive
                        : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>
            )}
            {/* Photo counter badge */}
            <View style={styles.photoBadge}>
              <Icon name="images-outline" size={12} color="#ffffff" />
              <Text style={styles.photoBadgeText}>
                {activeIndex + 1}/{Math.min(photos.length, 4)}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.placeholderImage}>
            <Icon
              name={(typeIcon as string) || 'location'}
              size={48}
              color="#9ca3af"
            />
            <Text style={styles.placeholderText}>No photos available</Text>
          </View>
        )}
      </View>

      {/* ===== ZONE 3: Bottom Info + Ask Button ===== */}
      <View style={styles.bottomSection}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Place Info */}
          <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.placeTitle} numberOfLines={2}>
              {placeName || data?.display_name}
            </Text>
            <TouchableOpacity 
              style={styles.logVisitButton}
              onPress={() => setIsVisitModalVisible(true)}
            >
              <Icon name="checkmark-circle-outline" size={20} color="#3b2c85" />
              <Text style={styles.logVisitText}>Log Visit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>{rating || data?.rating}</Text>
            {renderStars((rating || data?.rating) ?? 0)}
            <Text style={styles.reviewCount}>
              ({user_rating_count || data?.user_rating_count} review
              {user_rating_count !== 1 ? 's' : ''})
            </Text>
          </View>

          <View style={styles.addressRow}>
            <Icon name="location-outline" size={14} color="#6b7280" />
            <Text style={styles.detailsText} numberOfLines={2}>
              {formatted_address || data?.formatted_address}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                (open_now || data?.open_now)
                  ? styles.statusBadgeOpen
                  : styles.statusBadgeClosed,
              ]}>
              <View
                style={[
                  styles.statusDot,
                  (open_now || data?.open_now)
                    ? styles.statusDotOpen
                    : styles.statusDotClosed,
                ]}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  (open_now || data?.open_now)
                    ? styles.statusTextOpen
                    : styles.statusTextClosed,
                ]}>
                {open_now || data?.open_now ? 'Open Now' : 'Closed'}
              </Text>
            </View>
            {data?.price_level && (
              <View style={[styles.statusBadge, { marginLeft: 8, backgroundColor: '#f3f4f6' }]}>
                <Text style={[styles.statusBadgeText, { color: '#374151' }]}>
                  {data.price_level.replace('PRICE_LEVEL_', '').replace('INEXPENSIVE', '$').replace('MODERATE', '$$').replace('EXPENSIVE', '$$$').replace('VERY_EXPENSIVE', '$$$$')}
                </Text>
              </View>
            )}
          </View>

          {/* Contact & Website */}
          <View style={styles.contactSection}>
            {data?.international_phone_number && (
              <TouchableOpacity 
                style={styles.contactItem}
                onPress={() => Linking.openURL(`tel:${data.international_phone_number}`)}
              >
                <Icon name="call-outline" size={18} color="#3b2c85" />
                <Text style={styles.contactText}>{data.international_phone_number}</Text>
              </TouchableOpacity>
            )}
            {data?.website_uri && (
              <TouchableOpacity 
                style={styles.contactItem}
                onPress={() => Linking.openURL(data.website_uri!)}
              >
                <Icon name="globe-outline" size={18} color="#3b2c85" />
                <Text style={styles.contactText} numberOfLines={1}>{data.website_uri}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Editorial Summary */}
          {data?.editorial_summary && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.summaryText}>{data.editorial_summary}</Text>
            </View>
          )}

          {/* Opening Hours */}
          {data?.opening_hours?.weekday_descriptions && (
            <View style={styles.hoursSection}>
              <Text style={styles.sectionTitle}>Opening Hours</Text>
              {data.opening_hours.weekday_descriptions.map((day, index) => (
                <Text key={index} style={styles.hoursText}>{day}</Text>
              ))}
            </View>
          )}

          {/* Reviews */}
          {data?.reviews && data.reviews.length > 0 && (
            <View style={styles.reviewsSection}>
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              {data.reviews.slice(0, 3).map((review, index) => (
                <View key={index} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{review.author_name}</Text>
                    <View style={styles.reviewRating}>
                      <Text style={styles.reviewRatingText}>{review.rating}</Text>
                      <Icon name="star" size={12} color="#f59e0b" />
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>{review.relative_publish_time_description}</Text>
                  <Text style={styles.reviewText} numberOfLines={3}>{review.text}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

        {/* Ask About This Place Button */}
        <TouchableOpacity
          style={styles.askButton}
          activeOpacity={0.8}
          disabled={isStartingChat}
          onPress={() => startChat()}>
          {isStartingChat ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Icon name="chatbubble-ellipses-outline" size={20} color="#ffffff" />
              <Text style={styles.askButtonText}>Ask About This Place</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Visit Modal */}
      <Modal
        visible={isVisitModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVisitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Your Visit</Text>
            
            <Text style={styles.label}>Rating</Text>
            <View style={styles.modalStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setVisitRating(star)}>
                  <Icon 
                    name={star <= visitRating ? "star" : "star-outline"} 
                    size={32} 
                    color="#f59e0b" 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Review (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="How was your visit?"
              value={visitReview}
              onChangeText={setVisitReview}
              multiline
            />

            <Text style={styles.label}>Mood (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Fun, Romantic, Quiet"
              value={visitMood}
              onChangeText={setVisitMood}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setIsVisitModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={() => logVisitMutation.mutate()}
                disabled={logVisitMutation.isPending}
              >
                {logVisitMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
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
    backgroundColor: '#f9fafb',
  },

  // ===== Zone 1: Floating Header =====
  headerOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerRight: {
    flexDirection: 'row',
  },

  // ===== Zone 2: Carousel =====
  carouselContainer: {
    height: CAROUSEL_HEIGHT,
    backgroundColor: '#f3f4f6',
    position: 'relative',
  },
  carouselList: {
    height: CAROUSEL_HEIGHT,
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#3b2c85',
    width: 24,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  photoBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  photoBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  placeholderImage: {
    height: CAROUSEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9ca3af',
  },

  // ===== Zone 3: Bottom Section =====
  bottomSection: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  infoSection: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  placeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
    marginRight: 10,
  },
  logVisitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  logVisitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b2c85',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginRight: 6,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  reviewCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 4,
  },
  detailsText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusBadgeOpen: {
    backgroundColor: '#ecfdf5',
  },
  statusBadgeClosed: {
    backgroundColor: '#fef2f2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotOpen: {
    backgroundColor: '#10b981',
  },
  statusDotClosed: {
    backgroundColor: '#ef4444',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contactSection: {
    marginTop: 16,
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    fontSize: 14,
    color: '#3b2c85',
    textDecorationLine: 'underline',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 8,
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  hoursSection: {
    marginBottom: 16,
  },
  hoursText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
  },
  reviewsSection: {
    marginBottom: 16,
  },
  reviewItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  reviewDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 6,
  },
  reviewText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  statusTextOpen: {
    color: '#10b981',
  },
  statusTextClosed: {
    color: '#ef4444',
  },

  // ===== Ask Button =====
  askButton: {
    backgroundColor: '#3b2c85',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#3b2c85',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  askButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  modalStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#3b2c85',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
