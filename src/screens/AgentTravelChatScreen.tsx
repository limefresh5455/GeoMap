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
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'AgentTravelChat'>;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export default function AgentTravelChatScreen({ navigation }: Props) {
  const [messageText, setMessageText] = useState('');
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [typingDots, setTypingDots] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBotTyping) {
      interval = setInterval(() => {
        setTypingDots(prev => (prev.length >= 3 ? '' : prev + '.'));
      }, 400);
    } else {
      setTypingDots('');
    }
    return () => clearInterval(interval);
  }, [isBotTyping]);

  useEffect(() => {
    const loadSession = async () => {
      const savedSessionId = await AsyncStorage.getItem('agent_travel_session_id');
      if (savedSessionId) {
        setSessionId(savedSessionId);
      }
      
      const savedMessages = await AsyncStorage.getItem('agent_travel_messages');
      if (savedMessages) {
        setDisplayMessages(JSON.parse(savedMessages));
      } else {
        // Initial greeting
        const greeting: Message = {
          id: 'greeting',
          role: 'assistant',
          content: 'Hello! I am your Travel Agent. How can I help you plan your trip today?',
          created_at: new Date().toISOString(),
        };
        setDisplayMessages([greeting]);
      }
    };
    loadSession();
  }, []);

  useEffect(() => {
    if (!isStreaming) {
      AsyncStorage.setItem('agent_travel_messages', JSON.stringify(displayMessages));
    }
    if (sessionId) {
      AsyncStorage.setItem('agent_travel_session_id', sessionId);
    }
  }, [displayMessages, sessionId, isStreaming]);

  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: async (content: string) => {
      // Using the exact endpoint /api/v1/chat/message as requested
      // Note: api instance baseURL already includes /api/v1
      const response = await api.post('/chat/message', {
        query: content,
        session_id: sessionId
      });
      return response?.data;
    },
    onSuccess: (data) => {
      const newSessionId = data?.session_id || data?.data?.session_id;
      if (newSessionId && !sessionId) {
        setSessionId(newSessionId);
      }
      
      const assistantText = data?.response || data?.message || data?.content || data?.answer || "";
      if (assistantText) {
        simulateStreaming(assistantText);
      } else {
        setIsBotTyping(false);
      }
    },
    onError: (error: any) => {
      setIsBotTyping(false);
      const errorMessage =
          error?.response?.data?.detail ||
          error?.response?.data?.message || "Something went wrong. Please try again."
      Alert.alert('Error', errorMessage);
    },
  });

  const simulateStreaming = (fullText: string) => {
    setIsBotTyping(false);
    setIsStreaming(true);
    
    const assistantMessageId = Date.now().toString();
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
      }
    }, 20);
  };

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed || isSending || isBotTyping || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setDisplayMessages(prev => [...prev, userMessage]);
    setMessageText('');
    setIsBotTyping(true);

    sendMessage(trimmed);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageBubbleRow,
          isUser ? styles.messageBubbleRowRight : styles.messageBubbleRowLeft,
        ]}>
        {!isUser && (
          <View style={styles.assistantIconContainer}>
            <Icon name="airplane" size={14} color="#3b2c85" />
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
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#3b2c85" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Travel Agent</Text>
          <Text style={styles.headerSubtitle}>AI Assistant</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerAction}
          onPress={() => {
            Alert.alert('Clear Chat', 'Are you sure you want to clear the conversation?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => {
                setDisplayMessages([]);
                setSessionId(null);
                AsyncStorage.removeItem('agent_travel_messages');
                AsyncStorage.removeItem('agent_travel_session_id');
              }}
            ]);
          }}>
          <Icon name="trash-outline" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={() => isBotTyping && (
            <View style={[styles.messageBubbleRow, styles.messageBubbleRowLeft]}>
              <View style={styles.assistantIconContainer}>
                <Icon name="airplane" size={14} color="#3b2c85" />
              </View>
              <View style={[styles.messageBubble, styles.assistantBubble, { paddingVertical: 12, paddingHorizontal: 16, minWidth: 50 }]}>
                <Text style={{ fontSize: 18, color: '#3b2c85', fontWeight: '700', letterSpacing: 2 }}>
                  {typingDots || ' '}
                </Text>
              </View>
            </View>
          )}
        />

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type your travel query..."
              placeholderTextColor="#9ca3af"
              value={messageText}
              onChangeText={setMessageText}
              multiline
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#3b2c85',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  headerAction: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f0eff5',
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexGrow: 1,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageBubbleRowRight: {
    justifyContent: 'flex-end',
  },
  messageBubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  assistantIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e8e6f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#3b2c85',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#ffffff',
  },
  assistantMessageText: {
    color: '#1f2937',
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingHorizontal: 12,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b2c85',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
});
