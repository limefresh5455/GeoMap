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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { comparisonService } from '../services/comparisonService';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import Config from 'react-native-config';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'CompareRecommend'>;
  route: { params: { placeIds: string[] } };
};

export default function CompareRecommendScreen({ navigation, route }: Props) {
  const { placeIds } = route.params;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['compareRecommend', placeIds],
    queryFn: () => comparisonService.compareRecommend({ place_ids: placeIds }),
    enabled: placeIds && placeIds.length > 0,
  });

  const recommendations = data?.recommendations || [];
  const aiSummary = data?.overall_ai_summary;

  const getPhotoUrl = (photoName: string | null): string | null => {
    if (!photoName) return null;
    if (photoName.startsWith('http')) return photoName;
    return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${Config.GOOGLE_MAPS_API_KEY}`;
  };

  const renderRecommendationItem = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity 
      style={styles.placeCard}
      onPress={() => navigation.navigate('PlaceDetails', { placeId: item.place_id })}
    >
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>#{item.rank || index + 1}</Text>
      </View>
      
      {item.photo_references && item.photo_references.length > 0 ? (
        <Image 
          source={{ uri: getPhotoUrl(item.photo_references[0].name) }} 
          style={styles.placeImage} 
        />
      ) : (
        <View style={[styles.placeImage, { justifyContent: 'center', alignItems: 'center' }]}>
          <Icon name="business" size={32} color="#d1d5db" />
        </View>
      )}
      
      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{item.display_name}</Text>
        <View style={styles.ratingRow}>
          <Icon name="star" size={14} color="#f59e0b" />
          <Text style={styles.ratingText}>{item.rating?.toFixed(1) || 'N/A'}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.priceLevel}>{item.price_level || '$$'}</Text>
        </View>
        
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreBar, { width: `${item.overall_score}%` }]} />
          <Text style={styles.scoreText}>Match: {item.overall_score?.toFixed(0)}%</Text>
        </View>

        {item.ai_summary && (
          <Text style={styles.reasonText} numberOfLines={2}>
            {item.ai_summary}
          </Text>
        )}
      </View>
      
      <Icon name="chevron-forward" size={20} color="#d1d5db" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#3b2c85" />
        <Text style={styles.loadingText}>Analyzing recommendations...</Text>
      </SafeAreaView>
    );
  }

  if (error || (data && !data.success)) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <Icon name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={[styles.loadingText, { color: '#ef4444', marginTop: 16 }]}>
          {data?.message || 'Failed to get recommendations'}
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
        <Text style={styles.headerTitle}>Smart Recommendations</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.place_id}
        renderItem={renderRecommendationItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          aiSummary ? (
            <View style={styles.aiSummaryContainer}>
              <View style={styles.aiHeader}>
                <Icon name="sparkles" size={20} color="#3b2c85" />
                <Text style={styles.aiTitle}>AI Analysis</Text>
              </View>
              <Text style={styles.aiText}>{aiSummary}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="search-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No recommendations found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
  listContent: {
    padding: 16,
  },
  aiSummaryContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3b2c85',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rankBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: '#3b2c85',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  rankText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  placeImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  placeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 2,
  },
  dot: {
    fontSize: 12,
    color: '#d1d5db',
    marginHorizontal: 4,
  },
  priceLevel: {
    fontSize: 12,
    color: '#6b7280',
  },
  scoreContainer: {
    height: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    marginBottom: 6,
  },
  scoreBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#10b981',
    opacity: 0.2,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
  },
  reasonText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
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
