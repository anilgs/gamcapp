// API client for PHP backend
const API_BASE_URL = '/api';

// Types for API responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  passport_number?: string;
  payment_status?: string;
  created_at: string;
  updated_at?: string;
}

export interface AuthVerificationResponse {
  user?: User;
  admin?: Admin;
  type: 'user' | 'admin';
}

export interface AdminUser extends User {
  name: string;
  email: string;
  passport_number?: string;
  payment_status: 'pending' | 'completed' | 'failed';
  payment_amount?: number;
  appointment_details?: Record<string, unknown>;
  payment_info?: Record<string, unknown>;
  has_slip?: boolean;
  slip_uploaded_at?: string;
}

export interface Pagination {
  current_page: number;
  total_pages: number;
  total_records: number;
  per_page: number;
  has_prev: boolean;
  has_next: boolean;
}

export interface UserProfile {
  user: {
    name: string;
    email: string;
    phone: string;
    passport_number?: string;
    created_at: string;
    payment_status: string;
  };
  status: {
    status: string;
    message: string;
    next_steps?: string[];
  };
  appointment: {
    type_label?: string;
    preferred_date?: string;
    medical_center?: string;
    details?: Record<string, unknown>;
  };
  payment?: {
    amount_formatted: string;
    payment_id: string;
    status: string;
    created_at: string;
  };
  slip?: {
    filename: string;
    original_name: string;
    mime_type: string;
    size_formatted?: string;
    uploaded_at?: string;
  };
  appointment_slip?: {
    available: boolean;
    size_formatted?: string;
    uploaded_at?: string;
  };
}

export interface Statistics {
  total_users: number;
  paid_users: number;
  pending_users: number;
  total_revenue: number;
}

export interface Admin {
  id: string;
  username: string;
  email?: string;
  role: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  appointment_date: string;
  appointment_time: string;
  wafid_booking_id?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_id?: string;
  amount?: number;
  created_at: string;
  updated_at: string;
}

export interface AppointmentCreationResponse {
  appointmentId: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    appointment_details: Record<string, unknown>;
    payment_status: string;
  };
}

// Generic API client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    tokenKey: string = 'token'
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get token from localStorage using the specified key
    const token = localStorage.getItem(tokenKey);
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string, tokenKey: string = 'token'): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, tokenKey);
  }

  async post<T>(endpoint: string, data?: unknown, tokenKey: string = 'token'): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, tokenKey);
  }

  async put<T>(endpoint: string, data?: unknown, tokenKey: string = 'token'): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }, tokenKey);
  }

  async delete<T>(endpoint: string, tokenKey: string = 'token'): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' }, tokenKey);
  }
}

// Create API client instance
export const api = new ApiClient();

// Auth API methods
export const authApi = {
  sendOTP: (identifier: string, type: 'email' | 'phone' = 'email') => 
    api.post<{ otp?: string }>('/auth/send-otp', { identifier, type }),
  verifyOTP: (identifier: string, otp: string, type: 'email' | 'phone' = 'email') => 
    api.post<{ token: string; user: User }>('/auth/verify-otp', { identifier, otp, type }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get<AuthVerificationResponse>('/auth/verify-token'),
  updateProfile: (data: Partial<User>) => api.put<User>('/auth/profile', data),
  changePassword: (currentPassword: string, newPassword: string) => 
    api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
};

// Admin Auth API methods
export const adminAuthApi = {
  login: (username: string, password: string) => api.post<{ token: string; admin: Admin }>('/auth/admin-login', { username, password }),
  logout: () => api.post('/auth/admin-logout'),
  getProfile: () => api.get<Admin>('/auth/admin-profile'),
};

// Appointment API methods
export const appointmentApi = {
  create: (appointmentData: {
    // Personal Information
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    gender: string;
    maritalStatus: string;
    
    // Passport Information
    passportNumber: string;
    confirmPassportNumber: string;
    passportIssueDate: string;
    passportIssuePlace: string;
    passportExpiryDate: string;
    visaType: string;
    
    // Contact Information
    email: string;
    phone: string;
    nationalId?: string;
    
    // Appointment Details
    country: string;
    city?: string;
    countryTravelingTo: string;
    appointmentType: string;
    medicalCenter: string;
    appointmentDate: string;
    positionAppliedFor?: string;
    
    // Legacy fields for backward compatibility
    appointment_date: string;
    appointment_time: string;
    wafid_booking_id?: string;
  }) => api.post<AppointmentCreationResponse>('/appointments/create', appointmentData),
  
  getUserAppointments: () => api.get<Appointment[]>('/appointments/user'),
  getById: (id: string) => api.get<Appointment>(`/appointments/${id}`),
  update: (id: string, data: Partial<Appointment>) => api.put<Appointment>(`/appointments/${id}`, data),
  cancel: (id: string) => api.delete<{ message: string }>(`/appointments/${id}`),
  
  // Admin endpoints
  getAll: () => api.get<Appointment[]>('/admin/appointments'),
  updateStatus: (id: string, status: Appointment['status']) => 
    api.put<Appointment>(`/admin/appointments/${id}/status`, { status }),
};

// Payment API methods
export const paymentApi = {
  createOrder: (appointmentId: string, amount: number) => 
    api.post<{ 
      order_id: string; 
      amount: number; 
      currency: string; 
      key: string; 
    }>('/payment/create-order', { appointmentId: appointmentId, amount }),
  
  verifyPayment: (paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    appointment_id: string;
  }) => api.post<{ appointment: Appointment }>('/payment/verify', paymentData),
  
  getPaymentHistory: () => api.get<Record<string, unknown>[]>('/payment/history'),
};

// User profile API methods
export const userApi = {
  getProfile: () => api.get<UserProfile>('/user/profile'),
  getAll: () => api.get<User[]>('/admin/users'),
  getById: (id: string) => api.get<User>(`/admin/users/${id}`),
  update: (id: string, data: Partial<User>) => api.put<User>(`/admin/users/${id}`, data),
  delete: (id: string) => api.delete<{ message: string }>(`/admin/users/${id}`),
  downloadSlip: async (): Promise<{ success: boolean; blob?: Blob; error?: string }> => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/user/download-slip`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        return { success: true, blob };
      } else {
        const result = await response.json();
        return { success: false, error: result.error || 'Failed to download appointment slip' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  },
};

// File upload API methods
export const uploadApi = {
  appointmentSlip: (formData: FormData) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/upload/appointment-slip`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }).then(async response => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      return data;
    });
  },
};

// External booking API
export const externalApi = {
  bookWafid: (bookingData: {
    appointment_date: string;
    appointment_time: string;
    user_details: Record<string, unknown>;
  }) => api.post<{ booking_id: string; external_ref: string }>('/external/book-wafid', bookingData),
};

// Health check
export const healthApi = {
  check: () => api.get<{ status: string; timestamp: string }>('/health'),
};

// Notification API
export const notificationApi = {
  paymentSuccess: (data: {
    appointment_id: string;
    payment_id: string;
    amount: number;
  }) => api.post<{ message: string }>('/notifications/payment-success', data),
};

// Admin management API methods
export const adminApi = {
  getUsers: (params?: Record<string, string>) => {
    const queryParams = params ? `?${new URLSearchParams(params)}` : '';
    return api.get<{
      users: AdminUser[];
      pagination: Pagination;
      statistics: Statistics;
    }>(`/admin/users${queryParams}`, 'adminToken');
  },
  uploadSlip: (formData: FormData) => {
    const token = localStorage.getItem('adminToken');
    return fetch(`${API_BASE_URL}/admin/upload-slip`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }).then(async response => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      return data;
    });
  },
  changePassword: (currentPassword: string, newPassword: string) => 
    api.post<{ message: string }>('/admin/change-password', { currentPassword, newPassword }, 'adminToken'),
};
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
};

// Error handler for API responses
export const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred. Please try again.';
};

export default api;