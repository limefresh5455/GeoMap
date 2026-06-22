import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,

  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  StatusBar,
  FlatList,
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import Icon from 'react-native-vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';
import CustomButton from '../components/Buttons/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'PlaceDetails'>;
  route: RouteProp<AuthStackParamList, 'PlaceDetails'>;
};

const DUMMY_PHOTOS = [
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&q=80',
];

const DUMMY_QUESTIONS = [
  { id: '1', text: 'Do they have outdoor seating?', user: 'Meera', answers: 1 },
  { id: '2', text: 'Is Wi-Fi available here?', user: 'Arjun', answers: 2 },
  { id: '3', text: 'Do they have parking?', user: 'Rohan', answers: 1 },
  {
    id: '4',
    text: 'What are the must try items here?',
    user: 'Pooja',
    answers: 3,
  },
];

export default function PlaceDetailsScreen({ navigation, route }: Props) {
  const {
    placeId,
    placeName = 'Place',
    formatted_address,
    latitude,
    longitude,
    google_maps_uri,
    open_now,
    typeIcon,
    user_rating_count,
    rating,
    photoUrl,
  } = route.params || {};
  const [activeTab, setActiveTab] = useState<'Overview' | 'Photos' | 'Q&A'>(
    'Overview',
  );
  const [qaMode, setQaMode] = useState<'Questions' | 'My Questions'>(
    'Questions',
  );
const [question,setQuestion]=useState<string>('');




const {mutate,isPending}=useMutation({
  mutationFn:async(payload:{question:string})=>{
    try {
      const response= await api.post(`/places/${placeId}/question`,payload);
     
    } catch (error:any) {
      console.log(error?.response,"Question Error===================");
      throw error;
    }
  }
})

// Render QA Section 
  // const renderQA = () => (
  //   <View style={styles.tabContent}>
  //     <View style={styles.qaToggleContainer}>
  //       <TouchableOpacity
  //         style={[
  //           styles.qaToggleBtn,
  //           qaMode === 'Questions' && styles.qaToggleActive,
  //         ]}
  //         onPress={() => setQaMode('Questions')}
  //       >
  //         <Text
  //           style={[
  //             styles.qaToggleText,
  //             qaMode === 'Questions' && styles.qaToggleTextActive,
  //           ]}
  //         >
  //           Questions
  //         </Text>
  //       </TouchableOpacity>
  //       <TouchableOpacity
  //         style={[
  //           styles.qaToggleBtn,
  //           qaMode === 'My Questions' && styles.qaToggleActive,
  //         ]}
  //         onPress={() => setQaMode('My Questions')}
  //       >
  //         <Text
  //           style={[
  //             styles.qaToggleText,
  //             qaMode === 'My Questions' && styles.qaToggleTextActive,
  //           ]}
  //         >
  //           My Questions
  //         </Text>
  //       </TouchableOpacity>
  //     </View>

  //     {DUMMY_QUESTIONS.map(q => (
  //       <View key={q.id} style={styles.questionCard}>
  //         <Text style={styles.questionText}>{q.text}</Text>
  //         <Text style={styles.questionSub}>
  //           Asked by {q.user} • {q.answers} answer{q.answers > 1 ? 's' : ''}
  //         </Text>
  //       </View>
  //     ))}
  //   </View>
  // );

  const renderStars = (rating: number = 0) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <View style={styles.stars}>
        {[...Array(fullStars)].map((_, index) => (
          <Icon key={`full-${index}`} name="star" size={14} color="#f59e0b" />
        ))}

        {hasHalfStar && <Icon name="star-half" size={14} color="#f59e0b" />}

        {[...Array(emptyStars)].map((_, index) => (
          <Icon
            key={`empty-${index}`}
            name="star-outline"
            size={14}
            color="#d1d5db"
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Cover Image */}
        <View style={styles.coverImageContainer}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverImage,styles.placeholderImage]}>
              <Icon name={typeIcon as string} size={24} color="#9ca3af" />
            </View>
          )}
          <View style={styles.headerOverlay}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => {
                  if (google_maps_uri) {
                    Linking.openURL(google_maps_uri);
                  }
                }}
                style={styles.iconButton}
              >
                <Icon name="navigate" size={20} color="#111827" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconButton, { marginLeft: 12 }]}>
                <Icon name="share-social-outline" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>
          {/* <View style={styles.imageBadge}>
            <Text style={styles.badgeText}>1/15</Text>
          </View> */}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.placeTitle}>{placeName}</Text>
            {/* <Icon name="checkmark-circle" size={20} color="#3b82f6" style={{ marginLeft: 6 }} /> */}
          </View>

          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>{rating}</Text>
            {renderStars(rating)}
            <Text style={styles.reviewCount}>({user_rating_count})</Text>
          </View>

          <Text style={styles.detailsText}>{formatted_address}</Text>
          <Text style={styles.statusText}>
            <Text style={styles.openText}>{open_now ? 'Open' : 'Close'}</Text>
          </Text>

          {/* Action Buttons */}
          {/* <View style={styles.actionsRow}> */}
          {/* <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}><Icon name="call" size={20} color="#3b2c85" /></View>
              <Text style={styles.actionLabel}>Call</Text>
            </TouchableOpacity> */}
          {/* <TouchableOpacity   style={styles.actionItem}>
              <View style={styles.actionIcon}><Icon name="navigate" size={20} color="#3b2c85" /></View>
              <Text style={styles.actionLabel}>Directions</Text>
            </TouchableOpacity> */}
          {/* <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}><Icon name="bookmark-outline" size={20} color="#3b2c85" /></View>
              <Text style={styles.actionLabel}>Save</Text>
            </TouchableOpacity> */}
          {/* <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}><Icon name="share-social" size={20} color="#3b2c85" /></View>
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity> */}
          {/* </View> */}
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {['Q&A'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabItem,
                activeTab === tab && styles.tabItemActive,
              ]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {/* {activeTab === 'Overview' && renderOverview()}
        {activeTab === 'Photos' && renderPhotos()} */}
        {/* {activeTab === 'Q&A' && renderQA()} */}

        {/* Extra space for floating footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Footer Input */}
      <View style={styles.footerInputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
          value={question}
          onChangeText={(text)=>setQuestion(text)}
            style={styles.input}
            placeholder="Ask a question about this place..."
            placeholderTextColor="#9ca3af"
          />
          <CustomButton onPress={()=>mutate({question})} title='Ask' loading={isPending} disabled={isPending}/>
          {/* <TouchableOpacity >
            <Icon name="send" size={20} color="#3b2c85" />
          </TouchableOpacity> */}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
  },
  coverImageContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f3f4f6',
  },
  headerOverlay: {
    position: 'absolute',
    top: 50, // To account for translucent status bar
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerRight: {
    flexDirection: 'row',
  },
  imageBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    padding: 24,
    backgroundColor: '#ffffff',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginRight: 6,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 6,
  },
  reviewCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailsText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  openText: {
    color: '#10b981', // Emerald 500
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 35,
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6', // Light gray/purple tint
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginHorizontal: 24,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#3b2c85',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b2c85',
  },
  tabContent: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  readMore: {
    color: '#3b2c85',
    fontWeight: '600',
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#3b2c85',
    fontWeight: '600',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridImage: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  qaToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  qaToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  qaToggleActive: {
    backgroundColor: '#3b2c85',
  },
  qaToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  qaToggleTextActive: {
    color: '#ffffff',
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  questionSub: {
    fontSize: 13,
    color: '#6b7280',
  },
  footerInputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
});
