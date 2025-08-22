import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface AppointmentFormData {
  firstName: string
  lastName: string
  dateOfBirth: string
  nationality: string
  gender: string
  maritalStatus: string
  passportNumber: string
  confirmPassportNumber: string
  passportIssueDate: string
  passportIssuePlace: string
  passportExpiryDate: string
  visaType: string
  email: string
  phone: string
  nationalId: string
  positionAppliedFor: string
  country: string
  city: string
  countryTravelingTo: string
  appointmentType: string
  medicalCenter: string
  appointmentDate: string
}

interface FormErrors {
  [key: string]: string
}

export default function AppointmentForm() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userPhone, setUserPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      router.push('/')
    }
  }

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
    visaType: '',
    email: '',
    phone: '',
    nationalId: '',
    positionAppliedFor: '',
    country: '',
    city: '',
    countryTravelingTo: '',
    appointmentType: 'standard',
    medicalCenter: '',
    appointmentDate: ''
  })

  const countries = [
    'Albania', 'Algeria', 'Angola', 'Bangladesh', 'Burundi', 'Cameroon', 'Chad', 'Egypt', 
    'Ethiopia', 'Ghana', 'Guatemala', 'India', 'Indonesia', 'Jordan', 'Kenya', 'Lebanon', 
    'Malawi', 'Mali', 'Morocco', 'Nepal', 'Niger', 'Nigeria', 'Pakistan', 'Panama', 
    'Philippines', 'Sierra Leone', 'Somalia', 'Sri Lanka', 'Sudan', 'Syria', 'Tanzania', 
    'Thailand', 'Tunisia', 'Turkey', 'Uganda'
  ]

  const gccCountries = [
    'Bahrain', 'Kuwait', 'Oman', 'Qatar', 'Saudi Arabia', 'UAE', 'Yemen'
  ]

  const nationalities = [
    'Afghan', 'Albanian', 'Algerian', 'Angolan', 'Argentinian', 'Armenian', 'Australian', 
    'Austrian', 'Azerbaijani', 'Bahraini', 'Bangladeshi', 'Belarusian', 'Belgian', 'Belizean', 
    'Bhutanese', 'Bosnian', 'Brazilian', 'British', 'Bulgarian', 'Burkinabe', 'Burundian', 
    'Cambodian', 'Cameroonian', 'Canadian', 'Chadian', 'Chinese', 'Colombian', 'Cuban', 
    'Cypriot', 'Czech', 'Danish', 'Djibouti', 'Dominica', 'Dutch', 'Ecuadorean', 'Egyptian', 
    'Eritrean', 'Ethiopian', 'Filipino', 'Finnish', 'French', 'German', 'Ghanaian', 'Greek', 
    'Guatemalan', 'Guinean', 'Guyanese', 'Indian', 'Indonesian', 'Iranian', 'Iraqi', 'Irish', 
    'Italian', 'Ivorian', 'Jamaican', 'Japanese', 'Jordanian', 'Kazakhstani', 'Kenyan', 
    'Kuwaiti', 'Kyrgyzstani', 'Laotian', 'Lebanese', 'Libyan', 'Lithuanian', 'Malagasy', 
    'Malawian', 'Malaysian', 'Maldivian', 'Malian', 'Maltese', 'Mauritanian', 'Mexican', 
    'Montenegrin', 'Moroccan', 'Myanmar', 'Nepalese', 'New Zealander', 'Nigerian', 'Nigerien', 
    'Norwegian', 'Omani', 'Pakistani', 'Palestinian', 'Panamanian', 'Peruvian', 'Polish', 
    'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Rwandan', 'Saudi', 'Senegalese', 'Serbian', 
    'Sierra Leonean', 'Slovakian', 'Slovenian', 'Somali', 'South African', 'South Korean', 
    'Sri Lankan', 'Sudanese', 'Swedish', 'Swiss', 'Syrian', 'Taiwanese', 'Tajik', 'Tanzanian', 
    'Thai', 'Togolese', 'Tunisian', 'Turkish', 'Turkmen', 'Ugandan', 'Ukrainian', 
    'American', 'Uzbekistani', 'Vanuatu', 'Venezuelan', 'Vietnamese', 'Yemeni'
  ]

  const visaTypes = [
    'Work Visa', 'Family Visa', 'Study Visa'
  ]

  const positions = [
    'Banking & Finance', 'Carpenter', 'Cashier', 'Electrician', 'Engineer', 'General Secretary', 
    'Health & Medicine & Nursing', 'Heavy Driver', 'IT & Internet Engineer', 'Leisure & Tourism', 
    'Light Driver', 'Mason', 'President Labour', 'Plumber', 'Doctor', 'Family', 'Steel Fixer', 
    'Aluminum Technician', 'Nurse', 'Male Nurse', 'Ward Boy', 'Shovel Operator', 'Dozer Operator', 
    'Car Mechanic', 'Petrol Mechanic', 'Diesel Mechanic', 'Student', 'Accountant', 'Lab Technician', 
    'Draftsman', 'Auto-Cad Operator', 'Painter', 'Tailor', 'Welder', 'X-ray Technician', 
    'Lecturer', 'A.C Technician', 'Business', 'Cleaner', 'Security Guard', 'House Maid', 
    'Manager', 'Hospital Cleaning', 'Mechanic', 'Computer Operator', 'House Driver', 'Driver', 
    'Cleaning Labour', 'Building Electrician', 'Salesman', 'Plastermason', 'Servant', 'Barber', 
    'Residence', 'Shepherds', 'Employment', 'Fuel Filler', 'Worker', 'House Boy', 'House Wife', 
    'RCC Fitter', 'Clerk', 'Microbiologist', 'Teacher', 'Helper', 'Hajj Duty', 'Shuttering', 
    'Supervisor', 'Medical Specialist', 'Office Secretary', 'Technician', 'Butcher', 
    'Arabic Food Cook', 'Agricultural Worker', 'Service', 'Studio', 'CAD Designer', 
    'Financial Analyst', 'Cabin Appearance (AIRLINES)', 'Car Washer', 'Surveyor', 
    'Electrical Technician', 'Waiter', 'Nursing helper', 'Anesthesia technician', 
    'Construction worker', 'Other'
  ]

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetch('/api/auth/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsAuthenticated(true)
          setUserPhone(data.user.phone)
          setFormData(prev => ({ ...prev, phone: data.user.phone }))
        } else {
          localStorage.removeItem('token')
          router.push('/auth/login')
        }
        setLoading(false)
      })
      .catch(() => {
        localStorage.removeItem('token')
        router.push('/auth/login')
        setLoading(false)
      })
    } else {
      router.push('/auth/login')
      setLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: FormErrors = {}

    // Required field validation
    const requiredFields = [
      'firstName', 'lastName', 'dateOfBirth', 'nationality', 'gender', 'maritalStatus',
      'passportNumber', 'confirmPassportNumber', 'passportIssueDate', 'passportIssuePlace',
      'passportExpiryDate', 'visaType', 'email', 'phone', 'country', 'countryTravelingTo',
      'medicalCenter', 'appointmentDate'
    ]

    requiredFields.forEach(field => {
      if (!formData[field as keyof AppointmentFormData] || !formData[field as keyof AppointmentFormData].toString().trim()) {
        newErrors[field] = 'This field is required'
      }
    })

    // Passport number confirmation
    if (formData.passportNumber !== formData.confirmPassportNumber) {
      newErrors.confirmPassportNumber = 'Passport numbers do not match'
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Phone validation
    if (formData.phone && !/^(\+91|91)?[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        router.push(`/payment?appointmentId=${result.data.appointmentId}`)
      } else {
        throw new Error(result.error || 'Failed to create appointment')
      }
    } catch (error) {
      console.error('Error submitting appointment:', error)
      alert('Failed to submit appointment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-clinical-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-600 mx-auto"></div>
          <p className="mt-4 text-clinical-600 font-medical">Loading your appointment form...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      <Head>
        <title>Appointment Form - GAMCA Medical Verification</title>
        <meta name="description" content="Complete your medical appointment details" />
      </Head>

      <div className="min-h-screen bg-clinical-100">
        <header className="bg-white shadow-lg border-b border-clinical-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-medical-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </div>
                  <Link href="/" className="text-2xl font-brand font-bold text-medical-600">
                    GAMCA
                  </Link>
                  <span className="text-sm text-clinical-500 font-medical">Medical Verification</span>
                </div>
              </div>
              <nav className="flex space-x-8">
                <Link href="/" className="text-clinical-600 hover:text-medical-600 font-medical font-medium transition-colors">
                  Home
                </Link>
                <Link href="/user/dashboard" className="text-clinical-600 hover:text-medical-600 font-medical font-medium transition-colors">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-clinical-600 hover:text-red-600 font-medical font-medium transition-colors"
                >
                  Logout
                </button>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-medical-500 rounded-2xl flex items-center justify-center shadow-medical">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-brand font-bold text-clinical-900 mb-4">
              Medical Examination Appointment
            </h1>
            <p className="text-lg text-clinical-600 font-medical mb-2">
              Complete your GAMCA medical appointment booking
            </p>
            <div className="inline-flex items-center bg-health-100 text-health-800 px-4 py-2 rounded-full">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Authenticated: {userPhone}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Appointment Location */}
            <div className="card-medical">
              <div className="section-header">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-medical-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-brand font-bold text-clinical-900">Appointment Location</h3>
                </div>
                <p className="text-sm text-clinical-600 font-medical mt-2">Select your preferred medical examination center</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="form-label">Country *</label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className={`form-input ${errors.country ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Country</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {errors.country && <p className="text-red-600 text-sm mt-1">{errors.country}</p>}
                </div>

                <div>
                  <label className="form-label">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={`form-input ${errors.city ? 'border-red-500' : ''}`}
                    placeholder="Select City"
                    disabled={isSubmitting}
                  />
                  {errors.city && <p className="text-red-600 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="form-label">Country Traveling To *</label>
                  <select
                    name="countryTravelingTo"
                    value={formData.countryTravelingTo}
                    onChange={handleInputChange}
                    className={`form-input ${errors.countryTravelingTo ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Country Travelling To</option>
                    {gccCountries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {errors.countryTravelingTo && <p className="text-red-600 text-sm mt-1">{errors.countryTravelingTo}</p>}
                </div>
              </div>
            </div>

            {/* Medical Center & Schedule */}
            <div className="card-medical">
              <div className="section-header">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-health-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-brand font-bold text-clinical-900">Choose Medical Center</h3>
                </div>
                <p className="text-sm text-clinical-600 font-medical mt-2">Select your preferred examination center and appointment date</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Medical Center *</label>
                  <select
                    name="medicalCenter"
                    value={formData.medicalCenter}
                    onChange={handleInputChange}
                    className={`form-medical ${errors.medicalCenter ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Medical Center</option>
                    <option value="gamca_mumbai">GAMCA Mumbai</option>
                    <option value="gamca_delhi">GAMCA Delhi</option>
                    <option value="gamca_chennai">GAMCA Chennai</option>
                    <option value="gamca_hyderabad">GAMCA Hyderabad</option>
                    <option value="gamca_kochi">GAMCA Kochi</option>
                    <option value="gamca_bangalore">GAMCA Bangalore</option>
                  </select>
                  {errors.medicalCenter && <p className="text-red-600 text-sm mt-1">{errors.medicalCenter}</p>}
                </div>

                <div>
                  <label className="form-label">Appointment Date *</label>
                  <input
                    type="date"
                    name="appointmentDate"
                    value={formData.appointmentDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className={`form-input ${errors.appointmentDate ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.appointmentDate && <p className="text-red-600 text-sm mt-1">{errors.appointmentDate}</p>}
                </div>
              </div>
            </div>

            {/* Candidate Information */}
            <div className="card-medical hover-lift hover-glow-medical border-t-4 border-accent-500">
              <div className="section-header mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-brand font-bold text-clinical-900">Personal Information</h3>
                </div>
                <p className="text-sm text-clinical-600 font-medical mt-2">Provide your personal details as they appear on your passport</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`form-input ${errors.firstName ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.firstName && <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <label className="form-label">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`form-input ${errors.lastName ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.lastName && <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>}
                </div>

                <div>
                  <label className="form-label">Date of Birth *</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className={`form-input ${errors.dateOfBirth ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.dateOfBirth && <p className="text-red-600 text-sm mt-1">{errors.dateOfBirth}</p>}
                </div>

                <div>
                  <label className="form-label">Nationality *</label>
                  <select
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleInputChange}
                    className={`form-input ${errors.nationality ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Nationality</option>
                    {nationalities.map(nationality => (
                      <option key={nationality} value={nationality}>{nationality}</option>
                    ))}
                  </select>
                  {errors.nationality && <p className="text-red-600 text-sm mt-1">{errors.nationality}</p>}
                </div>

                <div>
                  <label className="form-label">Gender *</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className={`form-input ${errors.gender ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  >
                    <option value="">---------</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  {errors.gender && <p className="text-red-600 text-sm mt-1">{errors.gender}</p>}
                </div>

                <div>
                  <label className="form-label">Marital Status *</label>
                  <select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleInputChange}
                    className={`form-input ${errors.maritalStatus ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  >
                    <option value="">---------</option>
                    <option value="Married">Married</option>
                    <option value="Single">Single</option>
                  </select>
                  {errors.maritalStatus && <p className="text-red-600 text-sm mt-1">{errors.maritalStatus}</p>}
                </div>

                <div>
                  <label className="form-label">Passport Number *</label>
                  <input
                    type="text"
                    name="passportNumber"
                    value={formData.passportNumber}
                    onChange={handleInputChange}
                    className={`form-input ${errors.passportNumber ? 'border-red-500' : ''}`}
                    placeholder="№"
                    disabled={isSubmitting}
                  />
                  {errors.passportNumber && <p className="text-red-600 text-sm mt-1">{errors.passportNumber}</p>}
                </div>

                <div>
                  <label className="form-label">Confirm Passport № *</label>
                  <input
                    type="text"
                    name="confirmPassportNumber"
                    value={formData.confirmPassportNumber}
                    onChange={handleInputChange}
                    className={`form-input ${errors.confirmPassportNumber ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.confirmPassportNumber && <p className="text-red-600 text-sm mt-1">{errors.confirmPassportNumber}</p>}
                </div>

                <div>
                  <label className="form-label">Passport Issue Date *</label>
                  <input
                    type="date"
                    name="passportIssueDate"
                    value={formData.passportIssueDate}
                    onChange={handleInputChange}
                    className={`form-input ${errors.passportIssueDate ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.passportIssueDate && <p className="text-red-600 text-sm mt-1">{errors.passportIssueDate}</p>}
                </div>

                <div>
                  <label className="form-label">Passport Issue Place *</label>
                  <input
                    type="text"
                    name="passportIssuePlace"
                    value={formData.passportIssuePlace}
                    onChange={handleInputChange}
                    className={`form-input ${errors.passportIssuePlace ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.passportIssuePlace && <p className="text-red-600 text-sm mt-1">{errors.passportIssuePlace}</p>}
                </div>

                <div>
                  <label className="form-label">Passport Expiry Date *</label>
                  <input
                    type="date"
                    name="passportExpiryDate"
                    value={formData.passportExpiryDate}
                    onChange={handleInputChange}
                    className={`form-input ${errors.passportExpiryDate ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.passportExpiryDate && <p className="text-red-600 text-sm mt-1">{errors.passportExpiryDate}</p>}
                </div>

                <div>
                  <label className="form-label">Visa Type *</label>
                  <select
                    name="visaType"
                    value={formData.visaType}
                    onChange={handleInputChange}
                    className={`form-input ${errors.visaType ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  >
                    <option value="">Select Visa Type</option>
                    {visaTypes.map(visa => (
                      <option key={visa} value={visa}>{visa}</option>
                    ))}
                  </select>
                  {errors.visaType && <p className="text-red-600 text-sm mt-1">{errors.visaType}</p>}
                </div>

                <div>
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`form-input ${errors.email ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="form-label">Phone № *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    className="form-input bg-gray-100"
                    disabled={true}
                  />
                  <p className="text-sm text-gray-500 mt-1">Phone verified via OTP</p>
                </div>

                <div>
                  <label className="form-label">National ID</label>
                  <input
                    type="text"
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={handleInputChange}
                    className="form-input"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="form-label">Position Applied For</label>
                  <select
                    name="positionAppliedFor"
                    value={formData.positionAppliedFor}
                    onChange={handleInputChange}
                    className="form-input"
                    disabled={isSubmitting}
                  >
                    <option value="">---------</option>
                    {positions.map(position => (
                      <option key={position} value={position}>{position}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Terms and Submit */}
            <div className="card-medical hover-lift border-t-4 border-health-500">
              <div className="section-header-health mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-health-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-brand font-bold text-clinical-900">Confirmation & Submission</h3>
                </div>
                <p className="text-sm text-clinical-600 font-medical mt-2">Review your information and confirm to proceed with payment</p>
              </div>

              <div className="bg-health-50 border border-health-200 p-6 rounded-xl mb-6">
                <div className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-health-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-brand font-semibold text-health-800 mb-2">Declaration of Accuracy</h4>
                    <p className="text-sm text-health-700 font-medical leading-relaxed">
                      I confirm that the information provided in this form is true, complete, and accurate to the best of my knowledge. 
                      I understand that any false information may result in appointment cancellation and potential legal consequences.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="btn-secondary px-8 py-3 hover-lift"
                  disabled={isSubmitting}
                >
                  <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Cancel & Return Home
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`btn-medical px-8 py-3 hover-lift ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      <span>Processing Appointment...</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Confirm & Continue to Payment</span>
                    </div>
                  )}
                </button>
              </div>

              {/* Security Trust Indicator */}
              <div className="mt-6 p-4 bg-medical-50 border border-medical-200 rounded-lg">
                <div className="flex items-center justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-medical-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-medical-800 font-medical">SSL Encrypted</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-health-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-health-800 font-medical">GAMCA Certified</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-accent-800 font-medical">Secure Payment</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </main>

        {/* Footer */}
        <footer className="bg-clinical-800 text-white mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-medical-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </div>
                  <span className="text-2xl font-brand font-bold">GAMCA</span>
                  <span className="text-clinical-400">Medical Verification</span>
                </div>
                <p className="text-clinical-300 font-medical leading-relaxed max-w-md">
                  Professional medical appointment booking platform for travel verification. 
                  Trusted by thousands of travelers worldwide for secure and efficient medical services.
                </p>
              </div>
              
              <div>
                <h4 className="text-lg font-brand font-semibold mb-4">Services</h4>
                <ul className="space-y-2 text-clinical-300 font-medical">
                  <li>Medical Examinations</li>
                  <li>Travel Verification</li>
                  <li>Digital Records</li>
                  <li>GAMCA Certification</li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-brand font-semibold mb-4">Support</h4>
                <ul className="space-y-2 text-clinical-300 font-medical">
                  <li>24/7 Customer Support</li>
                  <li>Medical Centers</li>
                  <li>Payment Help</li>
                  <li>Technical Support</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-clinical-700 mt-8 pt-8 text-center">
              <p className="text-clinical-400 font-medical">&copy; 2024 GAMCA Medical Verification. All rights reserved.</p>
              <p className="mt-2 text-clinical-500 text-sm">Professional Medical Appointment Booking Platform</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
