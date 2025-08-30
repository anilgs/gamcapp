import { useState } from 'react';

interface AppointmentFormData {
  name: string;
  email: string;
  phone: string;
  passport_number: string;
  appointment_type: string;
  preferred_date: string;
  medical_center: string;
  additional_notes: string;
}

interface AppointmentFormProps {
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  userPhone?: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ onSubmit, userPhone }) => {
  const [formData, setFormData] = useState<AppointmentFormData>({
    name: '',
    email: '',
    phone: userPhone || '',
    passport_number: '',
    appointment_type: '',
    preferred_date: '',
    medical_center: '',
    additional_notes: ''
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Appointment types similar to wafid.com
  const appointmentTypes = [
    { value: 'employment_visa', label: 'Employment Visa Medical' },
    { value: 'family_visa', label: 'Family Visa Medical' },
    { value: 'visit_visa', label: 'Visit Visa Medical' },
    { value: 'student_visa', label: 'Student Visa Medical' },
    { value: 'business_visa', label: 'Business Visa Medical' },
    { value: 'other', label: 'Other' }
  ];

  // Medical centers
  const medicalCenters = [
    { value: 'gamca_mumbai', label: 'GAMCA Mumbai' },
    { value: 'gamca_delhi', label: 'GAMCA Delhi' },
    { value: 'gamca_chennai', label: 'GAMCA Chennai' },
    { value: 'gamca_hyderabad', label: 'GAMCA Hyderabad' },
    { value: 'gamca_kochi', label: 'GAMCA Kochi' },
    { value: 'gamca_bangalore', label: 'GAMCA Bangalore' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) {
      newErrors.name = 'Name can only contain letters and spaces';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^(\+91|91)?[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid Indian phone number';
    }

    // Passport number validation
    if (!formData.passport_number.trim()) {
      newErrors.passport_number = 'Passport number is required';
    } else if (formData.passport_number.trim().length < 6) {
      newErrors.passport_number = 'Passport number must be at least 6 characters';
    } else if (!/^[A-Z0-9]+$/.test(formData.passport_number.trim().toUpperCase())) {
      newErrors.passport_number = 'Passport number can only contain letters and numbers';
    }

    // Appointment type validation
    if (!formData.appointment_type) {
      newErrors.appointment_type = 'Please select an appointment type';
    }

    // Preferred date validation
    if (!formData.preferred_date) {
      newErrors.preferred_date = 'Please select a preferred date';
    } else {
      const selectedDate = new Date(formData.preferred_date);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 3); // 3 months from today

      if (selectedDate < today) {
        newErrors.preferred_date = 'Date cannot be in the past';
      } else if (selectedDate > maxDate) {
        newErrors.preferred_date = 'Date cannot be more than 3 months from today';
      }
    }

    // Medical center validation
    if (!formData.medical_center) {
      newErrors.medical_center = 'Please select a medical center';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Format the data
      const appointmentData: AppointmentFormData = {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        passport_number: formData.passport_number.trim().toUpperCase(),
        additional_notes: formData.additional_notes.trim()
      };

      await onSubmit(appointmentData);
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Failed to submit appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date (today)
  const getMinDate = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get maximum date (3 months from today)
  const getMaxDate = (): string => {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label htmlFor="name" className="form-label">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`form-input ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter your full name as per passport"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="form-label">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`form-input ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter your email address"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phone" className="form-label">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`form-input ${errors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="+91 9876543210"
              disabled={isSubmitting || !!userPhone} // Disable if phone is pre-filled from auth
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
            {userPhone && (
              <p className="mt-1 text-sm text-gray-500">Phone number verified via OTP</p>
            )}
          </div>

          {/* Passport Number */}
          <div>
            <label htmlFor="passport_number" className="form-label">
              Passport Number *
            </label>
            <input
              type="text"
              id="passport_number"
              name="passport_number"
              value={formData.passport_number}
              onChange={handleInputChange}
              className={`form-input ${errors.passport_number ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter passport number"
              disabled={isSubmitting}
              style={{ textTransform: 'uppercase' }}
            />
            {errors.passport_number && (
              <p className="mt-1 text-sm text-red-600">{errors.passport_number}</p>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Details Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Appointment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Appointment Type */}
          <div>
            <label htmlFor="appointment_type" className="form-label">
              Appointment Type *
            </label>
            <select
              id="appointment_type"
              name="appointment_type"
              value={formData.appointment_type}
              onChange={handleInputChange}
              className={`form-input ${errors.appointment_type ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              disabled={isSubmitting}
            >
              <option value="">Select appointment type</option>
              {appointmentTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.appointment_type && (
              <p className="mt-1 text-sm text-red-600">{errors.appointment_type}</p>
            )}
          </div>

          {/* Preferred Date */}
          <div>
            <label htmlFor="preferred_date" className="form-label">
              Preferred Date *
            </label>
            <input
              type="date"
              id="preferred_date"
              name="preferred_date"
              value={formData.preferred_date}
              onChange={handleInputChange}
              min={getMinDate()}
              max={getMaxDate()}
              className={`form-input ${errors.preferred_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              disabled={isSubmitting}
            />
            {errors.preferred_date && (
              <p className="mt-1 text-sm text-red-600">{errors.preferred_date}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Appointments available up to 3 months in advance
            </p>
          </div>

          {/* Medical Center */}
          <div className="md:col-span-2">
            <label htmlFor="medical_center" className="form-label">
              Preferred Medical Center *
            </label>
            <select
              id="medical_center"
              name="medical_center"
              value={formData.medical_center}
              onChange={handleInputChange}
              className={`form-input ${errors.medical_center ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              disabled={isSubmitting}
            >
              <option value="">Select medical center</option>
              {medicalCenters.map(center => (
                <option key={center.value} value={center.value}>
                  {center.label}
                </option>
              ))}
            </select>
            {errors.medical_center && (
              <p className="mt-1 text-sm text-red-600">{errors.medical_center}</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <label htmlFor="additional_notes" className="form-label">
          Additional Notes (Optional)
        </label>
        <textarea
          id="additional_notes"
          name="additional_notes"
          rows={4}
          value={formData.additional_notes}
          onChange={handleInputChange}
          className="form-input"
          placeholder="Any additional information or special requirements..."
          disabled={isSubmitting}
        />
      </div>

      {/* Terms and Conditions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Important Information:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Please arrive 30 minutes before your scheduled appointment</li>
          <li>• Bring all required documents including passport and photographs</li>
          <li>• Fasting for 8-12 hours is required for blood tests</li>
          <li>• Appointment fees are non-refundable once payment is completed</li>
          <li>• Results will be available within 2-3 working days</li>
        </ul>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`btn-primary px-8 py-3 text-lg ${
            isSubmitting 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-primary-700'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            'Proceed to Payment'
          )}
        </button>
      </div>
    </form>
  );
};

export default AppointmentForm;