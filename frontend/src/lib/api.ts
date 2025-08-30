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
  created_at: string;
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

// Generic API client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
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

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // File upload method
  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = localStorage.getItem('token');
    
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }
}

// Create API client instance
export const api = new ApiClient();

// Auth API methods
export const authApi = {
  sendOTP: (phone: string) => api.post<{ otp?: string }>('/auth/send-otp', { phone }),
  verifyOTP: (phone: string, otp: string) => api.post<{ token: string; user: User }>('/auth/verify-otp', { phone, otp }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get<User>('/auth/profile'),
  updateProfile: (data: Partial<User>) => api.put<User>('/auth/profile', data),
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
    appointment_date: string;
    appointment_time: string;
    wafid_booking_id?: string;
  }) => api.post<Appointment>('/appointments/create', appointmentData),
  
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
    }>('/payment/create-order', { appointment_id: appointmentId, amount }),
  
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
  getProfile: () => api.get<Record<string, unknown>>('/user/profile'),
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
      users: User[];
      pagination: Record<string, unknown>;
      statistics: Record<string, unknown>;
    }>(`/admin/users${queryParams}`);
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
  if (error?.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred. Please try again.';
};

export default api;