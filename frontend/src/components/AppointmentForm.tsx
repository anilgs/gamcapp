import { useState } from 'react';

interface AppointmentFormData {
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
  
  // Contact Information
  email: string;
  phone: string;
  nationalId: string;
  
  // Appointment Details
  country: string;
  city: string;
  countryTravelingTo: string;
  appointmentType: string;
  medicalCenter: string;
  appointmentDate: string;
  visaType: string;
  positionAppliedFor: string;
}

interface AppointmentFormProps {
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  userPhone?: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ onSubmit, userPhone }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AppointmentFormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
    gender: '',
    maritalStatus: '',
    passportNumber: '',
    confirmPassportNumber: '',
    passportIssueDate: '',
    passportIssuePlace: '',
    passportExpiryDate: '',
    email: '',
    phone: userPhone || '',
    nationalId: '',
    country: '',
    city: '',
    countryTravelingTo: '',
    appointmentType: 'standard',
    medicalCenter: '',
    appointmentDate: '',
    visaType: '',
    positionAppliedFor: ''
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data for dropdowns
  const countries = [
    'India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Philippines', 'Indonesia', 'Egypt', 'Sudan', 'Jordan'
  ];

  const gccCountries = [
    'Saudi Arabia', 'UAE', 'Kuwait', 'Qatar', 'Oman', 'Bahrain'
  ];

  const nationalities = [
    'Indian', 'Pakistani', 'Bangladeshi', 'Sri Lankan', 'Nepalese', 'Filipino', 'Indonesian', 'Egyptian', 'Sudanese', 'Jordanian'
  ];

  const visaTypes = [
    'Work Visa', 'Family Visa', 'Visit Visa', 'Business Visa', 'Student Visa'
  ];

  const positions = [
    'Engineer', 'Doctor', 'Nurse', 'Teacher', 'Accountant', 'Manager', 'Technician', 'Driver', 'Labour', 'Other'
  ];

  const medicalCenters = [
    'GAMCA Mumbai', 'GAMCA Delhi', 'GAMCA Chennai', 'GAMCA Hyderabad', 'GAMCA Kochi', 'GAMCA Bangalore'
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

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};

    if (step === 1) {
      // Appointment Location
      if (!formData.country) newErrors.country = 'Please select country';
      if (!formData.countryTravelingTo) newErrors.countryTravelingTo = 'Please select destination country';
      if (!formData.appointmentType) newErrors.appointmentType = 'Please select appointment type';
    } else if (step === 2) {
      // Medical Center and Date
      if (!formData.medicalCenter) newErrors.medicalCenter = 'Please select medical center';
      if (!formData.appointmentDate) newErrors.appointmentDate = 'Please select appointment date';
    } else if (step === 3) {
      // Personal Information
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
      if (!formData.nationality) newErrors.nationality = 'Please select nationality';
      if (!formData.gender) newErrors.gender = 'Please select gender';
      if (!formData.maritalStatus) newErrors.maritalStatus = 'Please select marital status';
    } else if (step === 4) {
      // Passport Information
      if (!formData.passportNumber.trim()) newErrors.passportNumber = 'Passport number is required';
      if (!formData.confirmPassportNumber.trim()) newErrors.confirmPassportNumber = 'Please confirm passport number';
      if (formData.passportNumber !== formData.confirmPassportNumber) {
        newErrors.confirmPassportNumber = 'Passport numbers do not match';
      }
      if (!formData.passportIssueDate) newErrors.passportIssueDate = 'Passport issue date is required';
      if (!formData.passportExpiryDate) newErrors.passportExpiryDate = 'Passport expiry date is required';
      if (!formData.passportIssuePlace.trim()) newErrors.passportIssuePlace = 'Passport issue place is required';
      if (!formData.visaType) newErrors.visaType = 'Please select visa type';
    } else if (step === 5) {
      // Contact Information
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Failed to submit appointment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormField = (
    name: keyof AppointmentFormData, 
    label: string, 
    type: 'text' | 'email' | 'tel' | 'date' | 'select' = 'text', 
    options?: string[],
    required: boolean = true
  ) => (
    <div className="form-group">
      <label className="form-label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === 'select' ? (
        <select
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          className={`form-select ${errors[name] ? 'border-red-500' : ''}`}
          disabled={isSubmitting}
        >
          <option value="">Select {label}</option>
          {options?.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          className={`form-input ${errors[name] ? 'border-red-500' : ''}`}
          disabled={isSubmitting || (name === 'phone' && !!userPhone)}
        />
      )}
      {errors[name] && <span className="form-error">{errors[name]}</span>}
    </div>
  );

  return (
    <div className="appointment-form-container">
      {/* Progress Steps */}
      <div className="steps-indicator">
        {[1, 2, 3, 4, 5].map(step => (
          <div key={step} className={`step ${currentStep >= step ? 'active' : ''}`}>
            <div className="step-number">{step}</div>
            <div className="step-label">
              {step === 1 && 'Location'}
              {step === 2 && 'Center & Date'}
              {step === 3 && 'Personal Info'}
              {step === 4 && 'Passport Info'}
              {step === 5 && 'Contact Info'}
            </div>
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className="form-content">
        {currentStep === 1 && (
          <div className="form-section">
            <h2 className="section-title">Appointment Information</h2>
            <div className="form-grid">
              {renderFormField('country', 'Country', 'select', countries)}
              {renderFormField('countryTravelingTo', 'Country Traveling To', 'select', gccCountries)}
              
              <div className="form-group col-span-2">
                <label className="form-label">Appointment Type <span className="text-red-500">*</span></label>
                <div className="appointment-type-cards">
                  <div 
                    className={`appointment-card ${formData.appointmentType === 'standard' ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({...prev, appointmentType: 'standard'}))}
                  >
                    <div className="card-icon">🏥</div>
                    <div className="card-content">
                      <h3>Standard Appointment</h3>
                      <p>A basic appointment scheduled based on availability, without additional customization.</p>
                      <div className="card-price">$10</div>
                    </div>
                  </div>
                  
                  <div 
                    className={`appointment-card ${formData.appointmentType === 'premium' ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({...prev, appointmentType: 'premium'}))}
                  >
                    <div className="card-icon">⭐</div>
                    <div className="card-content">
                      <h3>Premium Appointment</h3>
                      <p>A flexible booking that gives you full control to choose your preferred medical center and date.</p>
                      <div className="card-price">$25</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="form-section">
            <h2 className="section-title">Choose Medical Center</h2>
            <div className="form-grid">
              {renderFormField('medicalCenter', 'Medical Center', 'select', medicalCenters)}
              {renderFormField('appointmentDate', 'Appointment Date', 'date')}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="form-section">
            <h2 className="section-title">Candidate Information</h2>
            <div className="form-grid">
              {renderFormField('firstName', 'First Name')}
              {renderFormField('lastName', 'Last Name')}
              {renderFormField('dateOfBirth', 'Date of Birth', 'date')}
              {renderFormField('nationality', 'Nationality', 'select', nationalities)}
              {renderFormField('gender', 'Gender', 'select', ['Male', 'Female'])}
              {renderFormField('maritalStatus', 'Marital Status', 'select', ['Single', 'Married'])}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="form-section">
            <h2 className="section-title">Passport Information</h2>
            <div className="form-grid">
              {renderFormField('passportNumber', 'Passport Number')}
              {renderFormField('confirmPassportNumber', 'Confirm Passport Number')}
              {renderFormField('passportIssueDate', 'Passport Issue Date', 'date')}
              {renderFormField('passportIssuePlace', 'Passport Issue Place')}
              {renderFormField('passportExpiryDate', 'Passport Expiry Date', 'date')}
              {renderFormField('visaType', 'Visa Type', 'select', visaTypes)}
              {renderFormField('positionAppliedFor', 'Position Applied For', 'select', positions, false)}
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="form-section">
            <h2 className="section-title">Contact Information</h2>
            <div className="form-grid">
              {renderFormField('email', 'Email Address', 'email')}
              {renderFormField('phone', 'Phone Number', 'tel')}
              {renderFormField('nationalId', 'National ID', 'text', undefined, false)}
            </div>
            
            <div className="terms-section">
              <label className="checkbox-label">
                <input type="checkbox" required />
                <span>I confirm that the information given in this form is true, complete, and accurate</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="form-navigation">
        {currentStep > 1 && (
          <button 
            type="button" 
            onClick={prevStep}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Previous
          </button>
        )}
        
        {currentStep < 5 ? (
          <button 
            type="button" 
            onClick={nextStep}
            className="btn-primary ml-auto"
            disabled={isSubmitting}
          >
            Next
          </button>
        ) : (
          <button 
            type="button" 
            onClick={handleSubmit}
            className="btn-primary ml-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Submit & Continue to Payment'}
          </button>
        )}
      </div>
    </div>
  );
};

export default AppointmentForm;