import { useState, useEffect, useCallback } from 'react';
import { appointmentApi } from '../lib/api';

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
  [key: string]: string; // Add index signature
}

interface AppointmentFormProps {
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  userEmail?: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ onSubmit, userEmail }) => {
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
    email: userEmail || '',
    phone: '',
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
  const [showRestorationPrompt, setShowRestorationPrompt] = useState(false);
  const [savedDraftData, setSavedDraftData] = useState<AppointmentFormData | null>(null);

  // Load draft on component mount
  useEffect(() => {
    loadDraftData();
  }, []);

  const loadDraftData = async () => {
    try {
      const response = await appointmentApi.getLatestDraft();
      if (response.success && response.data?.hasDraft && response.data.formData) {
        setSavedDraftData(response.data.formData as unknown as AppointmentFormData);
        setShowRestorationPrompt(true);
      }
    } catch (error) {
      console.error('Failed to load draft data:', error);
    }
  };

  const restoreDraftData = () => {
    if (savedDraftData) {
      setFormData({
        ...savedDraftData,
        email: userEmail || savedDraftData.email,
        confirmPassportNumber: savedDraftData.passportNumber
      });
      setShowRestorationPrompt(false);
    }
  };

  const dismissRestorationPrompt = () => {
    setShowRestorationPrompt(false);
    setSavedDraftData(null);
  };

  const saveDraft = useCallback(async () => {
    // Only save if there's meaningful data to save
    const hasData = formData.firstName || formData.email || formData.passportNumber || formData.appointmentType;
    if (!hasData) return;

    try {
      await appointmentApi.saveDraft(formData as Record<string, unknown>);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [formData]);

  // Auto-save draft when form data changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft();
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, [formData, saveDraft]);

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

  const validateAllFields = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    // All required fields based on backend validation
    const requiredFields = [
      'firstName', 'lastName', 'dateOfBirth', 'nationality', 'gender', 'maritalStatus',
      'passportNumber', 'passportIssueDate', 'passportIssuePlace', 'passportExpiryDate',
      'visaType', 'email', 'phone', 'country', 'countryTravelingTo', 'appointmentType',
      'medicalCenter', 'appointmentDate'
    ];

    // Check all required fields
    requiredFields.forEach(field => {
      if (!formData[field as keyof AppointmentFormData] || 
          String(formData[field as keyof AppointmentFormData]).trim() === '') {
        newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`;
      }
    });

    // Validate passport number confirmation
    if (formData.passportNumber !== formData.confirmPassportNumber) {
      newErrors.confirmPassportNumber = 'Passport numbers do not match';
    }

    // Validate email format
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('Submit button clicked, current step:', currentStep);
    console.log('Form data at submission:', formData);
    
    const step5Valid = validateStep(5);
    const allFieldsValid = validateAllFields();
    
    console.log('Step 5 validation:', step5Valid);
    console.log('All fields validation:', allFieldsValid);
    console.log('Validation errors:', errors);
    
    if (!step5Valid || !allFieldsValid) {
      console.log('Validation failed, aborting submission');
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    console.log('Validation passed, proceeding with submission');
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
          name={String(name)}
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
          name={String(name)}
          value={formData[name]}
          onChange={handleInputChange}
          className={`form-input ${errors[name] ? 'border-red-500' : ''}`}
          disabled={isSubmitting || (name === 'email' && !!userEmail)}
        />
      )}
      {errors[name] && <span className="form-error">{errors[name]}</span>}
    </div>
  );

  return (
    <div className="appointment-form-container">
      {/* Data Restoration Prompt */}
      {showRestorationPrompt && savedDraftData && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Restore Previous Data?</h3>
              <p className="text-sm text-blue-700 mb-4">
                We found appointment data you previously entered. Would you like to restore it to continue where you left off?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={restoreDraftData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                >
                  Restore Data
                </button>
                <button
                  onClick={dismissRestorationPrompt}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 text-sm font-medium"
                >
                  Start Fresh
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Progress Steps */}
      <div className="mb-8 bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Application Progress</h3>
          <span className="text-sm text-gray-600 bg-medical-50 px-3 py-1 rounded-full border border-medical-200">
            Step {currentStep} of 5
          </span>
        </div>
        
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(step => (
            <div key={step} className={`relative flex flex-col items-center transition-all duration-300 ${currentStep >= step ? 'opacity-100' : 'opacity-50'}`}>
              {/* Step Circle */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                currentStep > step 
                  ? 'bg-health-green-500 text-white shadow-lg'
                  : currentStep === step 
                    ? 'bg-medical-500 text-white shadow-lg transform scale-110'
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > step ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              
              {/* Step Label */}
              <div className="mt-3 text-center">
                <div className={`text-sm font-medium transition-colors duration-300 ${
                  currentStep >= step ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step === 1 && 'Location & Type'}
                  {step === 2 && 'Center & Date'}
                  {step === 3 && 'Personal Info'}
                  {step === 4 && 'Passport Info'}
                  {step === 5 && 'Contact & Review'}
                </div>
                <div className={`text-xs mt-1 transition-colors duration-300 ${
                  currentStep >= step ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {step === 1 && 'Select details'}
                  {step === 2 && 'Schedule appointment'}
                  {step === 3 && 'Basic information'}
                  {step === 4 && 'Travel documents'}
                  {step === 5 && 'Confirm & submit'}
                </div>
              </div>
              
              {/* Progress Line */}
              {step < 5 && (
                <div className={`absolute top-6 left-12 w-full h-0.5 transition-colors duration-300 ${
                  currentStep > step ? 'bg-health-green-500' : 'bg-gray-200'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {currentStep === 1 && (
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-medical-500 to-medical-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Location & Appointment Type</h2>
            </div>
            
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {renderFormField('country', 'Current Country', 'select', countries)}
                {renderFormField('countryTravelingTo', 'Destination Country (GCC)', 'select', gccCountries)}
              </div>
              
              <div className="space-y-4">
                <label className="form-label">
                  Appointment Type <span className="text-red-500">*</span>
                </label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div 
                    className={`medical-card cursor-pointer transition-all duration-300 ${formData.appointmentType === 'standard' ? 'selected ring-2 ring-medical-500' : ''}`}
                    onClick={() => setFormData(prev => ({...prev, appointmentType: 'standard'}))}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-health-green-100 to-health-green-200 rounded-xl flex items-center justify-center">
                        <span className="text-2xl">🏥</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Standard Appointment</h3>
                        <p className="text-sm text-gray-600 mb-3">Basic medical examination scheduled based on availability. Perfect for most applicants.</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-medical-600">$10</span>
                          <div className="flex items-center text-sm text-health-green-600">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Most Popular
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`medical-card cursor-pointer transition-all duration-300 ${formData.appointmentType === 'premium' ? 'selected ring-2 ring-medical-500' : ''}`}
                    onClick={() => setFormData(prev => ({...prev, appointmentType: 'premium'}))}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center">
                        <span className="text-2xl">⭐</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Appointment</h3>
                        <p className="text-sm text-gray-600 mb-3">Priority booking with flexible scheduling and premium support throughout the process.</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-medical-600">$25</span>
                          <div className="flex items-center text-sm text-amber-600">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                            </svg>
                            Premium
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-medical-500 to-medical-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Medical Center & Schedule</h2>
            </div>
            
            <div className="space-y-6">
              <div className="p-4 bg-health-green-50 border border-health-green-200 rounded-xl">
                <div className="flex items-center space-x-2 text-health-green-800">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Choose your preferred center based on location convenience</span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {renderFormField('medicalCenter', 'Medical Center', 'select', medicalCenters)}
                {renderFormField('appointmentDate', 'Preferred Date', 'date')}
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-900 mb-2">Available Time Slots</h4>
                <p className="text-sm text-gray-600">
                  Morning slots: 9:00 AM - 12:00 PM | Evening slots: 2:00 PM - 5:00 PM
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-medical-500 to-medical-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
            </div>
            
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center space-x-2 text-amber-800">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Ensure all details match your passport exactly</span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {renderFormField('firstName', 'First Name (as in passport)')}
                {renderFormField('lastName', 'Last Name (as in passport)')}
                {renderFormField('dateOfBirth', 'Date of Birth', 'date')}
                {renderFormField('nationality', 'Nationality', 'select', nationalities)}
                {renderFormField('gender', 'Gender', 'select', ['Male', 'Female'])}
                {renderFormField('maritalStatus', 'Marital Status', 'select', ['Single', 'Married', 'Divorced', 'Widowed'])}
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-medical-500 to-medical-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Passport & Travel Information</h2>
            </div>
            
            <div className="space-y-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center space-x-2 text-red-800">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Passport information cannot be changed after submission</span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {renderFormField('passportNumber', 'Passport Number')}
                {renderFormField('confirmPassportNumber', 'Confirm Passport Number')}
                {renderFormField('passportIssueDate', 'Issue Date', 'date')}
                {renderFormField('passportIssuePlace', 'Issue Place/Country')}
                {renderFormField('passportExpiryDate', 'Expiry Date', 'date')}
                {renderFormField('visaType', 'Visa Type', 'select', visaTypes)}
                {renderFormField('positionAppliedFor', 'Position/Job Title', 'select', positions, false)}
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-medical-500 to-medical-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Contact Information & Review</h2>
            </div>
            
            <div className="space-y-6">
              {/* Show validation errors if any */}
              {Object.keys(errors).length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-2 text-red-800 mb-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Please fix the following errors:</span>
                  </div>
                  <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                    {Object.entries(errors).map(([field, message]) => (
                      <li key={field}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="grid md:grid-cols-2 gap-6">
                {renderFormField('email', 'Email Address', 'email')}
                {renderFormField('phone', 'Phone Number', 'tel')}
                {renderFormField('nationalId', 'National ID (Optional)', 'text', undefined, false)}
              </div>
              
              <div className="bg-medical-50 border border-medical-200 rounded-xl p-6">
                <h4 className="font-semibold text-medical-900 mb-4">Application Summary</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium capitalize">{formData.appointmentType}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Center:</span>
                    <span className="ml-2 font-medium">{formData.medicalCenter}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="ml-2 font-medium">{formData.appointmentDate}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Destination:</span>
                    <span className="ml-2 font-medium">{formData.countryTravelingTo}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <label className="flex items-start space-x-3">
                  <input type="checkbox" required className="mt-1 w-4 h-4 text-medical-600 border-gray-300 rounded focus:ring-medical-500" />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    I confirm that all information provided is accurate and matches my official documents. 
                    I understand that providing false information may result in appointment cancellation and understand the terms and conditions.
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

         {/* Enhanced Navigation */}
        <div className="bg-gray-50 border-t border-gray-200 px-8 py-6">
          {/* Debug Info */}
          <div className="text-xs text-gray-500 mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
            Debug: Current Step = {currentStep}, Submit Button Should Show = {currentStep === 5 ? 'YES' : 'NO'}
          </div>
          
          <div className="flex items-center justify-between">
            {currentStep > 1 ? (
              <button 
                type="button" 
                onClick={prevStep}
                className="flex items-center space-x-2 px-6 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                disabled={isSubmitting}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Previous</span>
              </button>
            ) : (
              <div></div>
            )}
            
            {currentStep < 5 ? (
              <button 
                type="button" 
                onClick={nextStep}
                className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-medical-600 to-medical-700 text-white rounded-xl hover:from-medical-700 hover:to-medical-800 transition-all duration-200 shadow-lg"
                disabled={isSubmitting}
              >
                <span>Continue</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            ) : (
                <button 
                  type="button" 
                  onClick={handleSubmit}
                  className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg font-medium"
                  disabled={isSubmitting}
                  style={{ visibility: 'visible', opacity: 1, display: 'flex' }}
                >
                {isSubmitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Submit & Continue to Payment</span>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentForm;