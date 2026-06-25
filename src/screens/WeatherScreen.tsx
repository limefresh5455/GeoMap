import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { weatherService } from '../services/weatherService';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Weather'>;
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

export default function WeatherScreen({ navigation }: Props) {
  const { data: weather, isLoading: weatherLoading, error: weatherError } = useQuery({
    queryKey: ['weatherForecast'],
    queryFn: () => weatherService.getForecast(),
  });

  const { data: airQuality, isLoading: aqiLoading } = useQuery({
    queryKey: ['airQuality'],
    queryFn: () => weatherService.getAirQuality(),
  });

  const weatherData = weather?.data;
  const aqiData = airQuality?.data;

  if (weatherLoading || aqiLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b2c85" />
        <Text style={styles.loadingText}>Fetching weather data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weather & Air Quality</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {weatherData ? (
          <>
            <View style={styles.mainCard}>
              <Text style={styles.cityText}>{weatherData.location?.city || 'Current Location'}</Text>
              <Text style={styles.timeText}>As of {weatherData.location?.local_time}</Text>
              
              <View style={styles.tempRow}>
                <Icon
                  name={getWeatherIcon(weatherData.weather?.condition_code, weatherData.weather?.is_day)}
                  size={64}
                  color="#3b2c85"
                />
                <View style={styles.tempContainer}>
                  <Text style={styles.currentTemp}>{weatherData.temperature?.current_c?.toFixed(1)}°C</Text>
                  <Text style={styles.conditionText}>{weatherData.weather?.condition}</Text>
                </View>
              </View>

              <View style={styles.subInfoRow}>
                <View style={styles.subInfoItem}>
                  <Text style={styles.subInfoLabel}>Feels Like</Text>
                  <Text style={styles.subInfoValue}>{weatherData.temperature?.feels_like_c?.toFixed(1)}°C</Text>
                </View>
                <View style={styles.subInfoItem}>
                  <Text style={styles.subInfoLabel}>Humidity</Text>
                  <Text style={styles.subInfoValue}>{weatherData.atmosphere?.humidity}%</Text>
                </View>
                <View style={styles.subInfoItem}>
                  <Text style={styles.subInfoLabel}>Wind</Text>
                  <Text style={styles.subInfoValue}>{weatherData.wind?.speed_kph} km/h</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Air Quality Index</Text>
              <View style={styles.aqiCard}>
                <View style={styles.aqiMain}>
                  <Text style={styles.aqiValue}>{aqiData?.hourly?.us_aqi?.[0] || 'N/A'}</Text>
                  <Text style={styles.aqiLabel}>US AQI</Text>
                </View>
                <View style={styles.aqiDetails}>
                  <Text style={styles.aqiStatus}>
                    {(aqiData?.hourly?.us_aqi?.[0] || 0) <= 50 ? 'Good' : 'Moderate'}
                  </Text>
                  <Text style={styles.aqiDescription}>
                    Air quality is satisfactory, and air pollution poses little or no risk.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Atmosphere</Text>
              <View style={styles.grid}>
                <View style={styles.gridItem}>
                  <Icon name="eye-outline" size={20} color="#6b7280" />
                  <Text style={styles.gridLabel}>Visibility</Text>
                  <Text style={styles.gridValue}>{weatherData.atmosphere?.visibility_km} km</Text>
                </View>
                <View style={styles.gridItem}>
                  <Icon name="speedometer-outline" size={20} color="#6b7280" />
                  <Text style={styles.gridLabel}>Pressure</Text>
                  <Text style={styles.gridValue}>{weatherData.atmosphere?.pressure_mb} mb</Text>
                </View>
                <View style={styles.gridItem}>
                  <Icon name="sunny-outline" size={20} color="#6b7280" />
                  <Text style={styles.gridLabel}>UV Index</Text>
                  <Text style={styles.gridValue}>{weatherData.atmosphere?.uv_index}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Icon name="cloud-outline" size={20} color="#6b7280" />
                  <Text style={styles.gridLabel}>Cloud Cover</Text>
                  <Text style={styles.gridValue}>{weatherData.atmosphere?.cloud_cover}%</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Icon name="cloud-offline-outline" size={64} color="#d1d5db" />
            <Text style={styles.errorText}>Unable to load weather data</Text>
          </View>
        )}
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
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    padding: 16,
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  cityText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  timeText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    marginBottom: 24,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 32,
  },
  tempContainer: {
    flex: 1,
  },
  currentTemp: {
    fontSize: 48,
    fontWeight: '800',
    color: '#3b2c85',
  },
  conditionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: -4,
  },
  subInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 20,
  },
  subInfoItem: {
    alignItems: 'center',
  },
  subInfoLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  subInfoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginLeft: 4,
  },
  aqiCard: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  aqiMain: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#dcfce7',
  },
  aqiValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#166534',
  },
  aqiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    marginTop: -2,
  },
  aqiDetails: {
    flex: 1,
    paddingLeft: 20,
    justifyContent: 'center',
  },
  aqiStatus: {
    fontSize: 18,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  aqiDescription: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
    opacity: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  gridLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
});
