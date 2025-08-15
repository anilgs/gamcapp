const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.adminEmail = process.env.ADMIN_EMAIL || 'admin@gamca.in';
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@gamca.in';
    this.fromName = process.env.FROM_NAME || 'GAMCA Medical Services';
    this.templatesDir = path.join(process.cwd(), 'templates');
  }

  /**
   * Initialize email transporter
   */
  async initializeTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    try {
      // Configure transporter based on environment
      const emailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      };

      // For development, use ethereal email if no SMTP config provided
      if (!process.env.SMTP_USER && process.env.NODE_ENV !== 'production') {
        console.log('No SMTP configuration found, using Ethereal Email for testing...');
        const testAccount = await nodemailer.createTestAccount();
        emailConfig.host = 'smtp.ethereal.email';
        emailConfig.port = 587;
        emailConfig.secure = false;
        emailConfig.auth = {
          user: testAccount.user,
          pass: testAccount.pass
        };
      }

      this.transporter = nodemailer.createTransporter(emailConfig);

      // Verify connection
      await this.transporter.verify();
      console.log('Email transporter initialized successfully');
      
      return this.transporter;
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
      throw new Error('Email service initialization failed');
    }
  }

  /**
   * Load email template
   * @param {string} templateName - Template filename without extension
   * @param {Object} variables - Variables to replace in template
   * @returns {Promise<string>} Rendered template
   */
  async loadTemplate(templateName, variables = {}) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.html`);
      let template = await fs.readFile(templatePath, 'utf8');

      // Replace variables in template
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        template = template.replace(regex, variables[key] || '');
      });

      return template;
    } catch (error) {
      console.error(`Failed to load email template ${templateName}:`, error);
      // Return a basic template if file loading fails
      return this.getBasicTemplate(templateName, variables);
    }
  }

  /**
   * Get basic template as fallback
   * @param {string} templateName - Template name
   * @param {Object} variables - Template variables
   * @returns {string} Basic HTML template
   */
  getBasicTemplate(templateName, variables) {
    const { userName, paymentId, amount, appointmentType } = variables;
    
    switch (templateName) {
      case 'payment-confirmation':
        return `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Payment Confirmation - GAMCA Medical Services</h2>
                <p>Dear ${userName || 'User'},</p>
                <p>Your payment has been successfully processed for your medical appointment.</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p><strong>Payment ID:</strong> ${paymentId || 'N/A'}</p>
                  <p><strong>Amount:</strong> ${amount || 'N/A'}</p>
                  <p><strong>Appointment Type:</strong> ${appointmentType || 'N/A'}</p>
                </div>
                <p>Your appointment will be processed within 24-48 hours. You will receive your appointment slip once it's ready.</p>
                <p>Thank you for choosing GAMCA Medical Services.</p>
                <hr style="margin: 30px 0;">
                <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply to this message.</p>
              </div>
            </body>
          </html>
        `;
      
      case 'admin-notification':
        return `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #dc2626;">New Payment Received - GAMCA Admin</h2>
                <p>A new payment has been received and requires processing.</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p><strong>User:</strong> ${userName || 'N/A'}</p>
                  <p><strong>Payment ID:</strong> ${paymentId || 'N/A'}</p>
                  <p><strong>Amount:</strong> ${amount || 'N/A'}</p>
                  <p><strong>Appointment Type:</strong> ${appointmentType || 'N/A'}</p>
                </div>
                <p>Please log in to the admin dashboard to process this appointment.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/dashboard" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Admin Dashboard</a></p>
              </div>
            </body>
          </html>
        `;
      
      default:
        return `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>GAMCA Medical Services</h2>
                <p>Thank you for using our services.</p>
              </div>
            </body>
          </html>
        `;
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(options) {
    try {
      await this.initializeTransporter();

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // Log preview URL for development
      if (process.env.NODE_ENV !== 'production' && result.messageId) {
        const previewUrl = nodemailer.getTestMessageUrl(result);
        if (previewUrl) {
          console.log('Email preview URL:', previewUrl);
        }
      }

      console.log('Email sent successfully:', result.messageId);
      return {
        success: true,
        messageId: result.messageId,
        previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(result) : null
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send payment confirmation email to user
   * @param {Object} userDetails - User details
   * @param {Object} paymentDetails - Payment details
   * @returns {Promise<Object>} Send result
   */
  async sendPaymentConfirmation(userDetails, paymentDetails) {
    try {
      const templateVariables = {
        userName: userDetails.name,
        userEmail: userDetails.email,
        paymentId: paymentDetails.payment_id,
        orderId: paymentDetails.order_id,
        amount: paymentDetails.amount_formatted,
        appointmentType: paymentDetails.appointment_type_label,
        paymentDate: new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/user/dashboard`
      };

      const htmlContent = await this.loadTemplate('payment-confirmation', templateVariables);

      return await this.sendEmail({
        to: userDetails.email,
        subject: 'Payment Confirmation - GAMCA Medical Appointment',
        html: htmlContent
      });
    } catch (error) {
      console.error('Failed to send payment confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send admin notification email
   * @param {Object} userDetails - User details
   * @param {Object} paymentDetails - Payment details
   * @returns {Promise<Object>} Send result
   */
  async sendAdminNotification(userDetails, paymentDetails) {
    try {
      const templateVariables = {
        userName: userDetails.name,
        userEmail: userDetails.email,
        userPhone: userDetails.phone,
        paymentId: paymentDetails.payment_id,
        orderId: paymentDetails.order_id,
        amount: paymentDetails.amount_formatted,
        appointmentType: paymentDetails.appointment_type_label,
        paymentDate: new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        adminDashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/dashboard`
      };

      const htmlContent = await this.loadTemplate('admin-notification', templateVariables);

      return await this.sendEmail({
        to: this.adminEmail,
        subject: `New Payment Received - ${userDetails.name} (${paymentDetails.payment_id})`,
        html: htmlContent
      });
    } catch (error) {
      console.error('Failed to send admin notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send appointment slip ready notification
   * @param {Object} userDetails - User details
   * @param {Object} appointmentDetails - Appointment details
   * @returns {Promise<Object>} Send result
   */
  async sendAppointmentSlipReady(userDetails, appointmentDetails) {
    try {
      const templateVariables = {
        userName: userDetails.name,
        appointmentType: appointmentDetails.appointment_type_label,
        appointmentDate: appointmentDetails.preferred_date ? 
          new Date(appointmentDetails.preferred_date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : 'To be confirmed',
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/user/dashboard`
      };

      const htmlContent = await this.loadTemplate('appointment-ready', templateVariables);

      return await this.sendEmail({
        to: userDetails.email,
        subject: 'Your Appointment Slip is Ready - GAMCA Medical Services',
        html: htmlContent
      });
    } catch (error) {
      console.error('Failed to send appointment slip ready notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send custom email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} templateName - Template name
   * @param {Object} variables - Template variables
   * @returns {Promise<Object>} Send result
   */
  async sendCustomEmail(to, subject, templateName, variables = {}) {
    try {
      const htmlContent = await this.loadTemplate(templateName, variables);
      
      return await this.sendEmail({
        to,
        subject,
        html: htmlContent
      });
    } catch (error) {
      console.error('Failed to send custom email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test email configuration
   * @returns {Promise<Object>} Test result
   */
  async testEmailConfig() {
    try {
      await this.initializeTransporter();
      
      const testResult = await this.sendEmail({
        to: this.adminEmail,
        subject: 'GAMCA Email Service Test',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Email Service Test</h2>
                <p>This is a test email to verify that the GAMCA email service is working correctly.</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
                <p>If you receive this email, the email service is configured properly.</p>
              </div>
            </body>
          </html>
        `
      });

      return testResult;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const emailService = new EmailService();

module.exports = emailService;
