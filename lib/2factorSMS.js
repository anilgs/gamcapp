const https = require('https');

class TwoFactorSMS {
  constructor() {
    this.apiKey = process.env.TWOFACTOR_API_KEY;
    this.baseUrl = '2factor.in';
    this.template = process.env.TWOFACTOR_TEMPLATE || 'AUTOGEN2';
  }

  formatPhoneNumber(phone) {
    if (!phone) {
      throw new Error('Phone number is required');
    }
    
    let cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.startsWith('91')) {
      return `+${cleanPhone}`;
    } else if (cleanPhone.length === 10) {
      return `+91${cleanPhone}`;
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
      return `+91${cleanPhone.substring(1)}`;
    }
    
    return `+91${cleanPhone}`;
  }

  async sendOTP(phone) {
    return new Promise((resolve, reject) => {
      if (!this.apiKey) {
        return reject(new Error('2factor.in API key not configured'));
      }

      try {
        const formattedPhone = this.formatPhoneNumber(phone);
        const phoneWithoutPlus = formattedPhone.replace('+', '');
        
        const path = `/API/V1/${this.apiKey}/SMS/${phoneWithoutPlus}/${this.template}`;
        
        const options = {
          hostname: this.baseUrl,
          port: 443,
          path: path,
          method: 'GET',
          timeout: 10000
        };

        const req = https.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              
              if (response.Status === 'Success') {
                resolve({
                  success: true,
                  sessionId: response.Details,
                  otp: response.OTP || null,
                  message: 'OTP sent successfully'
                });
              } else {
                reject(new Error(`2factor.in API error: ${response.Details || 'Unknown error'}`));
              }
            } catch (parseError) {
              reject(new Error(`Failed to parse 2factor.in response: ${parseError.message}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(new Error(`2factor.in request failed: ${error.message}`));
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('2factor.in request timeout'));
        });

        req.end();
      } catch (error) {
        reject(new Error(`Phone number formatting error: ${error.message}`));
      }
    });
  }

  async verifyOTP(sessionId, otp) {
    return new Promise((resolve, reject) => {
      if (!this.apiKey) {
        return reject(new Error('2factor.in API key not configured'));
      }

      if (!sessionId || !otp) {
        return reject(new Error('Session ID and OTP are required for verification'));
      }

      const path = `/API/V1/${this.apiKey}/SMS/VERIFY/${sessionId}/${otp}`;
      
      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: path,
        method: 'GET',
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (response.Status === 'Success') {
              resolve({
                success: true,
                message: 'OTP verified successfully'
              });
            } else {
              resolve({
                success: false,
                message: response.Details || 'OTP verification failed'
              });
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse 2factor.in response: ${parseError.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`2factor.in verification request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('2factor.in verification request timeout'));
      });

      req.end();
    });
  }
}

module.exports = new TwoFactorSMS();