import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { comparisonService } from '../services/comparisonService';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import Config from 'react-native-config';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Comparison'>;
  route: { params: { placeIds: string[] } };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH * 0.6;

export default function ComparisonScreen({ navigation, route }: Props) {
  const { placeIds, useBatch = false } = route.params;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['comparePlaces', placeIds, useBatch],
    queryFn: () => useBatch 
      ? comparisonService.compareBatch(placeIds)
      : comparisonService.compare({ placeIds }),
    enabled: placeIds && placeIds.length > 0,
  });

  const comparisonData = data?.comparison || [];

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '--';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value.toString();
  };

  const getPhotoUrl = (photoName: string | null): string | null => {
    if (!photoName) return null;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${Config.GOOGLE_MAPS_API_KEY}`;
  };

  const renderComparisonRow = (label: string, field: string, icon: string) => (
    <View style={styles.row}>
      <View style={styles.labelColumn}>
        <Icon name={icon} size={16} color="#6b7280" />
        <Text style={styles.labelText}>{label}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.valuesScroll}>
        {comparisonData.map((item: any) => (
          <View key={item.place_id} style={styles.valueColumn}>
            <Text style={styles.valueText}>{formatValue(item[field])}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b2c85" />
        <Text style={styles.loadingText}>Comparing places...</Text>
      </SafeAreaView>
    );
  }

  if (error || (data && !data.success)) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Icon name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={[styles.loadingText, { color: '#ef4444', marginTop: 16 }]}>
          {data?.message || 'Failed to compare places'}
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

  if (comparisonData.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Icon name="search-outline" size={64} color="#d1d5db" />
        <Text style={styles.loadingText}>No comparison data available</Text>
        <TouchableOpacity style={[styles.retryButton, { marginTop: 20 }]} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Place Comparison</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Place Names */}
        <View style={styles.placesHeader}>
          <View style={styles.labelColumn} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.valuesScroll}>
            {comparisonData.map((item: any) => (
              <View key={item.place_id} style={styles.placeHeaderColumn}>
                {item.photo_name ? (
                  <Image 
                    source={{ uri: getPhotoUrl(item.photo_name) }} 
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          {renderComparisonRow('Status', 'business_status', 'information-circle-outline')}
          {renderComparisonRow('Open Now', 'open_now', 'time-outline')}
          {renderComparisonRow('Price Level', 'price_level', 'cash-outline')}
          {renderComparisonRow('Type', 'primary_type', 'pricetag-outline')}
          {renderComparisonRow('Neighborhood', 'neighborhood', 'map-outline')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities & Services</Text>
          {renderComparisonRow('Dine In', 'dine_in', 'restaurant-outline')}
          {renderComparisonRow('Takeout', 'takeout', 'bag-handle-outline')}
          {renderComparisonRow('Delivery', 'delivery', 'bicycle-outline')}
          {renderComparisonRow('Outdoor Seating', 'outdoor_seating', 'sunny-outline')}
          {renderComparisonRow('Reservable', 'reservable', 'calendar-outline')}
          {renderComparisonRow('Wheelchair Acc.', 'wheelchair_accessible', 'body-outline')}
          {renderComparisonRow('EV Charging', 'ev_charging', 'battery-charging-outline')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment & Parking</Text>
          {renderComparisonRow('Cash Only', 'payment_cash', 'wallet-outline')}
          {renderComparisonRow('Credit Cards', 'payment_credit_cards', 'card-outline')}
          {renderComparisonRow('Contactless', 'payment_contactless', 'wifi-outline')}
          {renderComparisonRow('Free Parking', 'parking_free', 'car-outline')}
          {renderComparisonRow('Paid Parking', 'parking_paid', 'car-outline')}
          {renderComparisonRow('Valet Parking', 'parking_valet', 'car-sport-outline')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Atmosphere</Text>
          {renderComparisonRow('Good for Kids', 'good_for_children', 'happy-outline')}
          {renderComparisonRow('Good for Groups', 'good_for_groups', 'people-outline')}
          {renderComparisonRow('Live Music', 'live_music', 'musical-notes-outline')}
          {renderComparisonRow('Restroom', 'restroom', 'water-outline')}
        </View>

        {comparisonData.some((item: any) => item.wikipedia_extract) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            {renderComparisonRow('Wikipedia', 'wikipedia_extract', 'book-outline')}
          </View>
        )}
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
    width: COLUMN_WIDTH,
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
    width: COLUMN_WIDTH,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
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
