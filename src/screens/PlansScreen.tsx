import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import Icon from 'react-native-vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../services/paymentService';
import { CreditPlan } from '../services/types';
import { authService } from '../services/authService';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Plans'>;
};

export default function PlansScreen({ navigation }: Props) {
  const queryClient = useQueryClient();

  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['creditPlans'],
    queryFn: () => paymentService.listPlans(),
  });

  const { data: userData } = useQuery({
    queryKey: ['me'],
    queryFn: () => authService.getMe(),
  });

  const createIntentMutation = useMutation({
    mutationFn: (planId: string) => paymentService.createPaymentIntent({ plan_id: planId }),
    onSuccess: async (response) => {
      if (response.success && response.data) {
        const { payment_intent_id } = response.data;

        // Redirect to Stripe (Mocking with a test payment link or generic Stripe URL)
        // In a real scenario without a backend, we might open a Stripe Payment Link
        const stripeTestUrl = 'https://checkout.stripe.com/c/pay/pk_test_mock';
        
        try {
          // Simulate "redirecting to stripe"
          Alert.alert(
            'Redirecting to Stripe',
            'You are being redirected to Stripe to complete your payment.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Continue',
                onPress: async () => {
                  // In a real app, you'd use Linking.openURL(stripeTestUrl);
                  // For this task, we'll simulate the success after "returning" from Stripe
                  
                  // Show a loading indicator or just proceed to success
                  confirmPaymentMutation.mutate(payment_intent_id);
                },
              },
            ]
          );
        } catch (error) {
          Alert.alert('Error', 'Failed to redirect to Stripe');
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to initiate payment');
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'An error occurred');
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (paymentIntentId: string) =>
      paymentService.confirmPayment({ payment_intent_id: paymentIntentId }),
    onSuccess: (response) => {
      if (response.success) {
        Alert.alert('Success', 'Credits purchased successfully!', [
          {
            text: 'OK',
            onPress: () => {
              queryClient.invalidateQueries({ queryKey: ['me'] });
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to confirm payment');
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'An error occurred during confirmation');
    },
  });

  const handlePurchase = (plan: CreditPlan) => {
    createIntentMutation.mutate(plan.id);
  };

  if (isLoadingPlans) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b2c85" />
      </View>
    );
  }

  const plans = plansData?.data || [
    {
      id: 'basic',
      name: 'Basic',
      credits: 10,
      price: 5,
      currency: 'USD',
      description: 'Perfect for casual explorers',
    },
    {
      id: 'pro',
      name: 'Pro',
      credits: 50,
      price: 20,
      currency: 'USD',
      description: 'Best for frequent travelers',
    },
    {
      id: 'premium',
      name: 'Premium',
      credits: 150,
      price: 50,
      currency: 'USD',
      description: 'Ultimate power for power users',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Purchase Credits</Text>
        <View style={styles.creditBadge}>
          <Icon name="flash" size={16} color="#3b2c85" />
          <Text style={styles.creditText}>{userData?.credits || 0}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>Choose a plan that fits your needs</Text>

        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={styles.planCard}
            onPress={() => handlePurchase(plan)}
            disabled={createIntentMutation.isPending || confirmPaymentMutation.isPending}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDescription}>{plan.description}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <Text style={styles.priceText}>{plan.price}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.planFooter}>
              <View style={styles.creditInfo}>
                <Icon name="flash" size={20} color="#3b2c85" />
                <Text style={styles.planCredits}>{plan.credits} Credits</Text>
              </View>
              <View style={styles.purchaseButton}>
                {createIntentMutation.isPending && createIntentMutation.variables === plan.id ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.purchaseButtonText}>Buy Now</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <Icon name="information-circle-outline" size={20} color="#6b7280" />
          <Text style={styles.infoText}>
            Credits are used for AI travel assistance and premium location features. Credits never expire.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  creditText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b2c85',
  },
  scrollContent: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
  },
  priceText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 16,
  },
  planFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planCredits: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b2c85',
  },
  purchaseButton: {
    backgroundColor: '#3b2c85',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
});
