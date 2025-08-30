# GAMCAPP - Medical Appointment Booking System

A comprehensive medical appointment booking system for travel verification, designed as a clone of wafid.com functionality with enhanced features and streamlined user experience.

## 🏥 Project Overview

GAMCA Medical Services is a modern web application that facilitates medical appointment booking for travel verification purposes. The platform provides a seamless experience for users to book appointments, make payments, and manage their medical verification documents, while offering administrators powerful tools for user management and appointment processing.

### Key Features

- **User-Friendly Booking**: Streamlined appointment booking process similar to wafid.com
- **Secure Payments**: Integrated RazorPay payment gateway supporting UPI and credit cards
- **OTP Authentication**: Secure user login system using phone number verification
- **Admin Dashboard**: Comprehensive admin panel for user and appointment management
- **Document Management**: Upload and download appointment slips with secure file handling
- **Email Notifications**: Automated email notifications for payments and appointments
- **Wafid Integration**: Automated appointment booking on wafid.com with pre-filled user data
- **Responsive Design**: Mobile-first design with Tailwind CSS

## 🛠 Technology Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development with strict mode enabled
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing for SPA navigation
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **Axios** - HTTP client for API communication

### Backend
- **PHP** - Server-side scripting language
- **MySQL** - Relational database with UUID primary keys
- **JWT** - JSON Web Tokens for authentication
- **Bcrypt** - Password hashing for admin accounts

### Payment & Communication
- **RazorPay** - Payment gateway for UPI and credit card processing
- **Nodemailer** - Email service with SMTP configuration
- **OTP Library** - One-time password generation and verification

### Deployment
- **Hostinger** - Premium web hosting with GitHub Actions deployment
- **Apache** - Web server with custom configuration
- **GitHub Actions** - Automated deployment pipeline

## 🏗 Architecture Overview

### Application Structure

```
React Frontend (Vite) ←→ PHP Backend API ←→ MySQL Database
           ↓                      ↓                    ↓
   User Interface         Business Logic         Data Storage
   - Authentication       - Payment Processing   - User Records
   - Forms & Validation   - Email Notifications  - Transactions
   - Dashboard Views      - File Management      - Audit Logs
```

### API Endpoints Structure

The application follows a RESTful API design with the following endpoint categories:

#### Authentication (`/api/auth/`)
- `POST /api/auth/admin-login` - Admin authentication with username/password
- `POST /api/auth/send-otp` - Send OTP to user's phone number
- `POST /api/auth/verify-otp` - Verify OTP and authenticate user

#### Payment Processing (`/api/payment/`)
- `POST /api/payment/create-order` - Create RazorPay payment order
- `POST /api/payment/verify` - Verify payment signature and update records

#### Admin Operations (`/api/admin/`)
- `GET /api/admin/users` - Fetch paginated user list with filters
- `POST /api/admin/upload-slip` - Upload appointment slip for users

#### Appointments (`/api/appointments/`)
- `POST /api/appointments/create` - Create new appointment booking

#### File Management (`/api/upload/`)
- `POST /api/upload/appointment-slip` - Handle appointment slip uploads

#### User Operations (`/api/user/`)
- `GET /api/user/profile` - Fetch user profile and appointment details

## 📁 Project Structure

```
gamcapp/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Page components
│   │   ├── lib/          # Utilities and API client
│   │   └── styles/       # Tailwind CSS configurations
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
├── backend/              # PHP backend application
│   ├── src/
│   │   ├── Controllers/  # API endpoint controllers
│   │   ├── Core/         # Core application logic
│   │   ├── lib/          # Utility libraries
│   │   ├── models/       # Database models
│   │   └── middleware/   # Authentication middleware
│   ├── public/           # Public entry point
│   └── composer.json     # PHP dependencies
├── apache-config/        # Apache server configuration
│   ├── .htaccess
│   └── gamcapp.conf
├── .github/workflows/    # GitHub Actions deployment
│   └── deploy-hostinger.yml
└── README.md
```

## 🚀 Prerequisites

Before setting up the GAMCA Medical Services application, ensure you have the following:

### System Requirements
- **Node.js 18+** - JavaScript runtime for frontend build tools
- **PHP 8.0+** - Server-side scripting language
- **MySQL 8.0+** - Relational database system
- **Apache/Nginx** - Web server
- **Git** - Version control system

### Development Tools (Recommended)
- **VS Code** - Code editor with TypeScript support
- **Postman** - API testing tool
- **phpMyAdmin** - MySQL administration tool

## 📦 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/gamcapp.git
cd gamcapp
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run build
```

### 3. Backend Setup

```bash
cd backend
composer install
```

### 4. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp backend/.env.example backend/.env
```

Edit the `backend/.env` file with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=gamcapp
DB_USER=gamcapp_user
DB_PASSWORD=your_password_here

# RazorPay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# JWT Secret for Authentication
JWT_SECRET=your_jwt_secret_key_here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ADMIN_EMAIL=admin@gamca-wafid.com

# SMS API Configuration (for OTP)
SMS_API_KEY=your_sms_api_key
SMS_API_URL=your_sms_api_url

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

### 5. Database Setup

#### Create Database

```sql
CREATE DATABASE gamcapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gamcapp_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON gamcapp.* TO 'gamcapp_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Initialize Database Schema

```bash
# Option 1: Use the automated initialization script
cd backend/database
./init.sql

# Option 2: Manual initialization
mysql -u root -p gamcapp < backend/database/schema.sql
mysql -u root -p gamcapp < backend/database/seed.sql
```

### 6. Web Server Configuration

Configure Apache or Nginx to serve both frontend and backend:

#### Apache Configuration
```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /path/to/gamcapp/frontend/dist
    
    # Frontend static files
    <Directory "/path/to/gamcapp/frontend/dist">
        AllowOverride All
        Require all granted
    </Directory>
    
    # API requests to PHP backend
    Alias /api /path/to/gamcapp/backend/public
    <Directory "/path/to/gamcapp/backend/public">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### 7. Start Development

For development, run both frontend and backend:

```bash
# Terminal 1 - Frontend development server
cd frontend
npm run dev

# Terminal 2 - PHP development server
cd backend/public
php -S localhost:8000
```

## 🔧 Development Commands

### Frontend Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build production-ready frontend |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint for code quality |
| `npm run type-check` | Run TypeScript type checking |

### Backend Commands
| Command | Description |
|---------|-------------|
| `composer install` | Install PHP dependencies |
| `composer update` | Update PHP dependencies |
| `php -S localhost:8000` | Start PHP development server |

## 🚀 Deployment

The application is configured for automatic deployment to Hostinger using GitHub Actions. Push to the main branch to trigger deployment:

```bash
git push origin main
```

The deployment workflow:
1. Builds the React frontend
2. Uploads files to Hostinger via FTP
3. Configures Apache settings
4. Updates environment variables

## 📚 API Documentation

### Authentication Flow

#### User Authentication (OTP-based)
1. User enters phone number
2. OTP generated and sent via SMS
3. User verifies OTP
4. JWT token issued for session management
5. Access to user dashboard and documents

#### Admin Authentication (Credential-based)
1. Admin enters username and password
2. Credentials verified against bcrypt hash
3. JWT token issued with admin privileges
4. Access to admin dashboard and user management

### Payment Integration

The application integrates with RazorPay for secure payment processing:

#### Payment Flow
1. User completes appointment form
2. Payment amount calculated based on appointment type
3. RazorPay order created with user details
4. Payment processed through RazorPay checkout
5. Payment signature verified on backend
6. User record created and email notifications sent

#### Supported Payment Methods
- **UPI** - All major UPI apps supported
- **Credit Cards** - Visa, MasterCard, American Express
- **Debit Cards** - All major Indian banks
- **Net Banking** - 50+ banks supported

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Bcrypt password hashing for admin accounts
- **Input Validation** - Server-side validation for all inputs
- **File Upload Security** - File type validation and secure storage
- **CORS Protection** - Cross-origin request protection
- **SQL Injection Prevention** - Prepared statements for database queries

## 🚨 Troubleshooting

### Common Issues

#### Frontend Build Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

#### Backend Issues
```bash
# Check PHP version
php --version

# Test database connection
php -r "new PDO('mysql:host=localhost;dbname=gamcapp', 'user', 'pass');"

# Check file permissions
chmod 755 backend/public
chmod 777 backend/uploads
```

#### Database Connection Issues
```bash
# Check MySQL service
sudo systemctl status mysql

# Test connection with user credentials
mysql -h localhost -u gamcapp_user -p gamcapp -e "SELECT NOW();"

# Reset database if needed
cd backend/database
./init.sql --help  # View initialization options
```

## 📈 Performance Optimization

- **Frontend**: Vite for fast builds, code splitting, lazy loading
- **Backend**: PHP OPcache, connection pooling, query optimization
- **Database**: Proper indexing, query optimization, connection pooling
- **Caching**: Static file caching, API response caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions, please contact:
- Email: support@gamca-wafid.com
- GitHub Issues: [Create an issue](https://github.com/your-username/gamcapp/issues)

---

Built with ❤️ for streamlined medical appointment booking