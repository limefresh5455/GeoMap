import React from 'react';
import { StyleSheet, Text, View,  TouchableOpacity, FlatList, Image, StatusBar } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'AllPhotos'>;
  route: RouteProp<AuthStackParamList, 'AllPhotos'>;
};

export default function AllPhotosScreen({ navigation, route }: Props) {
  const { photos = [] } = route.params || {};

  // For visual consistency with Figma, we'll duplicate the dummy photos if there are few
  const displayPhotos = photos.length > 0 ? [...photos, ...photos, ...photos] : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Photos</Text>
        <Text style={styles.headerRight}>{displayPhotos.length} Photos</Text>
      </View>

      {/* Grid */}
      <FlatList
        data={displayPhotos}
        numColumns={3}
        keyExtractor={(item, index) => index.toString()}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: item }} style={styles.gridImage} />
          </View>
        )}
        contentContainerStyle={styles.gridContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b2c85',
  },
  gridContainer: {
    padding: 8,
  },
  imageWrapper: {
    flex: 1/3,
    padding: 4,
    aspectRatio: 1,
  },
  gridImage: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
});
