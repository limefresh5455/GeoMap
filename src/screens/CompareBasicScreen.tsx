import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { comparisonService } from '../services/comparisonService';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import Config from 'react-native-config';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'CompareBasic'>;
  route: { params: { placeIds: string[] } };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CompareBasicScreen({ navigation, route }: Props) {
  const { placeIds } = route.params;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['compareBasic', placeIds],
    queryFn: () => comparisonService.compareBasic({ place_ids: placeIds }),
    enabled: placeIds && placeIds.length > 0,
  });

  const comparisonData = data?.places || [];
  const attributeTable = data?.attribute_table || [];
  const highlights = data?.highlights || {};

  const numPlaces = comparisonData.length;
  const isScrollable = numPlaces > 3;
  const COLUMN_WIDTH = isScrollable ? SCREEN_WIDTH * 0.4 : SCREEN_WIDTH / numPlaces;

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '--';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value.toString();
  };

  const formatHighlightValue = (key: string, value: any) => {
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      const parts = [];
      if (value.name) parts.push(value.name);
      if (value.rating) parts.push(`${value.rating}★`);
      if (value.review_count) parts.push(`(${value.review_count} reviews)`);
      if (value.count) parts.push(`(${value.count} reviews)`);
      if (value.distance_km) parts.push(`${value.distance_km}km away`);
      return parts.join(' • ') || JSON.stringify(value);
    }
    return String(value);
  };

  const getPhotoUrl = (photoName: string | null): string | null => {
    if (!photoName) return null;
    if (photoName.startsWith('http')) return photoName;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${Config.GOOGLE_MAPS_API_KEY}`;
  };

  const renderComparisonRow = (label: string, field: string, icon: string) => (
    <View style={[styles.row, !isScrollable && styles.rowVertical]}>
      {isScrollable ? (
        <View style={styles.labelColumn}>
          <Icon name={icon} size={16} color="#6b7280" />
          <Text style={styles.labelText}>{label}</Text>
        </View>
      ) : (
        <View style={styles.fullWidthLabel}>
          <Icon name={icon} size={14} color="#3b2c85" />
          <Text style={styles.fullWidthLabelText}>{label}</Text>
        </View>
      )}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.valuesScroll}
        scrollEnabled={isScrollable}
        contentContainerStyle={!isScrollable && { flexGrow: 1 }}
      >
        {comparisonData.map((item) => (
          <View key={item.place_id} style={[styles.valueColumn, { width: COLUMN_WIDTH }]}>
            <Text style={styles.valueText}>{formatValue((item as any)[field])}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderAttributeRow = (row: any) => (
    <View key={row.key} style={[styles.row, !isScrollable && styles.rowVertical]}>
      {isScrollable ? (
        <View style={styles.labelColumn}>
          <Text style={styles.labelText}>{row.label}</Text>
        </View>
      ) : (
        <View style={styles.fullWidthLabel}>
          <Text style={styles.fullWidthLabelText}>{row.label}</Text>
        </View>
      )}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.valuesScroll}
        scrollEnabled={isScrollable}
        contentContainerStyle={!isScrollable && { flexGrow: 1 }}
      >
        {row.values.map((val: any) => (
          <View key={val.place_id} style={[styles.valueColumn, { width: COLUMN_WIDTH }]}>
            <Text style={styles.valueText}>{val.label || val.value || '--'}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#3b2c85" />
        <Text style={styles.loadingText}>Loading detailed comparison...</Text>
      </SafeAreaView>
    );
  }

  if (error || (data && !data.success)) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Icon name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={[styles.loadingText, { color: '#ef4444', marginTop: 16 }]}>
          {data?.message || 'Failed to load detailed comparison'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.retryButton, { marginTop: 12, backgroundColor: '#f3f4f6' }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.retryText, { color: '#4b5563' }]}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detailed Comparison</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Place Names */}
        <View style={[styles.placesHeader, !isScrollable && { paddingLeft: 0 }]}>
          {isScrollable && <View style={styles.labelColumn} />}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.valuesScroll}
            scrollEnabled={isScrollable}
            contentContainerStyle={!isScrollable && { flexGrow: 1 }}
          >
            {comparisonData.map((item: any) => (
              <View key={item.place_id} style={[styles.placeHeaderColumn, { width: COLUMN_WIDTH }]}>
                {item.photo_name || (item.photo_references && item.photo_references.length > 0) ? (
                  <Image 
                    source={{ uri: getPhotoUrl(item.photo_name || item.photo_references[0].name) }} 
                    style={styles.placeImage} 
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Icon name="business" size={32} color="#d1d5db" />
                  </View>
                )}
                <Text style={styles.placeName} numberOfLines={2}>{item.display_name}</Text>
                <View style={styles.ratingRow}>
                  <Icon name="star" size={14} color="#f59e0b" />
                  <Text style={styles.ratingText}>{item.rating?.toFixed(1) || 'N/A'}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Highlights Section */}
        {Object.keys(highlights).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Highlights</Text>
            {Object.entries(highlights).map(([key, value]: [string, any]) => (
              <View key={key} style={styles.highlightRow}>
                <Text style={styles.highlightLabel}>{key.replace(/_/g, ' ')}</Text>
                <Text style={styles.highlightValue}>{formatHighlightValue(key, value)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          {renderComparisonRow('Distance', 'distance_from_you_km', 'navigate-outline')}
          {renderComparisonRow('Status', 'business_status', 'information-circle-outline')}
          {renderComparisonRow('Open Now', 'open_now', 'time-outline')}
          {renderComparisonRow('Price Level', 'price_level', 'cash-outline')}
          {renderComparisonRow('Type', 'primary_type', 'pricetag-outline')}
        </View>

        {attributeTable.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attributes</Text>
            {attributeTable.map(renderAttributeRow)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities & Services</Text>
          {renderComparisonRow('Dine In', 'dine_in', 'restaurant-outline')}
          {renderComparisonRow('Takeout', 'takeout', 'bag-handle-outline')}
          {renderComparisonRow('Delivery', 'delivery', 'bicycle-outline')}
          {renderComparisonRow('Outdoor Seating', 'outdoor_seating', 'sunny-outline')}
          {renderComparisonRow('Reservable', 'reservable', 'calendar-outline')}
          {renderComparisonRow('Wheelchair Acc.', 'wheelchair_accessible', 'body-outline')}
          {renderComparisonRow('Dogs Allowed', 'allows_dogs', 'paw-outline')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Food & Drinks</Text>
          {renderComparisonRow('Breakfast', 'serves_breakfast', 'sunny-outline')}
          {renderComparisonRow('Lunch', 'serves_lunch', 'fast-food-outline')}
          {renderComparisonRow('Dinner', 'serves_dinner', 'moon-outline')}
          {renderComparisonRow('Brunch', 'serves_brunch', 'cafe-outline')}
          {renderComparisonRow('Vegetarian', 'serves_vegetarian_food', 'leaf-outline')}
        </View>

        {/* User Context Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Context</Text>
          <View style={[styles.row, !isScrollable && styles.rowVertical]}>
            {isScrollable ? (
              <View style={styles.labelColumn}>
                <Icon name="bookmark-outline" size={16} color="#6b7280" />
                <Text style={styles.labelText}>Saved</Text>
              </View>
            ) : (
              <View style={styles.fullWidthLabel}>
                <Icon name="bookmark-outline" size={14} color="#3b2c85" />
                <Text style={styles.fullWidthLabelText}>Saved</Text>
              </View>
            )}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.valuesScroll}
              scrollEnabled={isScrollable}
              contentContainerStyle={!isScrollable && { flexGrow: 1 }}
            >
              {comparisonData.map((item) => (
                <View key={item.place_id} style={[styles.valueColumn, { width: COLUMN_WIDTH }]}>
                  <Text style={styles.valueText}>{item.your_context?.is_saved ? 'Yes' : 'No'}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
          <View style={[styles.row, !isScrollable && styles.rowVertical]}>
            {isScrollable ? (
              <View style={styles.labelColumn}>
                <Icon name="footsteps-outline" size={16} color="#6b7280" />
                <Text style={styles.labelText}>Visited</Text>
              </View>
            ) : (
              <View style={styles.fullWidthLabel}>
                <Icon name="footsteps-outline" size={14} color="#3b2c85" />
                <Text style={styles.fullWidthLabelText}>Visited</Text>
              </View>
            )}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.valuesScroll}
              scrollEnabled={isScrollable}
              contentContainerStyle={!isScrollable && { flexGrow: 1 }}
            >
              {comparisonData.map((item) => (
                <View key={item.place_id} style={[styles.valueColumn, { width: COLUMN_WIDTH }]}>
                  <Text style={styles.valueText}>{item.your_context?.has_visited ? 'Yes' : 'No'}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Reviews</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.valuesScroll}
            scrollEnabled={isScrollable}
            contentContainerStyle={!isScrollable && { flexGrow: 1 }}
          >
             {comparisonData.map((item) => (
               <View key={item.place_id} style={[styles.valueColumn, { width: COLUMN_WIDTH }]}>
                 {item.top_reviews && item.top_reviews.length > 0 ? (
                   <View>
                     <Text style={styles.reviewAuthor}>{item.top_reviews[0].author_name}</Text>
                     <Text style={styles.reviewText} numberOfLines={4}>
                       "{item.top_reviews[0].text}"
                     </Text>
                   </View>
                 ) : (
                   <Text style={styles.reviewText}>No reviews available</Text>
                 )}
               </View>
             ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
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
  placesHeader: {
    flexDirection: 'row',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
  },
  placeHeaderColumn: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  placeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
    height: 40,
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
  section: {
    paddingVertical: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3b2c85',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  rowVertical: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingVertical: 0,
  },
  fullWidthLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f3f0ff',
    gap: 6,
  },
  fullWidthLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b2c85',
    textTransform: 'uppercase',
  },
  labelColumn: {
    width: 120,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    gap: 8,
  },
  labelText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  valuesScroll: {
    flex: 1,
  },
  valueColumn: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
  },
  reviewText: {
    fontSize: 12,
    color: '#4b5563',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
  reviewAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  highlightRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  highlightValue: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#3b2c85',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
