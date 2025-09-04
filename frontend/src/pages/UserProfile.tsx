import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface UserData {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  passport_number?: string;
  payment_status?: string;
  created_at: string;
  updated_at?: string;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function UserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState<ChangePasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/auth/login?redirect=/profile');
          return;
        }

        const result = await authApi.getProfile();
        if (result.success && result.data && result.data.type === 'user' && result.data.user) {
          setUser(result.data.user);
        } else {
          localStorage.removeItem('token');
          navigate('/auth/login?redirect=/profile');
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        localStorage.removeItem('token');
        navigate('/auth/login?redirect=/profile');
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      navigate('/');
    }
  };

  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }

    setIsChangingPassword(true);
    setPasswordErrors({});
    setSuccessMessage('');

    try {
      const result = await authApi.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (result.success) {
        setSuccessMessage('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowChangePassword(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setPasswordErrors({ submit: result.error || 'Failed to change password' });
      }
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear specific field error when user starts typing
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
          <p className="text-gray-600 mb-8">Unable to load your profile information.</p>
          <Link to="/auth/login" className="btn-primary">
            Login Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <Link to="/" className="text-2xl font-bold text-blue-600">
                  GAMCA
                </Link>
                <span className="text-sm text-gray-500 font-medium">User Profile</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/appointment-form" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                Book Appointment
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
            {successMessage}
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Profile Information</h1>
            <p className="text-gray-600 mt-1">Manage your account details and preferences</p>
          </div>
          
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="text-lg text-gray-900">{user.phone}</div>
                <p className="text-sm text-gray-500 mt-1">This is your primary login identifier</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="text-lg text-gray-900">{user.email || 'Not provided'}</div>
                <p className="text-sm text-gray-500 mt-1">Used for appointment notifications</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="text-lg text-gray-900">{user.name || 'Not provided'}</div>
                <p className="text-sm text-gray-500 mt-1">As it appears on your documents</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passport Number
                </label>
                <div className="text-lg text-gray-900">{user.passport_number || 'Not provided'}</div>
                <p className="text-sm text-gray-500 mt-1">Used for appointment booking</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Status
                </label>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.payment_status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : user.payment_status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.payment_status === 'completed' ? 'Active' : 
                     user.payment_status === 'pending' ? 'Pending Payment' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Member Since
                </label>
                <div className="text-lg text-gray-900">
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
                <p className="text-sm text-gray-500 mt-1">Account creation date</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
            <p className="text-gray-600 mt-1">Manage your account security and password</p>
          </div>
          
          <div className="px-6 py-6">
            {!showChangePassword ? (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Password</h3>
                  <p className="text-gray-600 mt-1">
                    Keep your account secure with a strong password
                  </p>
                </div>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="btn-secondary"
                >
                  Change Password
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
                  <button
                    onClick={() => {
                      setShowChangePassword(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                      setPasswordErrors({});
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {passwordErrors.submit && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                      {passwordErrors.submit}
                    </div>
                  )}

                  <div>
                    <label className="form-label">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordInputChange}
                      className={`form-input ${passwordErrors.currentPassword ? 'border-red-500' : ''}`}
                      disabled={isChangingPassword}
                    />
                    {passwordErrors.currentPassword && (
                      <span className="form-error">{passwordErrors.currentPassword}</span>
                    )}
                  </div>

                  <div>
                    <label className="form-label">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordInputChange}
                      className={`form-input ${passwordErrors.newPassword ? 'border-red-500' : ''}`}
                      disabled={isChangingPassword}
                    />
                    {passwordErrors.newPassword && (
                      <span className="form-error">{passwordErrors.newPassword}</span>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Password must be at least 6 characters long
                    </p>
                  </div>

                  <div>
                    <label className="form-label">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordInputChange}
                      className={`form-input ${passwordErrors.confirmPassword ? 'border-red-500' : ''}`}
                      disabled={isChangingPassword}
                    />
                    {passwordErrors.confirmPassword && (
                      <span className="form-error">{passwordErrors.confirmPassword}</span>
                    )}
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className={`btn-primary ${isChangingPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isChangingPassword ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Changing Password...
                        </div>
                      ) : (
                        'Change Password'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePassword(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                        setPasswordErrors({});
                      }}
                      className="btn-secondary"
                      disabled={isChangingPassword}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/appointment-form"
            className="block bg-blue-50 border border-blue-200 rounded-lg p-6 hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-blue-900">Book New Appointment</h3>
                <p className="text-blue-700 text-sm">Schedule your medical examination</p>
              </div>
            </div>
          </Link>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Appointment History</h3>
                <p className="text-gray-600 text-sm">View your past appointments</p>
                <p className="text-gray-500 text-xs mt-1">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}