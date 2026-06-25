import React, { useState, useRef, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authService } from '../../services/authService';
import Icon from 'react-native-vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from '../../components/Buttons/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'OTPVerification'>;
  route: RouteProp<AuthStackParamList, 'OTPVerification'>;
};

export default function OTPVerificationScreen({ navigation, route }: Props) {
  const { email, password } = route.params;
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Handle countdown timer for Resend OTP
 useEffect(() => {
  if (timer <= 0) {
    setCanResend(true);
    return;
  }

  const interval = setInterval(() => {
    setTimer((prev) => {
      if (prev <= 1) {
        clearInterval(interval);
        setCanResend(true);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(interval);
}, []);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input if a digit is typed
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Move to previous input on backspace if current field is empty
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Mutation for OTP verification
  const verifyMutation = useMutation({
    mutationFn: async (otpCode: string) => {
      try {
        const response = await authService.verifyOtp({ email, otp: otpCode });
        return response;
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          'Failed to verify OTP. Please check the code and try again.';
        Alert.alert('Verification Failed', errorMessage);
        throw error;
      }
    },
    onSuccess: async (data) => {
      // If we have a password, attempt automatic login for a premium UX
      if (password) {
        try {
          const loginResponse = await authService.login({ email, password });
          if (loginResponse?.access_token) {
            await AsyncStorage.setItem('userToken', loginResponse.access_token);
            if (loginResponse.refresh_token) {
              await AsyncStorage.setItem('refreshToken', loginResponse.refresh_token);
            }
            Alert.alert('Success', 'Verification successful! Welcome.', [
              { text: 'Get Started', onPress: () => navigation.replace('Home') },
            ]);
            return;
          }
        } catch (loginError) {
          console.log('Auto-login failed after verification:', loginError);
        }
      }

      // If auto-login fails or no password is provided, redirect to Login
      Alert.alert('Success', 'Email verified successfully! Please log in.', [
        { text: 'OK', onPress: () => navigation.replace('Login', { email }) },
      ]);
    },
  });

  // Mutation for Resending OTP
  const resendMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await authService.resendOtp(email);
        return response;
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          'Failed to resend verification code. Please try again.';
        Alert.alert('Error', errorMessage);
        throw error;
      }
    },
    onSuccess: () => {
      Alert.alert('Code Resent', 'A new verification code has been sent to your email.');
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    },
  });

  const handleVerify = () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      Alert.alert('Invalid Code', 'Please enter all 6 digits of the OTP.');
      return;
    }
    verifyMutation.mutate(otpCode);
  };

  const handleResend = () => {
    if (canResend) {
      resendMutation.mutate();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
            <View style={styles.iconContainer}>
              <Icon name="mail-open-outline" size={40} color="#3b2c85" />
            </View>
            <Text style={styles.title}>Verify Your Email 🔑</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit verification code to {'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
          </View>

          <View style={styles.otpWrapper}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref: any) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  digit !== '' && styles.otpInputFilled,
                ]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                selectTextOnFocus
              />
            ))}
          </View>

          <View style={styles.resendContainer}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend} disabled={resendMutation.isPending}>
                {resendMutation.isPending ? (
                  <ActivityIndicator size="small" color="#3b2c85" />
                ) : (
                  <Text style={styles.resendActionText}>Resend Verification Code</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendText}>
                Resend code in <Text style={styles.timerText}>{timer}s</Text>
              </Text>
            )}
          </View>

          <CustomButton
            title="Verify Code"
            onPress={handleVerify}
            loading={verifyMutation.isPending}
            disabled={otp.some((d) => d === '')}
            buttonStyle={styles.verifyButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eeebf7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  emailText: {
    fontWeight: '600',
    color: '#3b2c85',
  },
  otpWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  otpInputFilled: {
    borderColor: '#3b2c85',
    backgroundColor: '#faf9ff',
  },
  resendContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#6b7280',
  },
  timerText: {
    fontWeight: '700',
    color: '#3b2c85',
  },
  resendActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
    textDecorationLine: 'underline',
  },
  verifyButton: {
    width: '100%',
  },
});
