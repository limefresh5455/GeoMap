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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { Menu } from "react-native-paper"
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

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#2563eb',
];

function getAvatarColor(id: any): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function getPlaceInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('');
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
    placeId
  } = route.params || {};
  const [messageText, setMessageText] = useState('');
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [typingDots, setTypingDots] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let interval: any;
    if (isBotTyping) {
      interval = setInterval(() => {
        setTypingDots(prev => (prev.length >= 3 ? '' : prev + '.'));
      }, 400);
    } else {
      setTypingDots('');
    }
    return () => clearInterval(interval);
  }, [isBotTyping]);
  const avatarColor = getAvatarColor(sessionId);
  const initials = getPlaceInitials(placeName);
  const [visible,setVisible]=useState(false);
const query =useQueryClient();
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

  // Sync display messages with session data
  useEffect(() => {
    if (sessionData?.messages && !isStreaming) {
      setDisplayMessages(sessionData.messages);
    }
  }, [sessionData?.messages, isStreaming]);

  // Send a new message
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post(`/places/${sessionData?.place?.place_id}/question`, {
        question: content,
        session_id: sessionId
      });
      return response?.data;
    },
    onSuccess: (data) => {
      const assistantText = data?.answer || data?.content || data?.message || data?.response || "";
      
      if (assistantText) {
        simulateStreaming(assistantText);
      } else {
        setIsBotTyping(false);
        refetch();
      }
    },
    onError: (error: any) => {
      setIsBotTyping(false);
      const errorMessage =
          error?.response?.data?.detail ||
          error?.response?.data?.message || ""
      Alert.alert('Error Sending Message', errorMessage);
      console.log('Send message error:', errorMessage);
    },
  });

  const simulateStreaming = (fullText: string) => {
    setIsBotTyping(false);
    setIsStreaming(true);
    const assistantMessageId = Date.now() + 1;
    const newAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    
    setDisplayMessages(prev => [...prev, newAssistantMessage]);

    let currentText = '';
    const characters = fullText.split('');
    let charIndex = 0;

    // Stream by characters for a smoother effect, or words for speed
    const interval = setInterval(() => {
      if (charIndex < characters.length) {
        currentText += characters[charIndex];
        setDisplayMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId ? { ...msg, content: currentText } : msg
          )
        );
        charIndex++;
      } else {
        clearInterval(interval);
        setIsStreaming(false);
        setTimeout(() => refetch(), 1000);
      }
    }, 20);
  };

  const handleDeleteSession = (sessionId: any) => {
  Alert.alert(
    'Delete Session',
    'Are you sure you want to delete this session?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteSession(sessionId),
      },
    ]
  );
};

  // delete session
  const {mutate:deleteSession,isPending:iseDeleting} =useMutation({
   mutationFn:async(sessionId:any)=>{   
           const response= await api.delete(`places/qa/sessions?session_ids=${sessionId}`);
           return response?.data;
   
   },
   onSuccess:()=>{
    query.invalidateQueries({ queryKey: ['AllChats'] });
    navigation.goBack();
   },
   onError:(error:any)=>{
    const errorMessage = error?.response?.data?.detail || error?.response?.data?.message ||"";
    Alert.alert('Error Deleting Chat', errorMessage);
    console.log('Delete chat error:', errorMessage);
   }
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    if (displayMessages.length > 0 || isBotTyping) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [displayMessages.length, isBotTyping]);

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed || isSending || isBotTyping || isStreaming) return;

    // Add user message immediately to UI
    const userMessage: Message = {
      id: Date.now(), // temporary ID
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setDisplayMessages(prev => [...prev, userMessage]);
    setMessageText('');
    setIsBotTyping(true);

    sendMessage(trimmed);
  };

  // Group messages by date
  const getDateLabel = (index: number): string | null => {
    if (index === 0) return formatDate(displayMessages[0].created_at);
    const currentDate = new Date(displayMessages[index].created_at).toDateString();
    const prevDate = new Date(displayMessages[index - 1].created_at).toDateString();
    if (currentDate !== prevDate) return formatDate(displayMessages[index].created_at);
    return null;
  };

  const renderTypingIndicator = () => {
    if (!isBotTyping) return null;
    return (
      <View style={[styles.messageBubbleRow, styles.messageBubbleRowLeft]}>
        <View style={styles.assistantIconContainer}>
          <Icon name="sparkles" size={14} color="#3b2c85" />
        </View>
        <View style={[styles.messageBubble, styles.assistantBubble, { paddingVertical: 12, paddingHorizontal: 16, minWidth: 50 }]}>
          <Text style={{ fontSize: 18, color: '#3b2c85', fontWeight: '700', letterSpacing: 2 }}>
            {typingDots || ' '}
          </Text>
        </View>
      </View>
    );
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
            {/* Avatar */}
           <TouchableOpacity
           onPress={() => navigation.navigate('PlaceDetails' as any,{placeId:placeId ,placeName:placeName ,placeAddress:placeAddress})}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View></TouchableOpacity>  
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {placeName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {placeAddress}
          </Text>
        </View>
        <Menu
          visible={visible}
          onDismiss={() => setVisible(false)}
          anchor={
          <TouchableOpacity 
          onPress={() => setVisible(true)}
          style={styles.headerAction}>
                  <Icon name="ellipsis-vertical" size={20} color="#ffffff" />
                </TouchableOpacity>
          }
        >
          <Menu.Item onPress={() => {
            if(placeId){
              navigation.navigate('PlaceDetails' as any,{placeId:placeId ,placeName:placeName ,placeAddress:placeAddress} )
            }
          }} title="View Place Details" />
          <Menu.Item onPress={() => {handleDeleteSession(sessionId)}} title="Delete Chat" />
        </Menu>
      
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
            data={displayMessages}
            keyExtractor={(item, index) =>
              item.id ? item.id.toString() : index.toString()
            }
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListFooterComponent={renderTypingIndicator}
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
              editable={!isSending && !isBotTyping && !isStreaming}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || isSending || isBotTyping || isStreaming) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!messageText.trim() || isSending || isBotTyping || isStreaming}>
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
  //avatar
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:"center",
    columnGap:10,
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
