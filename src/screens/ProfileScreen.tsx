import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

type ProfileScreenProps = {
  navigation: any;
};

interface LocationHistoryItem {
  id: number;
  user_id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  source: string;
  created_at: string;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const queryClient = useQueryClient();
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // 1. Fetch User Profile Info
  const { data: meRaw, isLoading: meLoading, error: meError, refetch: refetchMe } = useQuery({
    queryKey: ['authMe'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
  });

  // 2. Fetch Credits Balance Info
  const { data: balanceRaw, isLoading: balanceLoading, error: balanceError, refetch: refetchBalance } = useQuery({
    queryKey: ['authBalance'],
    queryFn: async () => {
      const res = await api.get('/auth/balance');
      return res.data;
    },
  });

  // 3. Fetch Location History
  const { data: historyRaw, isLoading: historyLoading, error: historyError, refetch: refetchHistory } = useQuery({
    queryKey: ['locationsHistory'],
    queryFn: async () => {
      const res = await api.get('/locations/history');
      console.log(res,'res===================>>>>>')
      return res.data?.data?.items;
    },
  });

  // 4. Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await api.post('/auth/logout');
      } catch (err) {
        console.log('Server logout failed or endpoint not found. Proceeding with local logout:', err);
      }
      await AsyncStorage.removeItem('userToken');
    },
    onSuccess: () => {
      // Clear React Query cache
      queryClient.clear();
      // Reset navigation stack to Initial welcome screen
      const parentNav = navigation.getParent() || navigation;
      parentNav.reset({
        index: 0,
        routes: [{ name: 'Initial' }],
      });
    },
    onError: (error) => {
      Alert.alert('Logout Error', 'Failed to log out. Please try again.');
      console.error(error);
    },
  });

  // 5. Delete Location History Mutation
  const deleteHistoryMutation = useMutation({
    mutationFn: async (locationId: number) => {
      const res = await api.delete(`/locations/current?location_id=${locationId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationsHistory'] });
      queryClient.invalidateQueries({ queryKey: ['GetSavedLocation'] });
      queryClient.invalidateQueries({ queryKey: ['authBalance'] });
      Alert.alert('Success', 'Location history item deleted successfully.');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to delete history item.';
      Alert.alert('Error', message);
      console.error(error);
    },
  });

  // Helpers to resolve nested structure if backend wraps response inside `data` property
  const meData = meRaw?.data || meRaw;
  const balanceData = balanceRaw?.data || balanceRaw;
  const rawHistoryList = historyRaw?.data || historyRaw;
  const historyList: LocationHistoryItem[] = Array.isArray(rawHistoryList) ? rawHistoryList : [];

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => logoutMutation.mutate(),
      },
    ]);
  };

  const handleDeleteHistory = (id: number) => {
    Alert.alert(
      'Delete History',
      'Are you sure you want to delete this location history item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteHistoryMutation.mutate(id),
        },
      ]
    );
  };

  const handleRefreshAll = () => {
    refetchMe();
    refetchBalance();
    refetchHistory();
  };

  // Extract avatar character
  const displayName = meData?.name || 'User';
  const displayEmail = meData?.email || 'No email provided';
  const avatarChar = displayName.charAt(0).toUpperCase();

  // Resolve Credit fields (camelCase / snake_case fallback)
  const availableCredits = balanceData?.available_credits ?? balanceData?.availableCredits ?? 0;
  const usedCredits = balanceData?.used_credits ?? balanceData?.usedCredits ?? 0;
  const totalCredits = balanceData?.total_credits ?? balanceData?.totalCredits ?? 0;

  // Format Date string
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderHistoryItem = ({ item }: { item: LocationHistoryItem }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyIconContainer}>
        <Icon
          name={item.source === 'gps' ? 'navigate-circle' : 'pin'}
          size={24}
          color={item.source === 'gps' ? '#4f46e5' : '#0ea5e9'}
        />
      </View>
      <View style={styles.historyContent}>
        <Text style={styles.historyCoordinates}>
          {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
        </Text>
        <Text style={styles.historyTime}>{formatDate(item.created_at)}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={[
            styles.sourceBadge,
            { backgroundColor: item.source === 'gps' ? '#eef2ff' : '#f0f9ff' },
          ]}
        >
          <Text
            style={[
              styles.sourceText,
              { color: item.source === 'gps' ? '#4f46e5' : '#0369a1' },
            ]}
          >
            {item.source || 'manual'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteHistory(item.id)}
          style={styles.deleteIconButton}
          disabled={deleteHistoryMutation.isPending}
        >
          {deleteHistoryMutation.isPending ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Icon name="trash-outline" size={20} color="#ef4444" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const isAnyLoading = meLoading || balanceLoading || historyLoading;

  if (isAnyLoading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3b2c85" />
        <Text style={styles.loaderText}>Loading Profile...</Text>
      </SafeAreaView>
    );
  }

  // Show a few items on the dashboard, e.g. top 3
  const dashboardHistory = historyList.slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={handleRefreshAll} style={styles.refreshButton}>
          <Icon name="refresh" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ===== Avatar & Bio Details ===== */}
        <View style={styles.profileCard}>
          <View style={styles.avatarGradient}>
            <Text style={styles.avatarText}>{avatarChar}</Text>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{displayEmail}</Text>
          {meData?.created_at && (
            <Text style={styles.joinedText}>
              Member since {new Date(meData.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
            </Text>
          )}
        </View>

        {/* ===== Credits Balance ===== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="wallet-outline" size={22} color="#3b2c85" />
            <Text style={styles.sectionTitle}>Credit Balance</Text>
          </View>

          <View style={styles.creditStatsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Available</Text>
              <Text style={[styles.statValue, { color: '#10b981' }]}>{availableCredits}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Used</Text>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>{usedCredits}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={[styles.statValue, { color: '#3b2c85' }]}>{totalCredits}</Text>
            </View>
          </View>

          {/* Premium Progress Bar */}
          {totalCredits > 0 && (
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, (usedCredits / totalCredits) * 100)}%` },
                  ]}
                />
              </View>
              <View style={styles.progressLabelContainer}>
                <Text style={styles.progressLabel}>Usage Limit</Text>
                <Text style={styles.progressValue}>
                  {Math.round((usedCredits / totalCredits) * 100)}% Used
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ===== Location History ===== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderWithAction}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="location-outline" size={22} color="#3b2c85" />
              <Text style={styles.sectionTitle}>Location History</Text>
            </View>
            {historyList.length > 3 && (
              <TouchableOpacity onPress={() => setHistoryModalVisible(true)}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {historyList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="map-outline" size={40} color="#9ca3af" />
              <Text style={styles.emptyText}>No location history recorded yet.</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {dashboardHistory.map((item) => (
                <View key={item.id} style={{ marginBottom: 12 }}>
                  {renderHistoryItem({ item })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ===== Logout Button ===== */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <>
              <Icon name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ===== Full History Modal ===== */}
 {historyModalVisible &&     <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setHistoryModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Icon name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Complete History</Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={historyList}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.modalListContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        </SafeAreaView>
      </Modal>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loaderText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  refreshButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b2c85',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3b2c85',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  joinedText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  creditStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#f1f5f9',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 4,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  progressValue: {
    fontSize: 11,
    color: '#4f46e5',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  historyList: {
    marginTop: 4,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  historyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  historyContent: {
    flex: 1,
  },
  historyCoordinates: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 11,
    color: '#6b7280',
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  deleteIconButton: {
    padding: 8,
    marginLeft: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalListContent: {
    padding: 20,
  },
});