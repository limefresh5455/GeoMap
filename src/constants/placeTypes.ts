// All Google Places API (New) Table A place types, organized by category
// Used for filter UI in NearbyScreen

export interface PlaceTypeCategory {
  id: string;
  label: string;
  icon: string; // Ionicons name
  types: { value: string; label: string }[];
}

export const PLACE_TYPE_CATEGORIES: PlaceTypeCategory[] = [
  {
    id: 'food_drink',
    label: 'Food & Drink',
    icon: 'restaurant-outline',
    types: [
      { value: 'restaurant', label: 'Restaurant' },
      { value: 'cafe', label: 'Café' },
      { value: 'bakery', label: 'Bakery' },
      { value: 'bar', label: 'Bar' },
      { value: 'coffee_shop', label: 'Coffee Shop' },
      { value: 'fast_food_restaurant', label: 'Fast Food' },
      { value: 'ice_cream_shop', label: 'Ice Cream' },
      { value: 'meal_delivery', label: 'Meal Delivery' },
      { value: 'meal_takeaway', label: 'Takeaway' },
      { value: 'pizza_restaurant', label: 'Pizza' },
      { value: 'seafood_restaurant', label: 'Seafood' },
      { value: 'steak_house', label: 'Steak House' },
      { value: 'sushi_restaurant', label: 'Sushi' },
      { value: 'vegetarian_restaurant', label: 'Vegetarian' },
      { value: 'indian_restaurant', label: 'Indian' },
      { value: 'chinese_restaurant', label: 'Chinese' },
      { value: 'japanese_restaurant', label: 'Japanese' },
      { value: 'korean_restaurant', label: 'Korean' },
      { value: 'thai_restaurant', label: 'Thai' },
      { value: 'mexican_restaurant', label: 'Mexican' },
      { value: 'italian_restaurant', label: 'Italian' },
      { value: 'french_restaurant', label: 'French' },
      { value: 'mediterranean_restaurant', label: 'Mediterranean' },
      { value: 'middle_eastern_restaurant', label: 'Middle Eastern' },
      { value: 'turkish_restaurant', label: 'Turkish' },
    ],
  },
  {
    id: 'shopping',
    label: 'Shopping',
    icon: 'cart-outline',
    types: [
      { value: 'shopping_mall', label: 'Shopping Mall' },
      { value: 'supermarket', label: 'Supermarket' },
      { value: 'grocery_store', label: 'Grocery Store' },
      { value: 'clothing_store', label: 'Clothing' },
      { value: 'convenience_store', label: 'Convenience Store' },
      { value: 'department_store', label: 'Department Store' },
      { value: 'electronics_store', label: 'Electronics' },
      { value: 'furniture_store', label: 'Furniture' },
      { value: 'home_goods_store', label: 'Home Goods' },
      { value: 'home_improvement_store', label: 'Home Improvement' },
      { value: 'jewelry_store', label: 'Jewelry' },
      { value: 'book_store', label: 'Books' },
      { value: 'shoe_store', label: 'Shoes' },
      { value: 'pet_store', label: 'Pet Store' },
      { value: 'sporting_goods_store', label: 'Sports Goods' },
      { value: 'gift_shop', label: 'Gift Shop' },
      { value: 'liquor_store', label: 'Liquor Store' },
      { value: 'market', label: 'Market' },
      { value: 'wholesaler', label: 'Wholesaler' },
    ],
  },
  {
    id: 'health',
    label: 'Health & Wellness',
    icon: 'medkit-outline',
    types: [
      { value: 'hospital', label: 'Hospital' },
      { value: 'pharmacy', label: 'Pharmacy' },
      { value: 'doctor', label: 'Doctor' },
      { value: 'dentist', label: 'Dentist' },
      { value: 'physiotherapist', label: 'Physiotherapist' },
      { value: 'spa', label: 'Spa' },
      { value: 'hair_salon', label: 'Hair Salon' },
      { value: 'beauty_salon', label: 'Beauty Salon' },
      { value: 'gym', label: 'Gym' },
    ],
  },
  {
    id: 'lodging',
    label: 'Hotels & Stays',
    icon: 'bed-outline',
    types: [
      { value: 'hotel', label: 'Hotel' },
      { value: 'motel', label: 'Motel' },
      { value: 'resort_hotel', label: 'Resort' },
      { value: 'bed_and_breakfast', label: 'B&B' },
      { value: 'campground', label: 'Campground' },
      { value: 'rv_park', label: 'RV Park' },
    ],
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    icon: 'game-controller-outline',
    types: [
      { value: 'movie_theater', label: 'Movie Theater' },
      { value: 'night_club', label: 'Night Club' },
      { value: 'amusement_park', label: 'Amusement Park' },
      { value: 'bowling_alley', label: 'Bowling' },
      { value: 'casino', label: 'Casino' },
      { value: 'zoo', label: 'Zoo' },
      { value: 'aquarium', label: 'Aquarium' },
      { value: 'museum', label: 'Museum' },
      { value: 'art_gallery', label: 'Art Gallery' },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    icon: 'construct-outline',
    types: [
      { value: 'bank', label: 'Bank' },
      { value: 'atm', label: 'ATM' },
      { value: 'post_office', label: 'Post Office' },
      { value: 'laundry', label: 'Laundry' },
      { value: 'car_wash', label: 'Car Wash' },
      { value: 'car_repair', label: 'Car Repair' },
      { value: 'gas_station', label: 'Gas Station' },
      { value: 'electric_vehicle_charging_station', label: 'EV Charging' },
      { value: 'parking', label: 'Parking' },
    ],
  },
  {
    id: 'education',
    label: 'Education',
    icon: 'school-outline',
    types: [
      { value: 'school', label: 'School' },
      { value: 'university', label: 'University' },
      { value: 'library', label: 'Library' },
      { value: 'preschool', label: 'Preschool' },
    ],
  },
  {
    id: 'transport',
    label: 'Transport',
    icon: 'bus-outline',
    types: [
      { value: 'bus_station', label: 'Bus Station' },
      { value: 'train_station', label: 'Train Station' },
      { value: 'subway_station', label: 'Subway' },
      { value: 'airport', label: 'Airport' },
      { value: 'light_rail_station', label: 'Light Rail' },
      { value: 'transit_station', label: 'Transit Station' },
      { value: 'taxi_stand', label: 'Taxi Stand' },
    ],
  },
  {
    id: 'religious',
    label: 'Places of Worship',
    icon: 'heart-outline',
    types: [
       { value: 'hindu_temple', label: 'Hindu Temple' },
      { value: 'church', label: 'Church' },
      { value: 'mosque', label: 'Mosque' },
      { value: 'synagogue', label: 'Synagogue' },
    ],
  },
  {
    id: 'outdoors',
    label: 'Outdoors & Sports',
    icon: 'leaf-outline',
    types: [
      { value: 'park', label: 'Park' },
      { value: 'tourist_attraction', label: 'Tourist Attraction' },
      { value: 'stadium', label: 'Stadium' },
      { value: 'swimming_pool', label: 'Swimming Pool' },
      { value: 'golf_course', label: 'Golf Course' },
      { value: 'ski_resort', label: 'Ski Resort' },
    ],
  },
];

// Flat list of all types for quick lookup
export const ALL_PLACE_TYPES = PLACE_TYPE_CATEGORIES.flatMap(cat => cat.types);

// Get icon for a place type
export function getPlaceTypeIcon(primaryType: string | null): string {
  if (!primaryType) return 'location-outline';
  
  for (const category of PLACE_TYPE_CATEGORIES) {
    if (category.types.some(t => t.value === primaryType)) {
      return category.icon;
    }
  }
  return 'location-outline';
}

// Get label for a place type
export function getPlaceTypeLabel(typeValue: string | null): string {
  if (!typeValue) return 'Place';
  
  for (const category of PLACE_TYPE_CATEGORIES) {
    const found = category.types.find(t => t.value === typeValue);
    if (found) return found.label;
  }
  // Fallback: convert snake_case to Title Case
  return typeValue
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Rank preference options
export const RANK_OPTIONS = [
  { value: 'POPULARITY', label: 'Popularity' },
  { value: 'DISTANCE', label: 'Distance' },
] as const;

// Radius options in meters
export const RADIUS_OPTIONS = [
  { value: 200, label: '200m' },
  { value: 500, label: '500m' },
  // { value: 1000, label: '1 km' },
  // { value: 2000, label: '2 km' },
  // { value: 5000, label: '5 km' },
] as const;

// Max result count options
export const MAX_RESULT_OPTIONS = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 15, label: '15' },
  // { value: 20, label: '20' },
] as const;
