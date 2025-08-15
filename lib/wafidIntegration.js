const axios = require('axios');
const cheerio = require('cheerio');

class WafidIntegration {
  constructor() {
    this.baseUrl = 'https://www.wafid.com';
    this.bookingUrl = `${this.baseUrl}/appointment-booking`;
    this.timeout = 30000; // 30 seconds timeout
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    this.axiosInstance = null;
  }

  /**
   * Initialize axios instance with proper configuration
   */
  initializeAxios() {
    if (this.axiosInstance) {
      return this.axiosInstance;
    }

    this.axiosInstance = axios.create({
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      withCredentials: true,
      maxRedirects: 5
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`Making request to: ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('Response error:', error.message);
        return Promise.reject(error);
      }
    );

    return this.axiosInstance;
  }

  /**
   * Extract CSRF token and session cookies from the booking page
   * @returns {Promise<Object>} Session data including CSRF token and cookies
   */
  async getSessionData() {
    try {
      const axios = this.initializeAxios();
      const response = await axios.get(this.bookingUrl);
      
      const $ = cheerio.load(response.data);
      
      // Extract CSRF token (common patterns)
      let csrfToken = null;
      
      // Try different selectors for CSRF token
      const csrfSelectors = [
        'meta[name="csrf-token"]',
        'input[name="_token"]',
        'input[name="csrf_token"]',
        'input[name="_csrf"]'
      ];
      
      for (const selector of csrfSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          csrfToken = element.attr('content') || element.attr('value');
          if (csrfToken) break;
        }
      }
      
      // Extract cookies from response headers
      const cookies = response.headers['set-cookie'] || [];
      const cookieString = cookies.map(cookie => cookie.split(';')[0]).join('; ');
      
      // Extract form action URL if different from base URL
      const formAction = $('form').attr('action') || '/appointment-booking';
      const fullFormUrl = formAction.startsWith('http') ? formAction : `${this.baseUrl}${formAction}`;
      
      return {
        csrfToken,
        cookies: cookieString,
        formUrl: fullFormUrl,
        sessionId: this.extractSessionId(cookies),
        formFields: this.extractFormFields($)
      };
    } catch (error) {
      console.error('Error getting session data:', error);
      throw new Error(`Failed to get session data: ${error.message}`);
    }
  }

  /**
   * Extract session ID from cookies
   * @param {Array} cookies - Array of cookie strings
   * @returns {string|null} Session ID
   */
  extractSessionId(cookies) {
    for (const cookie of cookies) {
      const sessionMatch = cookie.match(/(?:PHPSESSID|sessionid|session_id)=([^;]+)/i);
      if (sessionMatch) {
        return sessionMatch[1];
      }
    }
    return null;
  }

  /**
   * Extract form fields and their attributes from the booking form
   * @param {Object} $ - Cheerio instance
   * @returns {Object} Form fields information
   */
  extractFormFields($) {
    const fields = {};
    
    $('form input, form select, form textarea').each((index, element) => {
      const $el = $(element);
      const name = $el.attr('name');
      const type = $el.attr('type') || $el.prop('tagName').toLowerCase();
      const required = $el.attr('required') !== undefined;
      const placeholder = $el.attr('placeholder');
      const value = $el.attr('value');
      
      if (name) {
        fields[name] = {
          type,
          required,
          placeholder,
          defaultValue: value,
          options: type === 'select' ? this.extractSelectOptions($el) : null
        };
      }
    });
    
    return fields;
  }

  /**
   * Extract options from select elements
   * @param {Object} $select - Cheerio select element
   * @returns {Array} Array of option objects
   */
  extractSelectOptions($select) {
    const options = [];
    $select.find('option').each((index, option) => {
      const $option = $select.constructor(option);
      options.push({
        value: $option.attr('value'),
        text: $option.text().trim()
      });
    });
    return options;
  }

  /**
   * Map GAMCA user data to wafid.com form fields
   * @param {Object} userData - User data from GAMCA system
   * @param {Object} appointmentData - Appointment data
   * @returns {Object} Mapped form data
   */
  mapUserDataToWafidForm(userData, appointmentData) {
    // Common field mappings (these may need adjustment based on actual wafid.com form)
    const fieldMappings = {
      // Personal Information
      'full_name': userData.name,
      'name': userData.name,
      'first_name': userData.name.split(' ')[0],
      'last_name': userData.name.split(' ').slice(1).join(' '),
      'email': userData.email,
      'email_address': userData.email,
      'phone': userData.phone,
      'phone_number': userData.phone,
      'mobile': userData.phone,
      'mobile_number': userData.phone,
      
      // Passport Information
      'passport_number': userData.passport_number,
      'passport_no': userData.passport_number,
      'passport': userData.passport_number,
      
      // Appointment Information
      'appointment_type': this.mapAppointmentType(appointmentData.appointment_type),
      'medical_type': this.mapAppointmentType(appointmentData.appointment_type),
      'visa_type': this.mapAppointmentType(appointmentData.appointment_type),
      'preferred_date': appointmentData.preferred_date,
      'appointment_date': appointmentData.preferred_date,
      'medical_center': appointmentData.medical_center,
      'center': appointmentData.medical_center,
      
      // Additional fields that might be required
      'nationality': appointmentData.nationality || 'Indian',
      'gender': appointmentData.gender || 'Male',
      'age': appointmentData.age || '30',
      'country': appointmentData.destination_country || 'Saudi Arabia'
    };
    
    return fieldMappings;
  }

  /**
   * Map GAMCA appointment types to wafid.com appointment types
   * @param {string} gamcaType - GAMCA appointment type
   * @returns {string} Wafid appointment type
   */
  mapAppointmentType(gamcaType) {
    const typeMapping = {
      'employment_visa': 'Employment Medical',
      'family_visa': 'Family Visa Medical',
      'visit_visa': 'Visit Visa Medical',
      'student_visa': 'Student Visa Medical',
      'business_visa': 'Business Visa Medical',
      'other': 'General Medical'
    };
    
    return typeMapping[gamcaType] || 'General Medical';
  }

  /**
   * Submit appointment booking to wafid.com
   * @param {Object} userData - User data
   * @param {Object} appointmentData - Appointment data
   * @returns {Promise<Object>} Booking result
   */
  async submitBooking(userData, appointmentData) {
    try {
      console.log('Starting wafid.com booking process...');
      
      // Step 1: Get session data
      const sessionData = await this.getSessionData();
      console.log('Session data obtained:', { 
        hasToken: !!sessionData.csrfToken, 
        hasCookies: !!sessionData.cookies,
        formUrl: sessionData.formUrl
      });
      
      // Step 2: Map user data to form fields
      const formData = this.mapUserDataToWafidForm(userData, appointmentData);
      
      // Step 3: Add CSRF token if available
      if (sessionData.csrfToken) {
        formData._token = sessionData.csrfToken;
        formData.csrf_token = sessionData.csrfToken;
      }
      
      // Step 4: Prepare request headers
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': this.bookingUrl,
        'Origin': this.baseUrl
      };
      
      if (sessionData.cookies) {
        headers.Cookie = sessionData.cookies;
      }
      
      // Step 5: Submit the form
      const axios = this.initializeAxios();
      const response = await axios.post(sessionData.formUrl, 
        new URLSearchParams(formData).toString(), 
        { headers }
      );
      
      // Step 6: Parse response
      const result = this.parseBookingResponse(response);
      
      console.log('Booking submission completed:', result.success ? 'SUCCESS' : 'FAILED');
      
      return {
        success: result.success,
        message: result.message,
        bookingReference: result.bookingReference,
        appointmentDetails: result.appointmentDetails,
        rawResponse: process.env.NODE_ENV === 'development' ? response.data : undefined
      };
      
    } catch (error) {
      console.error('Error submitting booking:', error);
      
      return {
        success: false,
        error: error.message,
        details: {
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url
        }
      };
    }
  }

  /**
   * Parse the booking response to determine success/failure
   * @param {Object} response - Axios response object
   * @returns {Object} Parsed result
   */
  parseBookingResponse(response) {
    try {
      const $ = cheerio.load(response.data);
      
      // Look for success indicators
      const successIndicators = [
        '.success-message',
        '.alert-success',
        '.booking-success',
        '.confirmation',
        '[class*="success"]'
      ];
      
      const errorIndicators = [
        '.error-message',
        '.alert-error',
        '.alert-danger',
        '.booking-error',
        '[class*="error"]'
      ];
      
      let isSuccess = false;
      let message = '';
      let bookingReference = null;
      
      // Check for success
      for (const selector of successIndicators) {
        const element = $(selector);
        if (element.length > 0) {
          isSuccess = true;
          message = element.text().trim();
          break;
        }
      }
      
      // Check for errors if not successful
      if (!isSuccess) {
        for (const selector of errorIndicators) {
          const element = $(selector);
          if (element.length > 0) {
            message = element.text().trim();
            break;
          }
        }
      }
      
      // Extract booking reference if available
      const referenceMatch = response.data.match(/(?:reference|booking|confirmation)[\s\w]*:?\s*([A-Z0-9]{6,})/i);
      if (referenceMatch) {
        bookingReference = referenceMatch[1];
      }
      
      // If no specific success/error found, check HTTP status
      if (!message) {
        if (response.status >= 200 && response.status < 300) {
          isSuccess = true;
          message = 'Booking submitted successfully';
        } else {
          message = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
      
      return {
        success: isSuccess,
        message: message || 'Unknown response',
        bookingReference,
        appointmentDetails: this.extractAppointmentDetails($)
      };
      
    } catch (error) {
      console.error('Error parsing booking response:', error);
      return {
        success: false,
        message: 'Failed to parse booking response',
        bookingReference: null,
        appointmentDetails: null
      };
    }
  }

  /**
   * Extract appointment details from response
   * @param {Object} $ - Cheerio instance
   * @returns {Object|null} Appointment details
   */
  extractAppointmentDetails($) {
    try {
      const details = {};
      
      // Common selectors for appointment details
      const detailSelectors = {
        date: ['.appointment-date', '.booking-date', '[class*="date"]'],
        time: ['.appointment-time', '.booking-time', '[class*="time"]'],
        location: ['.appointment-location', '.medical-center', '[class*="location"]'],
        reference: ['.booking-reference', '.confirmation-number', '[class*="reference"]']
      };
      
      for (const [key, selectors] of Object.entries(detailSelectors)) {
        for (const selector of selectors) {
          const element = $(selector);
          if (element.length > 0) {
            details[key] = element.text().trim();
            break;
          }
        }
      }
      
      return Object.keys(details).length > 0 ? details : null;
    } catch (error) {
      console.error('Error extracting appointment details:', error);
      return null;
    }
  }

  /**
   * Test the wafid.com integration without submitting actual data
   * @returns {Promise<Object>} Test result
   */
  async testIntegration() {
    try {
      console.log('Testing wafid.com integration...');
      
      // Test session data retrieval
      const sessionData = await this.getSessionData();
      
      return {
        success: true,
        message: 'Integration test successful',
        details: {
          canAccessSite: true,
          hasSessionData: !!sessionData,
          hasCsrfToken: !!sessionData.csrfToken,
          hasCookies: !!sessionData.cookies,
          formFields: Object.keys(sessionData.formFields || {}).length,
          formUrl: sessionData.formUrl
        }
      };
      
    } catch (error) {
      console.error('Integration test failed:', error);
      
      return {
        success: false,
        message: 'Integration test failed',
        error: error.message,
        details: {
          canAccessSite: false,
          errorCode: error.code,
          errorStatus: error.response?.status
        }
      };
    }
  }

  /**
   * Get available appointment slots (if supported by wafid.com)
   * @returns {Promise<Array>} Available slots
   */
  async getAvailableSlots() {
    try {
      // This would need to be implemented based on wafid.com's actual API
      // For now, return a placeholder response
      console.log('Getting available appointment slots...');
      
      return {
        success: true,
        slots: [
          { date: '2024-01-15', time: '09:00', available: true },
          { date: '2024-01-15', time: '10:00', available: true },
          { date: '2024-01-16', time: '09:00', available: false },
          { date: '2024-01-16', time: '10:00', available: true }
        ]
      };
      
    } catch (error) {
      console.error('Error getting available slots:', error);
      return {
        success: false,
        error: error.message,
        slots: []
      };
    }
  }
}

// Export singleton instance
const wafidIntegration = new WafidIntegration();

module.exports = wafidIntegration;
