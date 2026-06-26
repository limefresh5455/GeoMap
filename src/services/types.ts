/**
 * Authentication Types
 */
export interface SignupRequest {
  full_name: string;
  email: string;
  password: string;
}

export interface SignupResponse {
  message: string;
  email: string;
  otp_expires_in_seconds: number;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
  user: UserResponse;
}

export interface UserResponse {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at?: string | null;
  credits: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ResendOTPRequest {
  email: string;
}

export interface VerificationStatusResponse {
  success: boolean;
  message: string;
  data: {
    is_registered: boolean;
    email_verified: boolean;
    full_name?: string | null;
  };
  timestamp: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token?: string | null;
}

export interface MessageResponse {
  message: string;
}

/**
 * Location Types
 */
export interface GPSUpdateRequest {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  speed?: number | null;
  client_timestamp?: string | null;
  metadata_notes?: string | null;
}

export interface ManualUpdateRequest {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  label?: string | null;
  metadata_notes?: string | null;
}

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data?: T | null;
  errors?: any | null;
  timestamp: string;
}

/**
 * Discovery Types
 */
export interface TextSearchRequest {
  text_query: string;
  location_bias?: LocationBias | null;
  open_now?: boolean | null;
  min_rating?: number | null;
  max_result_count?: number;
  rank_preference?: 'RELEVANCE' | 'DISTANCE' | null;
  use_user_location_as_bias?: boolean;
}

export interface LocationBias {
  latitude: number;
  longitude: number;
  radius?: number;
}

export interface DiscoveryPlaceResult {
  place_id: string | null;
  display_name: string | null;
  formatted_address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  user_rating_count: number | null;
  primary_type: string | null;
  types: string[] | null;
  business_status: string | null;
  google_maps_uri: string | null;
  open_now: boolean | null;
  price_level: string | null;
  first_photo_name: string | null;
}

export interface TextSearchResponse {
  success: boolean;
  search_mode: string;
  message: string;
  data: DiscoveryPlaceResult[];
  total_results: number;
  cached: boolean;
  query?: string | null;
  search_latitude?: number | null;
  search_longitude?: number | null;
  timestamp: string;
}

export interface NearbyDiscoveryRequest {
  radius?: number;
  max_result_count?: number;
  preset?: 'preferred_types' | 'famous_places' | null;
  included_types?: string[] | null;
  excluded_types?: string[] | null;
  rank_preference?: 'POPULARITY' | 'DISTANCE' | null;
}

export interface NearbyDiscoveryResponse {
  success: boolean;
  search_mode: string;
  message: string;
  data: DiscoveryPlaceResult[];
  total_results: number;
  cached: boolean;
  search_latitude: number;
  search_longitude: number;
  timestamp: string;
}

export interface AutocompletePrediction {
  place_id: string;
  main_text: string;
  secondary_text: string;
  full_text: string;
  types: string[];
}

export interface AutocompleteResponse {
  success: boolean;
  message: string;
  input: string;
  predictions: AutocompletePrediction[];
  total_predictions: number;
  cached: boolean;
  bias_latitude?: number | null;
  bias_longitude?: number | null;
  timestamp: string;
}

/**
 * Place Details Types
 */
export interface PlaceDetailResult {
  place_id: string;
  display_name: string | null;
  formatted_address: string | null;
  latitude: number | null;
  longitude: number | null;
  primary_type: string | null;
  types: string[] | null;
  international_phone_number: string | null;
  national_phone_number: string | null;
  website_uri: string | null;
  google_maps_uri: string | null;
  rating: number | null;
  user_rating_count: number | null;
  business_status: string | null;
  opening_hours: OpeningHours | null;
  open_now: boolean | null;
  photos: PlacePhoto[] | null;
  reviews: PlaceReview[] | null;
  price_level: string | null;
  wheelchair_accessible_entrance: boolean | null;
  editorial_summary: string | null;
  extended_data?: any | null;
  last_fetched_at: string | null;
  knowledge_synced: boolean | null;
}

export interface OpeningHours {
  open_now: boolean | null;
  weekday_descriptions: string[] | null;
  periods: OpeningHoursPeriod[] | null;
}

export interface OpeningHoursPeriod {
  open_day: number | null;
  open_hour: number | null;
  open_minute: number | null;
  close_day: number | null;
  close_hour: number | null;
  close_minute: number | null;
}

export interface PlacePhoto {
  name: string | null;
  width_px: number | null;
  height_px: number | null;
}

export interface PlaceReview {
  author_name: string | null;
  rating: number | null;
  text: string | null;
  publish_time: string | null;
  relative_publish_time_description: string | null;
}

export interface PlaceDetailsResponse {
  success: boolean;
  source: string;
  message: string;
  data: PlaceDetailResult;
  cached: boolean;
  timestamp: string;
}

/**
 * Place Q&A Types
 */
export interface PlaceQuestionRequest {
  question: string;
  session_id?: string | null;
  top_k?: number;
}

export interface PlaceQuestionResponse {
  success: boolean;
  session_id: string;
  answer: string;
  title?: string | null;
  is_new_session: boolean;
  metadata?: TechnicalMetadata | null;
  timestamp: string;
}

export interface TechnicalMetadata {
  answer_source: string;
  confidence_score?: number | null;
  knowledge_synced: boolean;
  pinecone_matches: number;
  model_used: string;
  context_tokens?: number | null;
  grounding_fragments?: GroundingFragment[] | null;
}

export interface GroundingFragment {
  section: string;
  text: string;
  similarity_score: number;
  source_type: string;
}

export interface PlaceQASessionListItem {
  session_id: string;
  place: PlaceInfo | null;
  title: string;
  last_message: string | null;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
}

export interface PlaceInfo {
  place_id: string;
  name: string | null;
  address: string | null;
}

export interface ListPlaceQASessionsResponse {
  success: boolean;
  sessions: PlaceQASessionListItem[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface PlaceQASessionDetail {
  session_id: string;
  place: PlaceInfo | null;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  messages: PlaceQAMessageSchema[];
}

export interface PlaceQAMessageSchema {
  id: number;
  role: string;
  content: string;
  created_at: string;
  token_count?: number | null;
}

export interface GetPlaceQASessionResponse {
  success: boolean;
  session: PlaceQASessionDetail;
  total_messages: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface UpdateSessionRequest {
  title?: string | null;
  archived?: boolean | null;
}

export interface UpdateSessionResponse {
  success: boolean;
  session_id: string;
  title: string;
}

export interface DeletePlaceQASessionsRequest {
  session_ids: string[];
}

export interface DeletePlaceQASessionResponse {
  success: boolean;
  message: string;
  deleted_session_ids: string[];
}

/**
 * Travel Agent Types
 */
export interface AIChatStartRequest {
  query: string;
  session_id?: string | null;
}

export interface AIChatResponse {
  success: boolean;
  session_id: string;
  answer: string;
  is_new_session: boolean;
  title?: string | null;
  timestamp: string;
}

/**
 * Routes Types
 */
export interface ComputeRouteRequest {
  place_id?: string | null;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
  waypoints?: any[];
  optimize_waypoint_order?: boolean;
  departure_time?: string | null;
  travel_mode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TWO_WHEELER' | 'TRANSIT';
  language_code?: string;
  avoid_tolls?: boolean;
  avoid_highways?: boolean;
  avoid_ferries?: boolean;
}

export interface RouteResponse {
  success: boolean;
  message: string;
  cached: boolean;
  travel_mode: string;
  origin_latitude?: number | null;
  origin_longitude?: number | null;
  data: RouteResult | null;
  timestamp: string;
}

export interface RouteResult {
  distance_meters: number;
  duration_seconds: number;
  static_duration_seconds: number;
  traffic_delay_seconds: number;
  distance_text: string | null;
  duration_text: string | null;
  traffic_delay_text: string | null;
  encoded_polyline: string;
  steps: NavigationStep[];
  optimized_waypoint_order: number[] | null;
}

export interface NavigationStep {
  distance_meters: number;
  duration_seconds: number;
  maneuver: string | null;
  instruction: string | null;
}

/**
 * Weather Types
 */
export interface WeatherRequest {
  start_date?: string | null;
  end_date?: string | null;
}

export interface WeatherForecastResponse {
  success: boolean;
  message: string;
  data: WeatherForecastData | null;
}

export interface WeatherForecastData {
  location: WeatherLocationData;
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    windspeed_10m: number[];
    relativehumidity_2m: number[];
    weathercode: number[];
  } | null;
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weathercode: number[];
  } | null;
  current_weather: {
    time: string;
    interval: number;
    temperature: number;
    windspeed: number;
    winddirection: number;
    is_day: number;
    weathercode: number;
  } | null;
  // Legacy fields for backward compatibility
  temperature?: {
    current_c: number;
    feels_like_c: number;
  } | null;
  weather?: {
    condition: string;
    condition_code: number;
    is_day: boolean;
  } | null;
  atmosphere?: {
    humidity: number;
    uv_index: number;
    pressure_mb: number;
    visibility_km: number;
    cloud_cover: number;
  } | null;
  wind?: {
    speed_kph: number;
    direction: string;
  } | null;
}

export interface WeatherLocationData {
  latitude: number;
  longitude: number;
  city?: string | null;
  elevation: number;
  timezone: string;
  utc_offset_seconds: number;
}

export interface AirQualityResponse {
  success: boolean;
  message: string;
  data: AirQualityData | null;
}

export interface AirQualityData {
  location: WeatherLocationData;
  hourly: any | null;
}

/**
 * Saved Places Types
 */
export interface SavePlaceRequest {
  notes?: string | null;
  tags?: string[] | null;
}

export interface SavePlaceActionResponse {
  success: boolean;
  message: string;
  place_id: string;
  saved: boolean;
  saved_id?: number | null;
  timestamp: string;
}

export interface SavedPlaceResponse {
  id: number;
  place_id: string;
  display_name: string | null;
  formatted_address: string | null;
  primary_type: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  saved_location_lat: number | null;
  saved_location_lon: number | null;
  notes: string | null;
  tags: string[] | null;
  saved_at: string;
  updated_at?: string | null;
}

export interface ListSavedPlacesResponse {
  success: boolean;
  data: SavedPlaceResponse[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  timestamp: string;
}

export interface UpdateSavedPlaceRequest {
  notes?: string | null;
  tags?: string[] | null;
  is_archived?: boolean | null;
}

/**
 * Visit History Types
 */
export interface LogVisitRequest {
  rating_given?: number | null;
  review_text?: string | null;
  with_whom?: string | null;
  mood?: string | null;
}

export interface LogVisitActionResponse {
  success: boolean;
  message: string;
  place_id: string;
  visit_id: number;
  timestamp: string;
}

export interface VisitLogResponse {
  id: number;
  place_id: string;
  display_name: string | null;
  formatted_address: string | null;
  latitude: number | null;
  longitude: number | null;
  rating_given: number | null;
  review_text: string | null;
  with_whom: string | null;
  mood: string | null;
  visited_at: string;
  updated_at?: string | null;
}

export interface ListVisitsResponse {
  success: boolean;
  data: VisitLogResponse[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
  timestamp: string;
}

export interface UpdateVisitRequest {
  rating_given?: number | null;
  review_text?: string | null;
  with_whom?: string | null;
  mood?: string | null;
}

export interface DeleteVisitResponse {
  success: boolean;
  message: string;
  visit_id: number;
  timestamp: string;
}

export interface VisitStatsResponse {
  success: boolean;
  message: string;
  data: {
    total_visits: number;
    unique_places: number;
    by_category: any;
    by_month: any;
  } | null;
  timestamp: string;
}

/**
 * Comparison Types
 */
export interface ComparePlacesRequest {
  place_ids: string[];
  fields?: string[] | null;
}

export interface PhotoReference {
  name: string;
  width_px: number;
  height_px: number;
}

export interface ReviewData {
  author_name: string;
  rating: number;
  text: string;
  relative_time: string;
}

export interface UserContextData {
  is_saved: boolean;
  saved_id: number | null;
  saved_at: string | null;
  tags: string[];
  notes: string | null;
  has_visited: boolean;
  visited_at: string | null;
  your_rating: number | null;
  your_review: string | null;
  visit_mood: string | null;
  visited_with: string | null;
}

export interface ComparisonResult {
  place_id: string;
  display_name: string | null;
  formatted_address: string | null;
  primary_type: string | null;
  types?: string[] | null;
  latitude: number | null;
  longitude: number | null;
  distance_from_you_km?: number | null;
  rating: number | null;
  user_rating_count: number | null;
  price_level: string | null;
  business_status: string | null;
  open_now: boolean | null;
  opening_hours_summary: string | null;
  wheelchair_accessible: boolean | null;
  website_uri: string | null;
  phone_number: string | null;
  google_maps_uri?: string | null;
  editorial_summary: string | null;
  photo_references?: PhotoReference[] | null;
  top_reviews?: ReviewData[] | null;
  dine_in: boolean | null;
  takeout: boolean | null;
  delivery: boolean | null;
  curbside_pickup: boolean | null;
  serves_breakfast: boolean | null;
  serves_lunch: boolean | null;
  serves_dinner: boolean | null;
  serves_brunch: boolean | null;
  serves_beer: boolean | null;
  serves_wine: boolean | null;
  serves_cocktails: boolean | null;
  serves_vegetarian_food: boolean | null;
  outdoor_seating: boolean | null;
  restroom: boolean | null;
  good_for_children: boolean | null;
  good_for_groups: boolean | null;
  live_music: boolean | null;
  reservable: boolean | null;
  allows_dogs?: boolean | null;
  parking_free: boolean | null;
  parking_paid: boolean | null;
  parking_valet: boolean | null;
  ev_charging: boolean | null;
  payment_cash: boolean | null;
  payment_credit_cards: boolean | null;
  payment_contactless: boolean | null;
  payment_nfc: boolean | null;
  wikipedia_extract: string | null;
  neighborhood: string | null;
  your_context?: UserContextData | null;
}

export interface AttributeTableRow {
  key: string;
  label: string;
  values: {
    place_id: string;
    value: string;
    label: string;
  }[];
}

export interface ComparePlacesResponse {
  success: boolean;
  message: string;
  comparison: ComparisonResult[];
  highlights: Record<string, any> | null;
  total_places: number;
  timestamp: string;
}

export interface CompareBasicResponse {
  success: boolean;
  message: string;
  places: ComparisonResult[];
  attribute_table: AttributeTableRow[];
  highlights: Record<string, any> | null;
  total_places: number;
  user_location_used: boolean;
  timestamp: string;
}

export interface RecommendationResult {
  rank: number;
  place_id: string;
  display_name: string | null;
  primary_type: string | null;
  formatted_address: string | null;
  latitude: number;
  longitude: number;
  rating: number | null;
  price_level: string | null;
  photo_references?: PhotoReference[] | null;
  overall_score: number;
  score_breakdown: {
    rating: number;
    popularity: number;
    price_fit: number;
    amenities: number;
    proximity: number;
    user_affinity: number;
  };
  strengths: string[];
  your_context?: UserContextData | null;
  ai_summary: string | null;
}

export interface CompareRecommendResponse {
  success: boolean;
  message: string;
  recommendations: RecommendationResult[];
  overall_ai_summary: string | null;
  total_places_compared: number;
  timestamp: string;
}
