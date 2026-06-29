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
import { useMutation } from '@tanstack/react-query';
import CustomButton from '../../components/Buttons/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Verify OTP, 3: Reset Password
  const [showPassword, setShowPassword] = useState(false);

  const requestOtpMutation = useMutation({
    mutationFn: async (email: string) => {
      return await authService.forgotPassword({ email });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Verification code sent to your email');
      setStep(2);
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      const errorMessage = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join('\n')
        : typeof detail === 'string'
        ? detail
        : error?.response?.data?.message || 'Failed to send verification code';
      Alert.alert('Error', errorMessage);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      return await authService.verifyResetOtp({ email, otp });
    },
    onSuccess: (data) => {
      setResetToken(data.reset_token);
      setStep(3);
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      const errorMessage = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join('\n')
        : typeof detail === 'string'
        ? detail
        : error?.response?.data?.message || 'Invalid verification code';
      Alert.alert('Error', errorMessage);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      return await authService.resetPassword({ confirm_password:confirmPassword, new_password:newPassword }, resetToken);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Password reset successfully', [
        { text: 'Login', onPress: () => navigation.navigate('Login', { email }) },
      ]);
    },
    onError: (error: any) => {
      console.log(error?.response,"Error======")
      const detail = error?.response?.data?.detail;
      const errorMessage = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc.join('.')}: ${d.msg}`).join('\n')
        : typeof detail === 'string'
        ? detail
        : error?.response?.data?.message || 'Failed to reset password';
      Alert.alert('Error', errorMessage);
    },
  });

  const handleRequestOtp = () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    requestOtpMutation.mutate(email);
  };

  const handleVerifyOtp = () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }
    verifyOtpMutation.mutate();
  };

  const handleResetPassword = () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    resetPasswordMutation.mutate();
  };

  const getTitle = () => {
    switch (step) {
      case 1: return 'Forgot Password? 🔑';
      case 2: return 'Verify Code 📩';
      case 3: return 'New Password 🛡️';
      default: return 'Forgot Password';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 1: return "Enter your email address and we'll send you a code to reset your password";
      case 2: return `Enter the 6-digit verification code sent to ${email}`;
      case 3: return 'Choose a strong new password for your account';
      default: return '';
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
          onPress={() => {
            if (step === 2) setStep(1);
            else if (step === 3) setStep(2);
            else navigation.goBack();
          }}
        >
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.subtitle}>{getSubtitle()}</Text>
          </View>

          <View style={styles.formContainer}>
            {step === 1 && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Icon name="mail-outline" size={20} color="#9ca3af" />
                </View>
              </View>
            )}

            {step === 2 && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#9ca3af"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Icon name="keypad-outline" size={20} color="#9ca3af" />
                </View>
                <TouchableOpacity 
                  style={styles.resendButton}
                  onPress={handleRequestOtp}
                  disabled={requestOtpMutation.isPending}
                >
                  <Text style={styles.resendText}>Resend Code</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 3 && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter new password"
                      placeholderTextColor="#9ca3af"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Icon
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm new password"
                      placeholderTextColor="#9ca3af"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                    />
                    <Icon name="lock-closed-outline" size={20} color="#9ca3af" />
                  </View>
                </View>
              </>
            )}

            <CustomButton
              title={step === 1 ? 'Send Code' : step === 2 ? 'Verify Code' : 'Reset Password'}
              onPress={step === 1 ? handleRequestOtp : step === 2 ? handleVerifyOtp : handleResetPassword}
              loading={requestOtpMutation.isPending || verifyOtpMutation.isPending || resetPasswordMutation.isPending}
            />
          </View>
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
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
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
  resendButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  resendText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '600',
  },
});