import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { placeService } from '../services/placeService';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type QASession = {
  session_id: string;
  place: {
    place_id: string;
    name: string;
    address: string;
  };
  title: string;
  last_message: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
};

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getPlaceInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('');
}

// Color palette for avatar backgrounds
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#2563eb',
];

function getAvatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const ChatScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const queryClient = useQueryClient();
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);

  const { data: sessions, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['AllChats'],
    queryFn: async () => {
      const response = await placeService.listSessions();
      return (response?.sessions || []) as any[];
    },
    staleTime: 60 * 1000,
  });

  const deleteSessionsMutation = useMutation({
    mutationFn: (ids: string[]) => placeService.deleteSessions(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['AllChats'] });
      setIsSelectMode(false);
      setSelectedSessions([]);
      Alert.alert('Success', 'Selected chats deleted');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to delete chats');
    },
  });

  const handleSessionPress = (session: QASession) => {
    if (isSelectMode) {
      toggleSelection(session.session_id);
    } else {
      navigation.navigate('ChatDetail', {
        sessionId: session.session_id,
        placeName: session.place.name,
        placeAddress: session.place.address,
        placeId: session.place.place_id,
      });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedSessions(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedSessions.length === 0) return;
    Alert.alert(
      'Delete Chats',
      `Are you sure you want to delete ${selectedSessions.length} conversation(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteSessionsMutation.mutate(selectedSessions) 
        },
      ]
    );
  };

  const renderSessionItem = ({ item }: { item: QASession }) => {
    const initials = getPlaceInitials(item.place.name);
    const avatarColor = getAvatarColor(item.session_id as any);
    const timeAgo = formatTimeAgo(item.last_message_at);
    const isSelected = selectedSessions.includes(item.session_id);

    return (
      <TouchableOpacity
        style={[styles.sessionCard, isSelected && styles.sessionCardSelected]}
        activeOpacity={0.6}
        onPress={() => handleSessionPress(item)}
        onLongPress={() => {
          setIsSelectMode(true);
          toggleSelection(item.session_id);
        }}>
        {/* Avatar / Selection Circle */}
        <View style={[styles.avatar, { backgroundColor: isSelectMode ? (isSelected ? '#3b2c85' : '#e5e7eb') : avatarColor }]}>
          {isSelectMode ? (
            <Icon name={isSelected ? "checkmark" : "ellipse-outline"} size={24} color="#ffffff" />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.sessionContent}>
          <View style={styles.sessionTopRow}>
            <Text style={styles.placeName} numberOfLines={1}>
              {item?.place?.name}
            </Text>
            {!isSelectMode && <Text style={styles.timeText}>{timeAgo}</Text>}
          </View>
          <View style={styles.sessionBottomRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item?.last_message}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3b2c85" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isSelectMode ? (
            <TouchableOpacity onPress={() => { setIsSelectMode(false); setSelectedSessions([]); }}>
              <Icon name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <Icon name="chatbubbles" size={24} color="#ffffff" />
          )}
          <Text style={styles.headerTitle}>
            {isSelectMode ? `${selectedSessions.length} Selected` : 'Geo Chat'}
          </Text>
        </View>
        <View style={styles.headerRightActions}>
          {isSelectMode ? (
            <TouchableOpacity onPress={handleDeleteSelected} disabled={selectedSessions.length === 0}>
              <Icon name="trash-outline" size={24} color={selectedSessions.length > 0 ? "#ffffff" : "rgba(255,255,255,0.5)"} />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.agentButton}
                onPress={() => navigation.navigate('AgentTravelChat')}>
                <Icon name="airplane" size={20} color="#ffffff" />
                <Text style={styles.agentButtonText}>AI Agent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.searchButton}>
                <Icon name="search-outline" size={22} color="#ffffff" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Sessions List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b2c85" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : sessions && sessions.length > 0 ? (
        <FlatList
          data={sessions}
          keyExtractor={item => item.session_id.toString()}
          renderItem={renderSessionItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon name="chatbubbles-outline" size={48} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Ask a question on any place to start a conversation
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => {
              // Navigate to Nearby tab
              const parent = navigation.getParent();
              if (parent) {
                parent.navigate('Nearby');
              }
            }}>
            <Icon name="compass-outline" size={18} color="#ffffff" />
            <Text style={styles.emptyButtonText}>Explore Nearby</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#3b2c85',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#3b2c85',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  agentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  agentButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // List
  listContent: {
    backgroundColor: '#ffffff',
    paddingTop: 8,
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 82,
  },

  // Session card
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  sessionCardSelected: {
    backgroundColor: '#f3f4f6',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  sessionContent: {
    flex: 1,
    marginLeft: 14,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  sessionTitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 3,
    fontWeight: '500',
  },
  sessionBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 13,
    color: '#9ca3af',
    flex: 1,
    marginRight: 8,
  },
  messageBadge: {
    backgroundColor: '#3b2c85',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  messageBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#6b7280',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b2c85',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ChatScreen;