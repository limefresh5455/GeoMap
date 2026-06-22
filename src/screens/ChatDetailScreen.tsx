import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ChatDetail'>;
  route: RouteProp<AuthStackParamList, 'ChatDetail'>;
};

type Message = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type SessionDetail = {
  session_id: number;
  place: {
    place_id: string;
    name: string;
    address: string;
  };
  title: string;
  messages: Message[];
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ChatDetailScreen({ navigation, route }: Props) {
  const {
    sessionId,
    placeName = 'Chat',
    placeAddress = '',
  } = route.params || {};
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();

  // Fetch session detail
  const {
    data: sessionData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['ChatSession', sessionId],
    queryFn: async () => {
      const response = await api.get(`/places/qa/sessions/${sessionId}`);
      const raw = response?.data;
      console.log('ChatDetail API response:', JSON.stringify(raw));
      // Handle potential wrapping: direct object, or nested in .data/.session
      const session = raw?.messages ? raw : (raw?.data || raw?.session || raw);
      return session as SessionDetail;
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });

  const messages = sessionData?.messages || [];
  console.log('Messages count:', messages.length, 'sessionId:', sessionId);

  // Send a new message
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post(`/places/${sessionData?.place?.place_id}/question`, {
        question: content,
        session_id: sessionId
      });
      return response?.data;
    },
    onSuccess: () => {
      setMessageText('');
     setTimeout(()=>{ refetch();},3000)
      // queryClient.invalidateQueries({ queryKey: ['AllChats'] });
    },
    onError: (error: any) => {
      console.log('Send message error:', error?.response?.data || error.message);
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;
    sendMessage(trimmed);
  };

  // Group messages by date
  const getDateLabel = (index: number): string | null => {
    if (index === 0) return formatDate(messages[0].created_at);
    const currentDate = new Date(messages[index].created_at).toDateString();
    const prevDate = new Date(messages[index - 1].created_at).toDateString();
    if (currentDate !== prevDate) return formatDate(messages[index].created_at);
    return null;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';
    const dateLabel = getDateLabel(index);

    return (
      <>
        {dateLabel && (
          <View style={styles.dateLabelContainer}>
            <View style={styles.dateLabelPill}>
              <Text style={styles.dateLabelText}>{dateLabel}</Text>
            </View>
          </View>
        )}
        <View
          style={[
            styles.messageBubbleRow,
            isUser ? styles.messageBubbleRowRight : styles.messageBubbleRowLeft,
          ]}>
          {!isUser && (
            <View style={styles.assistantIconContainer}>
              <Icon name="sparkles" size={14} color="#3b2c85" />
            </View>
          )}
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.userBubble : styles.assistantBubble,
            ]}>
            <Text
              style={[
                styles.messageText,
                isUser ? styles.userMessageText : styles.assistantMessageText,
              ]}>
              {item.content}
            </Text>
            <Text
              style={[
                styles.messageTime,
                isUser ? styles.userMessageTime : styles.assistantMessageTime,
              ]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3b2c85" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {placeName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {placeAddress}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Icon name="ellipsis-vertical" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Chat Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b2c85" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) =>
              item.id ? item.id.toString() : index.toString()
            }
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListHeaderComponent={
              <View style={styles.chatInfoCard}>
                <Icon name="location-outline" size={18} color="#3b2c85" />
                <Text style={styles.chatInfoText}>
                  Conversation about{' '}
                  <Text style={styles.chatInfoBold}>{placeName}</Text>
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Icon name="chatbubble-outline" size={40} color="#d1d5db" />
                <Text style={styles.emptyChatText}>
                  No messages yet. Ask something!
                </Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Ask a question..."
              placeholderTextColor="#9ca3af"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
              editable={!isSending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!messageText.trim() || isSending}>
              {isSending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Icon name="send" size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#3b2c85',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#3b2c85',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Chat
  chatContainer: {
    flex: 1,
    backgroundColor: '#f0eff5',
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // Chat info card
  chatInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8e6f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginVertical: 12,
    gap: 8,
    alignSelf: 'center',
  },
  chatInfoText: {
    fontSize: 12,
    color: '#6b7280',
  },
  chatInfoBold: {
    fontWeight: '600',
    color: '#3b2c85',
  },

  // Date label
  dateLabelContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateLabelPill: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dateLabelText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },

  // Message bubbles
  messageBubbleRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-end',
  },
  messageBubbleRowRight: {
    justifyContent: 'flex-end',
  },
  messageBubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  assistantIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e8e6f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#3b2c85',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: '#ffffff',
  },
  assistantMessageText: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.6)',
  },
  assistantMessageTime: {
    color: '#9ca3af',
  },

  // Input
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3b2c85',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },

  // Loading
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

  // Empty
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyChatText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
