import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authService } from '../../services/authService';
import Icon from 'react-native-vector-icons/Ionicons';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { RouteProp } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import AppButton from '../../components/Buttons/Button';
import CustomButton from '../../components/Buttons/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
  route: RouteProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email || '');
  const [password, setPassword] = useState(route.params?.password || '');
  const [showPassword, setShowPassword] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      try {
        const response = await authService.login({ email, password });

        if (response?.access_token) {
          await AsyncStorage.setItem('userToken', response.access_token);
          if (response.refresh_token) {
            await AsyncStorage.setItem('refreshToken', response.refresh_token);
          }
          return response;
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          'An error occurred during login. Please try again.';
        
        // If login fails because account is inactive (not verified), redirect to OTP screen
        if (errorMessage.toLowerCase().includes('inactive')) {
          Alert.alert(
            'Account Inactive',
            'Your account is not verified. Would you like us to send a new verification code?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Resend OTP', 
                onPress: async () => {
                  try {
                    await authService.resendOtp({ email });
                    navigation.navigate('OTPVerification', { email, password });
                  } catch (err: any) {
                    Alert.alert('Error', err?.response?.data?.message || 'Failed to resend OTP');
                  }
                }
              }
            ]
          );
          return;
        }

        Alert.alert('Login Failed', errorMessage);
        throw error;
      }
    },
    onSuccess: () => {
      navigation.replace('Home');
    }
  });

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      // First check verification status
      const status = await authService.getVerificationStatus(email);
      
      if (status.success && status.data.is_registered && !status.data.email_verified) {
        // User is registered but not verified
        Alert.alert(
          'Email Not Verified',
          'Your email is not verified. Would you like us to send a new verification code?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Resend OTP', 
              onPress: async () => {
                try {
                  await authService.resendOtp({ email });
                  navigation.navigate('OTPVerification', { email, password });
                } catch (err: any) {
                  Alert.alert('Error', err?.response?.data?.message || 'Failed to resend OTP');
                }
              }
            }
          ]
        );
        return;
      }
      
      // Proceed with login if verified or if registration status check fails (fallback to login)
      mutate({ email, password });
    } catch (error) {
      // If verification status check fails, try to login anyway (maybe the endpoint is down or user doesn't exist)
      mutate({ email, password });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Welcome Back! 👋</Text>
            <Text style={styles.subtitle}>
              Login to continue exploring{'\n'}amazing places
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email or Phone</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email or phone number"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Icon name="person-outline" size={20} color="#9ca3af" />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icon
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity> */}

            <CustomButton
              title="Login"
              onPress={handleSubmit}
              loading={isPending}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.replace('Register')}>
              <Text style={styles.toggleText}>Register</Text>
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
    backgroundColor: '#f8f9fa', // Light background
  },
  container: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  headerContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827', // Dark gray
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280', // Slate 500
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#4f46e5', // Purple
    fontSize: 14,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9ca3af',
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  socialIcon: {
    marginRight: 12,
  },
  socialButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 15,
  },
  toggleText: {
    color: '#4f46e5',
    fontSize: 15,
    fontWeight: '700',
  },
});
