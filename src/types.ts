
export interface Feature {
  id: number;
  name: string;
  description: string;
  icon: string;
}

export enum AppState {
  LOGIN = 'LOGIN',
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  EXPORTING = 'EXPORTING',
  ADMIN_PANEL = 'ADMIN_PANEL',
  BATCH_COMPRESSOR = 'BATCH_COMPRESSOR',
  STORE = 'STORE',
  VIDEO_CONVERTER = 'VIDEO_CONVERTER',
  IMAGE_CONVERTER = 'IMAGE_CONVERTER',
  IMAGE_EDITOR = 'IMAGE_EDITOR',
  HOME = 'HOME'
}

export type SubscriptionType = 'day' | 'week' | 'month' | 'year' | 'none';

export interface StoreCategory {
  id: string;
  name: string;
  order: number;
}

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string; // ID of the category
  videoUrl: string;
  imageUrl: string;
  supportedFormats: string[];
  createdAt: any;
  updatedAt?: any;
}

export interface StoreOrder {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  username: string;
  userWhatsapp?: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  giftUrl?: string;
  price: number;
  quantity: number;
  contactMethod: 'whatsapp' | 'platform';
  selectedFormat: string;
  createdAt: any;
}

export interface UserRecord {
  id: string;
  name: string;
  email?: string;
  password?: string;
  role: 'admin' | 'user';
  isApproved: boolean;
  isVIP: boolean;
  subscriptionExpiry: any; // Firebase Timestamp or null
  subscriptionType: SubscriptionType;
  activatedKey?: string;
  status: 'active' | 'banned' | 'pending';
  coins: number;
  freeAttempts: number;
  createdAt: any;
  lastLogin: any;
}

export interface PresetBackground {
  id: string;
  label: string;
  url: string;
  createdAt: any;
  expiresAt?: any;
}

export interface LicenseKey {
  id: string;
  key: string;
  duration: SubscriptionType; // 'day', 'week', 'month', 'year'
  isUsed: boolean;
  usedBy?: string; // User ID
  usedAt?: any;
  createdAt: any;
  createdBy: string; // Admin ID
}

export interface AppSettings {
  appName: string;
  logoUrl: string;
  backgroundUrl: string;
  whatsappNumber: string;
  isRegistrationOpen: boolean;
  defaultFreeAttempts: number;
  costs: {
    svgaProcess: number;
    batchCompress: number;
    vipPrice: number;
  }
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: 'login' | 'upload' | 'feature_usage' | 'subscription_activated';
  details: string; // e.g., "Uploaded file.mp4", "Used Video Converter"
  ip?: string;
  timestamp: any;
}

export interface MaterialAsset {
  id: string;
  type: 'image' | 'audio';
  name: string;
  size: string;
  dimensions?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  dimensions?: { width: number; height: number };
  fps?: number;
  frames?: number;
  assets?: MaterialAsset[];
  videoItem?: any;
  fileUrl?: string;
}
