/**
 * Comprehensive TypeScript type definitions for GAMCA Medical Services
 */

// User related types
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  passport_number?: string;
  appointment_details?: AppointmentDetails;
  payment_status: PaymentStatus;
  payment_id?: string;
  appointment_slip_path?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  phone: string;
  passport_number?: string;
  appointment_details?: AppointmentDetails;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  phone?: string;
  passport_number?: string;
  appointment_details?: AppointmentDetails;
  payment_status?: PaymentStatus;
  payment_id?: string;
  appointment_slip_path?: string;
}

// Admin related types
export interface Admin {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAdminData {
  username: string;
  password: string;
}

export interface AdminLoginData {
  username: string;
  password: string;
}

// Appointment related types
export interface AppointmentDetails {
  appointment_type: AppointmentType;
  preferred_date: string;
  medical_center: MedicalCenter;
  nationality?: string;
  gender?: Gender;
  age?: string;
  destination_country?: string;
  special_requirements?: string;
  documents?: DocumentType[];
}

export type AppointmentType = 
  | 'employment_visa'
  | 'family_visa'
  | 'visit_visa'
  | 'student_visa'
  | 'business_visa'
  | 'other';

export type MedicalCenter = 
  | 'bangalore'
  | 'chennai'
  | 'delhi'
  | 'hyderabad'
  | 'kochi'
  | 'kolkata'
  | 'mumbai'
  | 'pune';

export type Gender = 'Male' | 'Female' | 'Other';

export type DocumentType = 
  | 'passport'
  | 'visa'
  | 'employment_letter'
  | 'medical_history'
  | 'vaccination_certificate'
  | 'other';

// Payment related types
export interface PaymentTransaction {
  id: number;
  user_id: number;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentTransactionStatus = 'created' | 'paid' | 'failed' | 'cancelled';

export interface RazorpayOrderData {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
  notes: Record<string, string>;
}

export interface RazorpayPaymentData {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  captured: boolean;
  created_at: number;
  notes: Record<string, string>;
}

export interface PaymentVerificationData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// OTP related types
export interface OTPToken {
  id: number;
  phone: string;
  otp: string;
  expires_at: string;
  created_at: string;
}

export interface SendOTPData {
  phone: string;
}

export interface VerifyOTPData {
  phone: string;
  otp: string;
}

// File upload related types
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

export interface UploadedFile {
  id: number;
  user_id: number;
  original_name: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  upload_type: FileUploadType;
  created_at: string;
}

export type FileUploadType = 'appointment_slip' | 'document' | 'other';

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Authentication related types
export interface JWTPayload {
  id: number;
  type: 'user' | 'admin';
  phone?: string;
  username?: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  admin?: Admin;
}

// Email related types
export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailData {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  path?: string;
  content?: Buffer | string;
  contentType?: string;
}

// External integration types
export interface WafidBookingData {
  user_data: {
    id: number;
    name: string;
    email: string;
    phone: string;
    passport_number: string;
  };
  appointment_data: {
    appointment_type: AppointmentType;
    preferred_date: string;
    medical_center: MedicalCenter;
    nationality: string;
    gender: Gender;
    age: string;
    destination_country: string;
    special_requirements?: string;
  };
}

export interface WafidBookingResult {
  success: boolean;
  message: string;
  bookingReference?: string;
  appointmentDetails?: {
    date: string;
    time: string;
    location: string;
    reference: string;
  };
  error?: string;
  details?: any;
  rawResponse?: any;
}

export interface WafidBooking {
  id: number;
  user_id: number;
  admin_id: number;
  booking_reference?: string;
  status: WafidBookingStatus;
  booking_data: WafidBookingData;
  response_data: WafidBookingResult;
  test_mode: boolean;
  created_at: string;
  updated_at: string;
}

export type WafidBookingStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled';

// Error handling types
export interface AppError {
  name: string;
  message: string;
  type: ErrorType;
  severity: ErrorSeverity;
  details?: any;
  timestamp: string;
  errorId: string;
  stack?: string;
  context?: ErrorContext;
}

export type ErrorType = 
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'SERVER_ERROR'
  | 'PAYMENT_ERROR'
  | 'FILE_UPLOAD_ERROR'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_API_ERROR'
  | 'UNKNOWN_ERROR';

export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ErrorContext {
  url?: string;
  userAgent?: string;
  timestamp: string;
  userId?: number;
  adminId?: number;
  requestId?: string;
}

// Form types
export interface AppointmentFormData {
  name: string;
  email: string;
  phone: string;
  passport_number: string;
  appointment_type: AppointmentType;
  preferred_date: string;
  medical_center: MedicalCenter;
  nationality: string;
  gender: Gender;
  age: string;
  destination_country: string;
  special_requirements?: string;
}

export interface AppointmentFormErrors {
  name?: string;
  email?: string;
  phone?: string;
  passport_number?: string;
  appointment_type?: string;
  preferred_date?: string;
  medical_center?: string;
  nationality?: string;
  gender?: string;
  age?: string;
  destination_country?: string;
}

export interface LoginFormData {
  username: string;
  password: string;
}

export interface OTPFormData {
  phone: string;
  otp?: string;
}

// Component prop types
export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray' | 'red' | 'green' | 'blue';
  className?: string;
  text?: string;
}

export interface PageLoaderProps {
  text?: string;
  subtext?: string;
  showLogo?: boolean;
}

export interface ButtonLoaderProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>;
}

export interface ErrorBoundaryFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  errorId: string;
  onRetry: () => void;
  onReload: () => void;
}

// Configuration types
export interface AppConfig {
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean | object;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  razorpay: {
    keyId: string;
    keySecret: string;
  };
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: {
      email: string;
      name: string;
    };
    admin: string;
  };
  sms: {
    apiKey: string;
    apiUrl: string;
  };
  upload: {
    directory: string;
    maxFileSize: number;
    allowedTypes: string[];
  };
}

// Next.js specific types
export interface NextApiRequestWithAuth extends NextApiRequest {
  user?: User;
  admin?: Admin;
}

export interface NextApiRequestWithFile extends NextApiRequest {
  file?: FileUpload;
  files?: FileUpload[];
}

