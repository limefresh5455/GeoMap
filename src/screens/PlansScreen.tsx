import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import Icon from 'react-native-vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../services/paymentService';
import { useStripe } from '@stripe/stripe-react-native';
import { CreditPlan, Transaction } from '../services/types';
import { authService } from '../services/authService';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Plans'>;
};

export default function PlansScreen({ navigation }: Props) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<CreditPlan | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [purchasedDetails, setPurchasedDetails] = useState<{
    credits: number;
    inr: number;
    currency: string;
  } | null>(null);
  const [customAmountText, setCustomAmountText] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);

  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['creditPlans'],
    queryFn: () => paymentService.listPlans(),
  });

  const { data: userData } = useQuery({
    queryKey: ['me'],
    queryFn: () => authService.getMe(),
  });

  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['paymentHistory'],
    queryFn: () => paymentService.getPaymentHistory(),
  });

  const createIntentMutation = useMutation({
    mutationFn: ({plan,amount_inr}:{plan: string,amount_inr:number}) => paymentService.createPaymentIntent({ package:plan ,amount_inr }),
    onSuccess: async (response) => {
      if (response.success && response) {
        const { client_secret, payment_intent_id } = response;

        const { error } = await initPaymentSheet({
          paymentIntentClientSecret: client_secret,
          merchantDisplayName: 'Geo App',
          defaultBillingDetails: {
            email: userData?.email,
          },
        });

        if (error) {
          Alert.alert('Error', error.message);
          return;
        }

        const { error: presentError } = await presentPaymentSheet();

        if (presentError) {
          if (presentError.code !== 'Canceled') {
            Alert.alert('Error', presentError.message);
          }
          return;
        }

        // Confirm payment on backend
        const creditsReceived = selectedPlan 
          ? selectedPlan.credits 
          : Math.floor((createIntentMutation.variables?.amount_inr || 0) / 3);
        const amountCharged = selectedPlan 
          ? selectedPlan.inr 
          : (createIntentMutation.variables?.amount_inr || 0);

         setPurchasedDetails({
          credits: creditsReceived,
          inr: amountCharged,
          currency: selectedPlan?.currency || 'INR',
        });
        setSuccessModalVisible(true);
        queryClient.invalidateQueries({ queryKey: ['me'] });
        queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
      } else {
        Alert.alert('Error', response?.message || 'Failed to initiate payment');
      }
    },
    onError: (error: any) => {
       console.log(error?.response,"Error======================")
      Alert.alert('Error', error.message || 'An error occurred');
    },
  });

  // const confirmPaymentMutation = useMutation({
  //   mutationFn: (paymentIntentId: string) =>
  //     paymentService.confirmPayment({ payment_intent_id: paymentIntentId }),
  //   onSuccess: (response) => {
  //     if (response.success) {
      
  //     } else {
  //       Alert.alert('Error', response.message || 'Failed to confirm payment');
  //     }
  //   },
  //   onError: (error: any) => {
  //     Alert.alert('Error', error.message || 'An error occurred during confirmation');
  //   },
  // });

  const handlePurchase = (plan: CreditPlan) => {
    console.log(plan,"plan=======================>>>")
    setSelectedPlan(plan);
    createIntentMutation.mutate({plan:plan?.label,amount_inr:plan?.inr});
  };

  const handleCustomPurchase = () => {
    const customAmount = parseInt(customAmountText, 10);
    if (isNaN(customAmount) || customAmount < 100) {
      Alert.alert('Error', 'Minimum amount is ₹100');
      return;
    }
    setSelectedPlan(null);
    createIntentMutation.mutate({ plan: 'custom', amount_inr: customAmount });
  };

  if (isLoadingPlans) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b2c85" />
      </View>
    );
  }

  const plans = plansData?.packages || [
     {
            "inr": 150,
            "credits": 50,
            "label": "Starter",
            "currency": "INR"
        },
        {
            "inr": 300,
            "credits": 110,
            "label": "Popular",
            "currency": "INR"
        },
        {
            "inr": 500,
            "credits": 190,
            "label": "Pro",
            "currency": "INR"
        },
  ];

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  const getCurrencySymbol = (currency?: string) => {
    if (currency === 'INR') return '₹';
    if (currency === 'USD') return '$';
    return '₹'; // Default to INR since backend updated to INR packages
  };

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
        <Text style={styles.subtitle}>Choose a plan or enter custom amount</Text>

        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.label}
            style={styles.planCard}
            onPress={() => handlePurchase(plan)}
            disabled={createIntentMutation.isPending}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>{plan.label}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.currencySymbol}>{getCurrencySymbol(plan.currency)}</Text>
                <Text style={styles.priceText}>{plan.inr}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.planFooter}>
              <View style={styles.creditInfo}>
                <Icon name="flash" size={20} color="#3b2c85" />
                <Text style={styles.planCredits}>{plan.credits} Credits</Text>
              </View>
              <View style={styles.purchaseButton}>
                {createIntentMutation.isPending && createIntentMutation.variables?.plan === plan.label ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.purchaseButtonText}>Buy Now</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Custom Pricing Card */}
        <View style={styles.customCard}>
          <Text style={styles.customTitle}>Custom Credits</Text>
          <Text style={styles.customSubtitle}>Need more? Add any custom amount (₹3 per credit, min ₹100).</Text>
          
          <View style={styles.customInputContainer}>
            <Text style={styles.customCurrencyPrefix}>₹</Text>
            <TextInput
              style={styles.customInput}
              placeholder="Enter amount (min 100)"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={customAmountText}
              onChangeText={setCustomAmountText}
            />
          </View>
          
          {customAmountText !== '' && (
            <View style={styles.customCalculation}>
              {parseInt(customAmountText, 10) < 100 ? (
                <Text style={styles.errorText}>Minimum amount must be ₹100</Text>
              ) : (
                <Text style={styles.calculationText}>
                  You will receive:{' '}
                  <Text style={styles.calculationHighlight}>
                    {Math.floor(parseInt(customAmountText, 10) / 3)} Credits
                  </Text>
                </Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.customPurchaseButton,
              (createIntentMutation.isPending || !customAmountText || parseInt(customAmountText, 10) < 100) && styles.disabledButton
            ]}
            onPress={handleCustomPurchase}
            disabled={createIntentMutation.isPending || !customAmountText || parseInt(customAmountText, 10) < 100}
          >
            {createIntentMutation.isPending && !selectedPlan ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.customPurchaseButtonText}>Buy Custom Credits</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Icon name="information-circle-outline" size={20} color="#6b7280" />
          <Text style={styles.infoText}>
            Credits are used for AI travel assistance and premium location features. Credits never expire.
          </Text>
        </View>

        {/* Payment History Section */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Payment History</Text>
          {isLoadingHistory ? (
            <ActivityIndicator size="small" color="#3b2c85" style={{ marginVertical: 20 }} />
          ) : historyData?.transactions && historyData.transactions.length > 0 ? (
            <>
              {historyData.transactions.slice(0, showAllHistory ? undefined : 3).map((tx: Transaction) => (
                <View key={tx.id} style={styles.txCard}>
                  <View style={styles.txRow}>
                    <View style={styles.txIconContainer}>
                      <Icon name="flash" size={18} color="#3b2c85" />
                    </View>
                    <View style={styles.txDetails}>
                      <Text style={styles.txCredits}>+{tx.credits_purchased} Credits</Text>
                      <Text style={styles.txDate}>{formatDate(tx.completed_at || tx.created_at)}</Text>
                    </View>
                    <View style={styles.txAmountContainer}>
                      <Text style={styles.txAmount}>${(tx.amount_usd || 0).toFixed(2)}</Text>
                      <View style={[
                        styles.statusBadge,
                        tx.status === 'succeeded' ? styles.statusSuccess : styles.statusPending
                      ]}>
                        <Text style={[
                          styles.statusText,
                          tx.status === 'succeeded' ? styles.statusTextSuccess : styles.statusTextPending
                        ]}>
                          {tx.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              {historyData.transactions.length > 3 && (
                <TouchableOpacity
                  style={styles.seeAllButton}
                  onPress={() => setShowAllHistory(!showAllHistory)}
                >
                  <Text style={styles.seeAllText}>
                    {showAllHistory ? 'Show Less' : `See All (${historyData.transactions.length})`}
                  </Text>
                  <Icon
                    name={showAllHistory ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#3b2c85"
                  />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyHistory}>
              <Icon name="receipt-outline" size={32} color="#9ca3af" />
              <Text style={styles.emptyHistoryText}>No transactions found</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Premium Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Icon name="checkmark-circle" size={54} color="#2c853bff" />
              </View>
            </View>

            <Text style={styles.modalTitle}>Credits Added!</Text>
            <Text style={styles.modalSubtitle}>
              Your payment has been successfully processed and your credits are ready to use.
            </Text>

            <View style={styles.receiptContainer}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Credits Received</Text>
                <View style={styles.receiptValueBadge}>
                  <Icon name="flash" size={14} color="#3b2c85" />
                  <Text style={styles.receiptValueBold}>{purchasedDetails?.credits} Credits</Text>
                </View>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Amount Charged</Text>
                <Text style={styles.receiptValue}>
                  {purchasedDetails?.currency === 'USD' ? '$' : ''}
                  {(purchasedDetails?.inr || 0).toFixed(2)} {purchasedDetails?.currency !== 'USD' ? purchasedDetails?.currency : ''}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 40,
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
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#3730a3',
    lineHeight: 18,
  },
  historySection: {
    marginTop: 32,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  txCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txCredits: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  txDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  statusSuccess: {
    backgroundColor: '#d1fae5',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusTextSuccess: {
    color: '#065f46',
  },
  statusTextPending: {
    color: '#92400e',
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyHistoryText: {
    color: '#6b7280',
    marginTop: 8,
    fontSize: 14,
  },
  customCard: {
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
  customTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  customSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  customCurrencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginRight: 6,
  },
  customInput: {
    flex: 1,
    height: 46,
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  customCalculation: {
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
  },
  calculationText: {
    fontSize: 14,
    color: '#4b5563',
  },
  calculationHighlight: {
    fontWeight: '700',
    color: '#3b2c85',
  },
  customPurchaseButton: {
    backgroundColor: '#3b2c85',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
  customPurchaseButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
    gap: 6,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b2c85',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f0fff0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e6ffe1ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  receiptContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  receiptValueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f0ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  receiptValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b2c85',
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  modalButton: {
    backgroundColor: '#3b2c85',
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#3b2c85',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

