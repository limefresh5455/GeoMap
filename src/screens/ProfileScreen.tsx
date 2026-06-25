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
import { authService } from '../services/authService';
import { locationService } from '../services/locationService';
import { weatherService } from '../services/weatherService';
import { placeService } from '../services/placeService';
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
  const { data: meData, isLoading: meLoading, error: meError, refetch: refetchMe } = useQuery({
    queryKey: ['authMe'],
    queryFn: async () => {
      const data = await authService.getMe();
      return data || null;
    },
  });

  // 2. Fetch Location History
  const { data: historyList = [], isLoading: historyLoading, error: historyError, refetch: refetchHistory } = useQuery({
    queryKey: ['locationsHistory'],
    queryFn: async () => {
      const res = await locationService.getHistory();
      return res.data?.items || [];
    },
  });

  // 2.5 Fetch Visit Stats
  const { data: visitStats, isLoading: statsLoading } = useQuery({
    queryKey: ['visitStats'],
    queryFn: () => placeService.getVisitStats(),
  });

  // 2.6 Fetch Saved Places Count
  const { data: savedPlacesData } = useQuery({
    queryKey: ['savedPlacesCount'],
    queryFn: () => placeService.listSaved(1, 1), // Just get the first page to get total_count
  });

  // 2.7 Fetch Weather
  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ['profileWeather'],
    queryFn: () => weatherService.getForecast(),
  });

  // 3. Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        const token = await AsyncStorage.getItem('refreshToken');
        await authService.logout(token || undefined);
      } catch (err) {
        console.log('Server logout failed. Proceeding with local logout:', err);
      }
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('refreshToken');
    },
    onSuccess: () => {
      queryClient.clear();
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

  // 4. Delete Location History Mutation
  const deleteHistoryMutation = useMutation({
    mutationFn: (locationId: number) => locationService.deleteCurrent(), // Note: API spec might need locationId param
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationsHistory'] });
      queryClient.invalidateQueries({ queryKey: ['GetSavedLocation'] });
      Alert.alert('Success', 'Location history item deleted successfully.');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to delete history item.';
      Alert.alert('Error', message);
    },
  });

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
    refetchHistory();
    queryClient.invalidateQueries({ queryKey: ['visitStats'] });
    queryClient.invalidateQueries({ queryKey: ['savedPlacesCount'] });
    queryClient.invalidateQueries({ queryKey: ['profileWeather'] });
  };

  const getWeatherIcon = (code: number, isDay: boolean = true) => {
    switch (code) {
      case 1000: return isDay ? 'sunny' : 'moon';
      case 1003: return isDay ? 'partly-sunny' : 'cloudy-night';
      case 1006:
      case 1009: return 'cloudy';
      case 1030:
      case 1135: return 'water';
      case 1063:
      case 1180:
      case 1183:
      case 1186:
      case 1189:
      case 1192:
      case 1195:
      case 1240:
      case 1243:
      case 1246: return 'rainy';
      case 1087:
      case 1273:
      case 1276:
      case 1279:
      case 1282: return 'thunderstorm';
      case 1114:
      case 1117:
      case 1210:
      case 1213:
      case 1216:
      case 1219:
      case 1222:
      case 1225:
      case 1255:
      case 1258: return 'snow';
      default: return 'thermometer';
    }
  };

  // Extract avatar character
  const displayName = meData?.full_name || 'User';
  const displayEmail = meData?.email || 'No email provided';
  const avatarChar = displayName.charAt(0).toUpperCase();

  const availableCredits = meData?.credits ?? 0;
  const totalCredits = 100; // Assuming a default total for UI
  const usedCredits = Math.max(0, totalCredits - availableCredits);

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

  const isAnyLoading = meLoading || historyLoading;

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

        {/* ===== Weather Card ===== */}
        {weatherLoading ? (
          <View style={[styles.sectionCard, styles.weatherCard, { justifyContent: 'center', alignItems: 'center', height: 120 }]}>
            <ActivityIndicator size="small" color="#3b2c85" />
            <Text style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>Loading weather...</Text>
          </View>
        ) : weatherData?.data ? (
          <TouchableOpacity 
            style={[styles.sectionCard, styles.weatherCard]}
            onPress={() => navigation.navigate('Weather')}
          >
            <View style={styles.weatherMain}>
              <View>
                <Text style={styles.weatherCity}>{weatherData.data.location?.city || 'Current Weather'}</Text>
                <Text style={styles.weatherTemp}>{weatherData.data.temperature?.current_c?.toFixed(1)}°C</Text>
                <Text style={styles.weatherCondition}>{weatherData.data.weather?.condition}</Text>
              </View>
              <Icon 
                name={getWeatherIcon(weatherData.data.weather?.condition_code || 1000, weatherData.data.weather?.is_day ?? true)} 
                size={56} 
                color="#3b2c85" 
              />
            </View>
            <View style={styles.weatherFooter}>
              <View style={styles.weatherStat}>
                <Icon name="water-outline" size={14} color="#6b7280" />
                <Text style={styles.weatherStatText}>{weatherData.data.atmosphere?.humidity}% Hum.</Text>
              </View>
              <View style={styles.weatherStat}>
                <Icon name="leaf-outline" size={14} color="#6b7280" />
                <Text style={styles.weatherStatText}>UV {weatherData.data.atmosphere?.uv_index}</Text>
              </View>
              <View style={styles.weatherStat}>
                <Icon name="navigate-outline" size={14} color="#6b7280" />
                <Text style={styles.weatherStatText}>{weatherData.data.wind?.speed_kph} km/h</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.sectionCard, styles.weatherCard, { padding: 16, alignItems: 'center' }]}>
            <Icon name="cloud-offline-outline" size={24} color="#d1d5db" />
            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>Weather unavailable. Set your location to see forecast.</Text>
          </View>
        )}

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

        {/* ===== Visit Statistics ===== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="stats-chart-outline" size={22} color="#3b2c85" />
            <Text style={styles.sectionTitle}>Visit Statistics</Text>
          </View>

          <View style={styles.visitStatsContainer}>
            <View style={styles.visitStatBox}>
              {statsLoading ? (
                <ActivityIndicator size="small" color="#3b2c85" />
              ) : (
                <Text style={styles.visitStatValue}>{visitStats?.total_visits || 0}</Text>
              )}
              <Text style={styles.visitStatLabel}>Visits</Text>
            </View>
            <View style={styles.visitStatBox}>
              {statsLoading ? (
                <ActivityIndicator size="small" color="#3b2c85" />
              ) : (
                <Text style={styles.visitStatValue}>{visitStats?.unique_places || 0}</Text>
              )}
              <Text style={styles.visitStatLabel}>Places</Text>
            </View>
            <View style={styles.visitStatBox}>
              <Text style={styles.visitStatValue}>{savedPlacesData?.total_count || 0}</Text>
              <Text style={styles.visitStatLabel}>Saved</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.historyLink}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.historyLinkText}>View Visit History</Text>
            <Icon name="chevron-forward" size={16} color="#4f46e5" />
          </TouchableOpacity>
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
              {dashboardHistory.map((item: LocationHistoryItem) => (
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
  weatherCard: {
    backgroundColor: '#ffffff',
    padding: 20,
  },
  weatherMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weatherCity: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  weatherTemp: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  weatherCondition: {
    fontSize: 14,
    color: '#3b2c85',
    fontWeight: '600',
  },
  weatherFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  weatherStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherStatText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
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
  visitStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  visitStatBox: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 6,
  },
  visitStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3b2c85',
  },
  visitStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  historyLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
    marginRight: 4,
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