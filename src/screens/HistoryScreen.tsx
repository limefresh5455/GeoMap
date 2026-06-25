import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { placeService } from '../services/placeService';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'History'>;
};

export default function HistoryScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['visitStats'],
    queryFn: () => placeService.getVisitStats(),
  });

  const { data: visits, isLoading, error, refetch } = useQuery({
    queryKey: ['visitsHistory'],
    queryFn: async () => {
      const response = await placeService.listVisits();
      return response.data || [];
    },
  });

  const deleteVisitMutation = useMutation({
    mutationFn: (visitId: number) => placeService.deleteVisit(visitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitsHistory'] });
      queryClient.invalidateQueries({ queryKey: ['visitStats'] });
      Alert.alert('Success', 'Visit log deleted');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to delete visit');
    },
  });

  const handleDeleteVisit = (visitId: number) => {
    Alert.alert(
      'Delete Visit',
      'Are you sure you want to delete this visit log?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteVisitMutation.mutate(visitId) },
      ]
    );
  };

  const renderVisitItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.visitCard}
      onPress={() => navigation.navigate('PlaceDetails', { placeId: item.place_id, rating: item.rating_given || 0, user_rating_count: 0 })}
    >
      <View style={styles.visitHeader}>
        <Text style={styles.placeName}>{item.display_name || 'Unknown Place'}</Text>
        <TouchableOpacity onPress={() => handleDeleteVisit(item.id)}>
          <Icon name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
      <View style={styles.dateRow}>
        <Text style={styles.visitDate}>
          {new Date(item.visited_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.placeAddress} numberOfLines={1}>
        {item.formatted_address}
      </Text>
      <View style={styles.visitMeta}>
        <View style={styles.ratingBadge}>
          <Icon name="star" size={14} color="#f59e0b" />
          <Text style={styles.ratingText}>{item.rating_given || 'N/A'}</Text>
        </View>
        {item.mood && (
          <View style={styles.moodBadge}>
            <Text style={styles.moodText}>{item.mood}</Text>
          </View>
        )}
      </View>
      {item.review_text && (
        <Text style={styles.reviewText} numberOfLines={2}>
          "{item.review_text}"
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visit History</Text>
        <View style={{ width: 40 }} />
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total_visits}</Text>
            <Text style={styles.statLabel}>Total Visits</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.unique_places}</Text>
            <Text style={styles.statLabel}>Unique Places</Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b2c85" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load history</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : visits && visits.length > 0 ? (
        <FlatList
          data={visits}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderVisitItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Icon name="time-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>No visits logged yet</Text>
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3b2c85',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
  },
  listContent: {
    padding: 16,
  },
  visitCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  dateRow: {
    marginBottom: 8,
  },
  visitDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  placeAddress: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 12,
  },
  visitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
  },
  moodBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  moodText: {
    fontSize: 12,
    color: '#4b5563',
  },
  reviewText: {
    fontSize: 14,
    color: '#4b5563',
    fontStyle: 'italic',
    lineHeight: 20,
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
  },
});
