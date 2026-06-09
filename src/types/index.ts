export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  social_rating: number;
  total_ratings: number;
  events_hosted: number;
  events_attended: number;
  is_email_verified?: boolean;
  date_of_birth?: string | null;
  id_verification_status?: "not_submitted" | "pending" | "verified" | "rejected";
  id_verification_submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface Event {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  location_name: string;
  location_city: string;
  latitude: number | null;
  longitude: number | null;
  date_time: string;
  end_time: string | null;
  max_capacity?: number | null;
  current_attendees?: number;
  checked_in_count?: number;
  ticket_price: number;
  currency: string;
  cover_image_url: string | null;
  status: "upcoming" | "ongoing" | "completed" | "cancelled" | "archived";
  tags: string | null;
  min_rating: number;
  // Privacy & access
  is_private: boolean;
  private_code?: string | null;  // only returned to host
  allow_photos: boolean;
  // Event attributes
  food_type: "veg" | "non_veg" | "vegan" | null;
  allows_alcohol: boolean;
  allows_smoking: boolean;
  allows_other_substances: boolean;
  // Structured location
  location_country: string | null;
  location_state: string | null;
  location_district: string | null;
  created_at: string;
  updated_at: string;
  // Joined host fields
  host_username?: string;
  host_display_name?: string;
  host_avatar_url?: string | null;
  host_social_rating?: number;
  distance_km?: number | null;
  // Friends attending (enriched by discover endpoint or event detail for guests)
  friends_attending?: number;
  friends_attending_avatars?: { user_id: string; display_name: string; avatar_url: string | null }[];
  friends_attending_list?: { user_id: string; display_name: string; avatar_url: string | null }[];
  // Revenue model (migration 023)
  host_commission_rate?: number;
  deposit_amount?: number;
  deposit_status?: "not_required" | "pending" | "paid" | "refunded";
  deposit_payment_id?: string | null;
}

export interface EventRequest {
  id: string;
  event_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  message: string | null;
  tier_id: string | null;
  requested_at: string;
  responded_at: string | null;
  // Joined user fields
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  social_rating?: number;
  events_attended?: number;
  // Joined event fields
  event_title?: string;
  event_date_time?: string;
  event_location_city?: string;
  event_cover_image_url?: string | null;
  event_ticket_price?: number;
  event_max_capacity?: number | null;
  event_current_attendees?: number;
  event_host_id?: string;
  event_end_time?: string | null;
  event_tags?: string[] | string | null;
}

export interface TicketTier {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;         // in paisa
  slots: number;         // people per unit
  max_quantity: number | null;
  sold_count: number;
  sort_order: number;
  is_active: boolean;
}

export interface GroupSlot {
  attendee_id: string;
  slot_index: number;
  group_size: number;
  qr_token: string;
  checked_in: boolean;
  checked_in_at: string | null;
  user_id: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Ticket {
  attendee_id: string;
  event_id: string;
  user_id: string;
  qr_token: string;
  checked_in: boolean;
  checked_in_at: string | null;
  joined_at: string;
  // Tier / group fields (migration 027)
  tier_id: string | null;
  tier_name: string | null;
  tier_price: number | null;
  group_id: string | null;
  group_size: number;
  slot_index: number;
  // Event fields
  event_title: string;
  event_date_time: string;
  event_end_time: string | null;
  event_location_name: string;
  event_location_city: string;
  event_cover_image_url: string | null;
  event_ticket_price: number;
  event_max_capacity: number | null;
  event_current_attendees: number;
  event_tags: string[] | string | null;
  event_host_id: string;
  guest_username: string;
  guest_display_name: string;
  guest_avatar_url: string | null;
  guest_social_rating: number;
}

export interface FeeBreakdown {
  ticket_price: number;
  platform_fee: number;
  platform_fee_rate_percent: number;
  user_total: number;
  host_commission: number;
  host_commission_rate_percent: number;
  host_payout_per_ticket: number;
}

export interface Payment {
  id: string;
  payer_id: string;
  host_id: string;
  event_id: string;
  amount: number;
  currency: string;
  status: "initiated" | "pending" | "completed" | "failed" | "refunded" | "partial_refund" | "refund_failed";
  platform_fee: number;
  payment_type: "ticket" | "deposit";
  mock_transaction_id: string | null;
  created_at: string;
  completed_at: string | null;
  event_title?: string;
}

export interface RefundJob {
  id: string;
  payment_id: string;
  refund_amount: number;
  status: "pending" | "processing" | "retrying" | "succeeded" | "failed";
  attempt_count: number;
  last_error: string | null;
  provider_refund_id: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
  payer_username?: string;
  host_username?: string;
  event_title?: string;
  payment_status?: string;
  payment_amount?: number;
  payment_currency?: string;
  payment_razorpay_payment_id?: string | null;
}

export interface HostPayout {
  id: string;
  event_id: string;
  host_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  status: "pending" | "processing" | "paid" | "failed" | "retrying";
  provider_transfer_id: string | null;
  failure_reason: string | null;
  attempt_count: number;
  last_error: string | null;
  next_retry_at: string | null;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
  event_title?: string;
  host_username?: string;
  host_display_name?: string;
}

export interface Attendee {
  id: string;
  event_id: string;
  user_id: string;
  payment_id: string | null;
  checked_in: number;
  joined_at: string;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  social_rating?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
}

export interface Photo {
  id: string;
  user_id: string;
  event_id: string | null;
  image_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  global_visibility: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
  is_saved?: boolean;
  liked_by_me?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: number;
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  event_id: string;
  guest_id: string;
  host_id: string;
  created_at: string;
  event_title: string;
  event_cover_image_url: string | null;
  other_user_id: string;
  other_username: string;
  other_display_name: string;
  other_avatar_url: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface EventAnnouncement {
  id: string;
  event_id: string;
  host_id: string;
  body: string;
  created_at: string;
}

export interface FriendUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  social_rating: number;
}

export interface PendingFriendRequest extends FriendUser {
  created_at: string;
}
