
A comprehensive medical appointment booking system for travel verification, designed as a clone of wafid.com functionality with enhanced features and streamlined user experience.

## 🏥 Project Overview

GAMCA Medical Services (gamca.in) is a full-stack web application that facilitates medical appointment booking for travel verification purposes. The platform provides a seamless experience for user
s to book appointments, make payments, and manage their medical verification documents, while offering administrators powerful tools for user management and appointment processing.

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
- **Next.js 14** - Full-stack React framework with App Router
- **TypeScript** - Type-safe development with strict mode enabled
- **Tailwind CSS** - Utility-first CSS framework with custom design system
- **Axios** - HTTP client for API communication

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Node.js** - JavaScript runtime environment
- **PostgreSQL** - Relational database with UUID primary keys
- **JWT** - JSON Web Tokens for authentication
- **Bcrypt** - Password hashing for admin accounts

### Payment & Communication
- **RazorPay** - Payment gateway for UPI and credit card processing
- **Nodemailer** - Email service with SMTP configuration
- **OTP Library** - One-time password generation and verification

### File Management & Security
- **Multer** - File upload middleware with security restrictions
- **Crypto** - Cryptographic functions for secure operations
- **CORS** - Cross-origin resource sharing configuration

## 🏗 Architecture Overview

### Application Flow

```
Landing Page → Appointment Booking → Payment → User Dashboard
     ↓              ↓                  ↓           ↓
Navigation    Form Validation    RazorPay      OTP Login
     ↓              ↓                  ↓           ↓
User Auth     Data Storage      Email Alert   Document Access
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

#### Notifications (`/api/notifications/`)
- `POST /api/notifications/email` - Send email notifications

#### External Integrations (`/api/external/`)
- `POST /api/external/wafid-booking` - Automate wafid.com appointment booking

### Database Schema

The application uses PostgreSQL with a comprehensive schema designed for scalability and data integrity:

#### Core Tables

**users**
- Primary user information and appointment details
- JSONB field for flexible appointment data storage
- Payment status tracking and file associations

**admins**
- Admin user credentials with bcrypt password hashing
- Role-based access control foundation

**otp_tokens**
- Temporary OTP storage with expiration timestamps
- Phone number verification system

**payment_transactions**
- Complete RazorPay transaction tracking
- Payment status and signature verification

**appointment_slips**
- File metadata and user associations
- Secure file path storage and access control

#### Database Views
- `user_details_view` - Comprehensive user data with payment and slip information
- `admin_dashboard_view` - Optimized data for admin dashboard queries

### Key Components

#### Frontend Components

**AppointmentForm.js**
- Main booking form with validation
- Dynamic field rendering based on appointment type
- Integration with payment flow

**AdminUserList.js**
- Paginated user management interface
- Search and filter functionality
- Bulk operations and status updates

**LoadingSpinner.js**
- Reusable loading states with multiple variants
- Consistent UX across the application

**ErrorBoundary.js**
- Comprehensive error handling and reporting
- Graceful fallback UI for error states

#### Backend Utilities

**lib/db.js**
- Database connection pooling and query execution
- Transaction management and error handling

**lib/auth.js**
- JWT token generation and verification
- OTP generation and validation logic

**lib/razorpay.js**
- Payment order creation and verification
- Dynamic pricing based on appointment types

**lib/email.js**
- Email template rendering and sending
- SMTP configuration and error handling

**lib/wafidIntegration.js**
- Automated form filling on wafid.com
- Appointment slip download automation

**lib/fileStorage.js**
- Secure file upload and storage
- File type validation and size restrictions

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

### Wafid.com Integration

Automated appointment booking system that:
- Pre-fills user data on wafid.com booking form
- Handles form submission and navigation
- Downloads appointment slips automatically
- Associates downloaded slips with user records

## 📁 Project Structure

```
gamcapp/
├── components/           # Reusable React components
│   ├── AppointmentForm.js
│   ├── AdminUserList.js
│   ├── LoadingSpinner.js
│   └── ErrorBoundary.js
├── lib/                 # Backend utilities and services
│   ├── auth.js         # Authentication logic
│   ├── db.js           # Database connection and queries
│   ├── email.js        # Email service configuration
│   ├── razorpay.js     # Payment gateway integration
│   ├── wafidIntegration.js # External API integration
│   ├── fileStorage.js  # File upload handling
│   ├── validation.js   # Input validation utilities
│   └── models/         # Database models
├── pages/              # Next.js pages and API routes
│   ├── api/           # API endpoints
│   │   ├── auth/      # Authentication endpoints
│   │   ├── payment/   # Payment processing
│   │   ├── admin/     # Admin operations
│   │   ├── appointments/ # Appointment management
│   │   ├── upload/    # File upload handling
│   │   ├── user/      # User operations
│   │   ├── notifications/ # Email notifications
│   │   └── external/  # External integrations
│   ├── admin/         # Admin dashboard pages
│   ├── user/          # User dashboard pages
│   ├── payment/       # Payment flow pages
│   ├── auth/          # Authentication pages
│   ├── index.tsx      # Landing page
│   ├── book-appointment.tsx # Main booking form
│   └── payment.tsx    # Payment processing page
├── scripts/           # Utility scripts
│   ├── create-admin.js # Admin user creation CLI
│   └── init-db.sql    # Database schema initialization
├── templates/         # Email templates
│   ├── admin-notification.html
│   ├── appointment-ready.html
│   └── payment-confirmation.html
├── types/             # TypeScript type definitions
├── styles/            # Global styles and Tailwind config
├── uploads/           # File upload directory
└── public/            # Static assets
```

## 🔧 Configuration Files

### next.config.js
Comprehensive Next.js configuration including:
- Security headers and CORS policies
- File upload size limits
- Image optimization settings
- Production build optimizations
- TypeScript and ESLint integration

### tailwind.config.js
Custom Tailwind CSS configuration with:
- Primary color palette
- Form styling plugins
- Responsive design utilities
- Custom component classes

### tsconfig.json
TypeScript configuration with:
- Strict type checking
- Path aliases for clean imports
- Next.js plugin integration
- Modern ES6+ target compilation

This comprehensive architecture ensures scalability, security, and maintainability while providing an excellent user experience for both customers and administrators.

## 🚀 Prerequisites

Before setting up the GAMCA Medical Services application, ensure you have the following installed:

### System Requirements
- **Node.js 18+** - JavaScript runtime environment
- **PostgreSQL 12+** - Relational database system
- **npm** or **yarn** - Package manager
- **Git** - Version control system

### Development Tools (Recommended)
- **VS Code** - Code editor with TypeScript support
- **Postman** - API testing tool
- **pgAdmin** - PostgreSQL administration tool

## 📦 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/gamcapp.git
cd gamcapp
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Using yarn:
```bash
yarn install
```

### 3. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/gamcapp

# RazorPay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id

# JWT Secret for Authentication
JWT_SECRET=your_jwt_secret_key_here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ADMIN_EMAIL=admin@gamca.in
FROM_EMAIL=noreply@gamca.in
FROM_NAME=GAMCA Medical Services

# SMS API Configuration (for OTP)
SMS_API_KEY=your_sms_api_key
SMS_API_URL=your_sms_api_url

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

#### Environment Variables Explained

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `RAZORPAY_KEY_ID` | RazorPay API key ID | ✅ |
| `RAZORPAY_KEY_SECRET` | RazorPay API secret key | ✅ |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public RazorPay key for frontend | ✅ |
| `JWT_SECRET` | Secret key for JWT token signing | ✅ |
| `SMTP_HOST` | Email server hostname | ✅ |
| `SMTP_PORT` | Email server port | ✅ |
| `SMTP_USER` | Email account username | ✅ |
| `SMTP_PASS` | Email account password/app password | ✅ |
| `ADMIN_EMAIL` | Admin notification email address | ✅ |
| `SMS_API_KEY` | SMS service API key for OTP | ✅ |
| `SMS_API_URL` | SMS service API endpoint | ✅ |
| `NEXTAUTH_URL` | Application base URL | ✅ |
| `UPLOAD_DIR` | Directory for file uploads | ❌ |
| `MAX_FILE_SIZE` | Maximum file upload size in bytes | ❌ |

### 4. Database Setup

#### Create Database

Connect to PostgreSQL and create the database:

```sql
CREATE DATABASE gamcapp;
CREATE USER gamcapp_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE gamcapp TO gamcapp_user;
```

#### Initialize Database Schema

Run the database initialization script:

```bash
psql -U gamcapp_user -d gamcapp -f scripts/init-db.sql
```

Or using the PostgreSQL command line:

```bash
# Connect to your database
psql postgresql://username:password@localhost:5432/gamcapp

# Run the initialization script
\i scripts/init-db.sql
```

#### Verify Database Setup

Check that all tables were created successfully:

```sql
\dt  -- List all tables
\d users  -- Describe users table structure
```

You should see the following tables:
- `users` - User information and appointment details
- `admins` - Admin user credentials
- `otp_tokens` - Temporary OTP storage
- `payment_transactions` - Payment transaction records
- `appointment_slips` - File upload metadata

### 5. Create Admin User

Use the CLI utility to create your first admin user:

```bash
node scripts/create-admin.js <username> <password>
```

Example:
```bash
node scripts/create-admin.js admin SecurePassword123!
```

The script will:
- Validate the username and password
- Hash the password using bcrypt
- Create the admin record in the database
- Provide confirmation of successful creation

### 6. Start Development Server

Run the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api

### 7. Verify Installation

#### Test Database Connection
Visit http://localhost:3000/api/health to verify database connectivity.

#### Test Admin Login
1. Navigate to http://localhost:3000/admin/login
2. Use the admin credentials you created
3. Verify access to the admin dashboard

#### Test User Flow
1. Visit http://localhost:3000
2. Click "Book Appointment"
3. Fill out the form (use test data)
4. Verify the payment page loads correctly

## 🔧 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production-ready application |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint for code quality checks |
| `npm run type-check` | Run TypeScript type checking |

## 🗄️ Database Management

### Backup Database
```bash
pg_dump -U gamcapp_user gamcapp > backup.sql
```

### Restore Database
```bash
psql -U gamcapp_user -d gamcapp < backup.sql
```

### Reset Database
```bash
# Drop and recreate database
dropdb -U postgres gamcapp
createdb -U postgres gamcapp
psql -U gamcapp_user -d gamcapp -f scripts/init-db.sql
```

## 🔐 Security Setup

### Generate Secure JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Email App Password Setup
For Gmail SMTP:
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use the app password in `SMTP_PASS`

### RazorPay Configuration
1. Create a RazorPay account
2. Generate API keys from the dashboard
3. Configure webhook endpoints for payment verification
4. Set up test/live mode as needed

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL service status
sudo systemctl status postgresql

# Restart PostgreSQL service
sudo systemctl restart postgresql

# Verify connection string in .env file
```

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### File Upload Permissions
```bash
# Ensure uploads directory exists and has proper permissions
mkdir -p uploads
chmod 755 uploads
```

#### Email Sending Failed
- Verify SMTP credentials
- Check firewall settings for SMTP ports
- Ensure app-specific password for Gmail
- Test email configuration with a simple script

### Development Tips

1. **Hot Reload Issues**: Clear `.next` cache if changes aren't reflecting
2. **TypeScript Errors**: Run `npm run type-check` to identify type issues
3. **Database Changes**: Always backup before running schema modifications
4. **Environment Variables**: Restart the development server after changing `.env`

This setup guide ensures a smooth installation process and provides troubleshooting resources for common development issues.

## 📚 Detailed API Documentation

### Authentication Endpoints (`/api/auth/`)

#### `POST /api/auth/admin-login`
Authenticates admin users with username and password.

**Request Body:**
```json
{
  "username": "admin",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "admin": {
    "id": "uuid",
    "username": "admin",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### `POST /api/auth/send-otp`
Sends OTP to user's phone number for authentication.

**Request Body:**
```json
{
  "phone": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expires_in": 600
}
```

#### `POST /api/auth/verify-otp`
Verifies OTP and authenticates user.

**Request Body:**
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "phone": "+919876543210",
    "name": "John Doe"
  }
}
```

### Payment Endpoints (`/api/payment/`)

#### `POST /api/payment/create-order`
Creates a RazorPay payment order for appointment booking.

**Request Body:**
```json
{
  "user_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "passport_number": "A1234567",
    "appointment_details": {
      "appointment_type": "employment_visa",
      "preferred_date": "2024-02-15",
      "medical_center": "gamca_mumbai"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_razorpay_id",
    "amount": 350000,
    "currency": "INR",
    "receipt": "receipt_id"
  },
  "key": "razorpay_key_id"
}
```

#### `POST /api/payment/verify`
Verifies payment signature and creates user record.

**Request Body:**
```json
{
  "razorpay_order_id": "order_id",
  "razorpay_payment_id": "payment_id",
  "razorpay_signature": "signature_hash",
  "user_data": { /* user information */ }
}
```

### Admin Endpoints (`/api/admin/`)

#### `GET /api/admin/users`
Fetches paginated list of users with filters.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search term for name/email/phone
- `payment_status` - Filter by payment status
- `date_from` - Filter appointments from date
- `date_to` - Filter appointments to date

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543210",
      "payment_status": "completed",
      "appointment_details": { /* appointment data */ },
      "has_appointment_slip": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_users": 100,
    "has_next": true,
    "has_prev": false
  }
}
```

#### `POST /api/admin/upload-slip`
Uploads appointment slip for a specific user.

**Request:** Multipart form data
- `user_id` - UUID of the user
- `file` - Appointment slip file (PDF/Image)

**Response:**
```json
{
  "success": true,
  "message": "Appointment slip uploaded successfully",
  "file_info": {
    "filename": "appointment_slip_uuid.pdf",
    "size": 1024000,
    "upload_date": "2024-01-01T00:00:00Z"
  }
}
```

### User Endpoints (`/api/user/`)

#### `GET /api/user/profile`
Fetches authenticated user's profile and appointment details.

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "appointment_details": { /* appointment data */ },
    "payment_status": "completed",
    "appointment_slip": {
      "filename": "slip.pdf",
      "uploaded_at": "2024-01-01T00:00:00Z",
      "download_url": "/api/user/download-slip"
    }
  }
}
```
### External Integration Endpoints (`/api/external/`)

#### `POST /api/external/wafid-booking`
Automates appointment booking on wafid.com with user data.

**Request Body:**
```json
{
  "user_id": "uuid",
  "appointment_data": {
    "name": "John Doe",
    "passport_number": "A1234567",
    "appointment_type": "employment_visa",
    "preferred_date": "2024-02-15"
  }
}
```

## 🗃️ Complete Database Schema

### Core Tables Structure

#### `users` Table
Primary table storing user information and appointment details.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    passport_number VARCHAR(50) NOT NULL,
    appointment_details JSONB NOT NULL DEFAULT '{}',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_id VARCHAR(255),
    appointment_slip_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Key Fields:**
- `appointment_details` - JSONB field storing flexible appointment data
- `payment_status` - Enum field with payment state validation
- `appointment_slip_path` - File path for uploaded appointment slips

#### `admins` Table
Stores admin user credentials with secure password hashing.

```sql
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `otp_tokens` Table
Temporary storage for OTP verification with automatic expiration.

```sql
CREATE TABLE otp_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE
);
```

**Features:**
- Automatic cleanup of expired tokens
- Prevention of OTP reuse with `used` flag
- Phone number indexing for fast lookups

#### `payment_transactions` Table
Complete RazorPay transaction tracking and audit trail.

```sql
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    razorpay_order_id VARCHAR(255) NOT NULL,
    razorpay_payment_id VARCHAR(255),
    razorpay_signature VARCHAR(255),
    amount INTEGER NOT NULL, -- Amount in paise
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'created' 
        CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `appointment_slips` Table
File metadata and user associations for appointment slips.

```sql
CREATE TABLE appointment_slips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by_admin BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Database Relationships

```
users (1) ←→ (many) payment_transactions
users (1) ←→ (many) appointment_slips
users (1) ←→ (many) otp_tokens (via phone)
```

### Optimized Database Views

#### `user_details_view`
Comprehensive user data with payment and slip information for efficient queries.

```sql
CREATE VIEW user_details_view AS
SELECT 
    u.id, u.name, u.email, u.phone, u.passport_number,
    u.appointment_details, u.payment_status, u.created_at,
    pt.amount, pt.razorpay_payment_id,
    pt.status as payment_transaction_status,
    as_table.file_name as appointment_slip_filename,
    as_table.file_path as appointment_slip_path,
    as_table.uploaded_at as slip_uploaded_at
FROM users u
LEFT JOIN payment_transactions pt ON u.id = pt.user_id AND pt.status = 'paid'
LEFT JOIN appointment_slips as_table ON u.id = as_table.user_id;
```

#### `admin_dashboard_view`
Optimized data structure for admin dashboard with aggregated information.

```sql
CREATE VIEW admin_dashboard_view AS
SELECT 
    u.id, u.name, u.email, u.phone, u.passport_number,
    u.appointment_details, u.payment_status, u.created_at,
    pt.amount, pt.razorpay_payment_id,
    pt.status as payment_transaction_status,
    CASE WHEN as_table.id IS NOT NULL THEN TRUE ELSE FALSE END as has_appointment_slip,
    as_table.file_name as appointment_slip_filename,
    as_table.uploaded_at as slip_uploaded_at
FROM users u
LEFT JOIN payment_transactions pt ON u.id = pt.user_id
LEFT JOIN appointment_slips as_table ON u.id = as_table.user_id
ORDER BY u.created_at DESC;
```

## 🧩 Component Architecture

### Frontend Components

#### `AppointmentForm.js`
**Purpose:** Main appointment booking form with comprehensive validation and user experience features.

**Key Features:**
- Dynamic form fields based on appointment type
- Real-time validation with error messaging
- Integration with payment flow
- Mobile-responsive design
- Accessibility compliance (ARIA labels, keyboard navigation)

**Props:**
```javascript
{
  onSubmit: (formData) => void,
  userPhone?: string,
  initialData?: AppointmentFormData,
  isLoading?: boolean
}
```

**State Management:**
- Form data with controlled inputs
- Validation errors with field-specific messaging
- Loading states for async operations
- Dynamic field visibility based on selections

#### `AdminUserList.js`
**Purpose:** Comprehensive admin dashboard for user management with advanced filtering and bulk operations.

**Key Features:**
- Paginated user list with server-side filtering
- Search functionality across multiple fields
- Bulk operations (export, status updates)
- Real-time status updates
- Appointment slip management integration

**Props:**
```javascript
{
  users: User[],
  pagination: PaginationInfo,
  onPageChange: (page: number) => void,
  onSearch: (query: string) => void,
  onFilter: (filters: FilterOptions) => void,
  onUserAction: (userId: string, action: string) => void
}
```

**Features:**
- Advanced filtering (date range, payment status, appointment type)
- Export functionality (CSV, PDF)
- Inline editing for user details
- Wafid.com integration buttons
- File upload for appointment slips

#### `LoadingSpinner.js`
**Purpose:** Reusable loading component with multiple variants for consistent UX.

**Variants:**
- **Page Loader:** Full-screen loading with logo and progress indication
- **Button Loader:** Inline loading for form submissions
- **Component Loader:** Section-specific loading states
- **Skeleton Loader:** Content placeholder during data fetching

**Props:**
```javascript
{
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl',
  color: 'primary' | 'white' | 'gray' | 'red' | 'green' | 'blue',
  className?: string,
  text?: string,
  showLogo?: boolean
}
```

#### `ErrorBoundary.js`
**Purpose:** Comprehensive error handling and reporting system with graceful fallbacks.

**Features:**
- Automatic error capture and logging
- User-friendly error messages
- Error reporting to monitoring services
- Retry mechanisms for recoverable errors
- Development vs production error displays

**Error Types Handled:**
- JavaScript runtime errors
- React component errors
- API request failures
- File upload errors
- Payment processing errors

### Backend Utilities

#### `lib/auth.js`
**Purpose:** Authentication and authorization utilities with JWT and OTP management.

**Key Functions:**
```javascript
// JWT token management
generateToken(payload, expiresIn)
verifyToken(token)
refreshToken(token)

// OTP operations
generateOTP(phone)
verifyOTP(phone, otp)
cleanupExpiredOTPs()

// Password utilities
hashPassword(password)
comparePassword(password, hash)
```

#### `lib/razorpay.js`
**Purpose:** Payment gateway integration with comprehensive transaction management.

**Key Functions:**
```javascript
// Order management
createOrder(orderData)
getOrder(orderId)
updateOrderStatus(orderId, status)

// Payment verification
verifyPaymentSignature(paymentData)
handlePaymentWebhook(webhookData)

// Amount calculations
getPaymentAmount(appointmentType)
calculateTaxes(amount)
```

**Payment Flow Integration:**
1. Order creation with user data
2. Payment processing through RazorPay
3. Signature verification for security
4. Database updates and email notifications
5. Error handling and retry mechanisms

#### `lib/wafidIntegration.js`
**Purpose:** Automated appointment booking on wafid.com with intelligent form handling.

**Key Features:**
- Automated browser session management
- Form field detection and filling
- CAPTCHA handling (when possible)
- Error recovery and retry logic
- Appointment slip download automation

**Integration Flow:**
1. User data preparation and validation
2. Wafid.com session initialization
3. Form navigation and field population
4. Submission handling and confirmation
5. Appointment slip download and storage
6. User notification and database updates

#### `lib/email.js`
**Purpose:** Email service with template rendering and delivery management.

**Email Templates:**
- **Payment Confirmation:** Sent to users after successful payment
- **Admin Notification:** Sent to admin when new user registers
- **Appointment Ready:** Sent when appointment slip is uploaded
- **OTP Delivery:** Sent for phone number verification

**Features:**
- HTML template rendering with dynamic data
- Attachment support for appointment slips
- Delivery status tracking
- Retry mechanisms for failed deliveries
- Email queue management for high volume

This detailed architecture documentation provides developers with comprehensive understanding of the system's components, their interactions, and implementation details for effective development an
d maintenance.

## 🔄 Application Workflows

### User Journey Flow

```
Landing Page (/) 
    ↓
Book Appointment (/book-appointment)
    ↓
Payment Processing (/payment)
    ↓
Payment Success (/payment/success)
    ↓
OTP Login (/auth/login)
    ↓
User Dashboard (/user/dashboard)
    ↓
Document Download & Management
```

#### Detailed User Workflow

1. **Landing Page Access**
   - User visits gamca.in
   - Views service information and pricing
   - Clicks "Book Appointment" to start process

2. **Appointment Booking**
   - Fills appointment form with personal details
   - Selects appointment type (employment, family, visit, student, business visa)
   - Chooses preferred medical center and date
   - Provides passport number and contact information

3. **Payment Processing**
   - Redirected to payment page with order summary
   - Chooses payment method (UPI, Credit Card, Debit Card, Net Banking)
   - Completes payment through RazorPay gateway
   - Receives payment confirmation

4. **Account Creation & Access**
   - User record automatically created after successful payment
   - Admin receives email notification with user details
   - User can access account using OTP verification on phone number

5. **Dashboard Access**
   - User logs in with phone number + OTP
   - Views appointment details and payment status
   - Downloads appointment slip (when available)
   - Tracks appointment status updates

### Admin Workflow

```
Admin Login (/admin/login)
    ↓
Admin Dashboard (/admin/dashboard)
    ↓
User Management & Wafid Integration
    ↓
Appointment Slip Upload & Management
    ↓
Email Notifications & Reporting
```

#### Detailed Admin Workflow

1. **Admin Authentication**
   - Admin logs in with username/password credentials
   - JWT token issued for session management
   - Access to admin dashboard and user management tools

2. **User Management**
   - View paginated list of all registered users
   - Search and filter users by various criteria
   - View payment status and appointment details
   - Export user data for reporting

3. **Wafid.com Integration**
   - Click "Book on Wafid" button for any user
   - System automatically opens wafid.com with pre-filled user data
   - Admin completes booking process on wafid.com
   - Downloads appointment slip from wafid.com

4. **Document Management**
   - Upload appointment slips for users
   - Associate slips with specific user accounts
   - Manage file storage and access permissions
   - Send notifications to users when slips are ready

5. **System Administration**
   - Monitor payment transactions and status
   - Handle user support requests
   - Generate reports and analytics
   - Manage system configuration and settings

### Payment Processing Flow

```
Order Creation → RazorPay Checkout → Payment Verification → User Creation → Email Notifications
```

#### Payment Integration Details

1. **Order Creation**
   - Calculate amount based on appointment type
   - Create RazorPay order with user details
   - Generate secure order ID and receipt

2. **Payment Processing**
   - User redirected to RazorPay checkout
   - Multiple payment options available:
     - **UPI**: PhonePe, Google Pay, Paytm, BHIM
     - **Cards**: Visa, MasterCard, American Express, RuPay
     - **Net Banking**: 50+ supported banks
     - **Wallets**: Paytm, Mobikwik, Freecharge

3. **Payment Verification**
   - RazorPay signature verification for security
   - Payment status updated in database
   - Transaction record created for audit trail

4. **Post-Payment Actions**
   - User account created with appointment details
   - Email sent to admin with user information
   - Payment confirmation email sent to user
   - User can now access dashboard with OTP

### Authentication Flows

#### User Authentication (OTP-based)
```
Phone Number Entry → OTP Generation → SMS Delivery → OTP Verification → JWT Token → Dashboard Access
```

**Security Features:**
- OTP expires after 10 minutes
- Rate limiting to prevent spam
- Phone number validation and formatting
- Secure token generation and storage

#### Admin Authentication (Credential-based)
```
Username/Password → Bcrypt Verification → JWT Token → Admin Dashboard Access
```

**Security Features:**
- Password hashing with bcrypt (12 rounds)
- JWT token with expiration
- Session management and logout
- Role-based access control

### File Upload System

#### Appointment Slip Upload Process
```
File Selection → Validation → Secure Upload → Database Record → User Notification
```

**Upload Features:**
- **File Types**: PDF, JPG, PNG, JPEG
- **Size Limit**: 10MB maximum
- **Security**: File type validation, virus scanning
- **Storage**: Local file system with secure paths
- **Access Control**: User-specific file access

**Upload Workflow:**
1. Admin selects user from dashboard
2. Clicks "Upload Slip" button
3. Selects appointment slip file
4. File validated and uploaded securely
5. Database record created linking file to user
6. User receives email notification
7. User can download slip from dashboard

### Email Notification System

#### Automated Email Triggers

1. **Payment Confirmation** (to User)
   - Sent immediately after successful payment
   - Contains appointment details and next steps
   - Includes payment receipt and transaction ID

2. **Admin Notification** (to Admin)
   - Sent when new user completes payment
   - Contains user details and appointment information
   - Enables quick processing and follow-up

3. **Appointment Ready** (to User)
   - Sent when appointment slip is uploaded
   - Contains download link and instructions
   - Includes appointment date and center details

4. **OTP Delivery** (to User)
   - Sent during login process
   - Contains 6-digit verification code
   - Expires after 10 minutes for security

#### Email Template Features
- **Responsive Design**: Mobile-friendly HTML templates
- **Branding**: Consistent GAMCA branding and styling
- **Dynamic Content**: Personalized with user data
- **Attachments**: Support for appointment slip attachments
- **Tracking**: Delivery status and open tracking

This comprehensive workflow documentation ensures all stakeholders understand the complete user journey, admin processes, and system integrations for effective operation and support of the GAMCA Medical Services platform.

## 🚀 Deployment & Production Setup

### Production Environment Configuration

#### Environment Variables for Production

Create a production `.env` file with the following configurations:

```env
# Production Database Configuration
DATABASE_URL=postgresql://gamcapp_user:secure_password@production-db-host:5432/gamcapp
NODE_ENV=production

# RazorPay Production Configuration
RAZORPAY_KEY_ID=rzp_live_your_production_key_id
RAZORPAY_KEY_SECRET=your_production_key_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_your_production_key_id

# Production JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_64_chars_minimum
NEXTAUTH_SECRET=your_nextauth_production_secret

# Production Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=production@gamca.in
SMTP_PASS=your_production_app_password
ADMIN_EMAIL=admin@gamca.in
FROM_EMAIL=noreply@gamca.in
FROM_NAME=GAMCA Medical Services

# Production SMS Configuration
SMS_API_KEY=your_production_sms_api_key
SMS_API_URL=your_production_sms_api_url

# Production Application Configuration
NEXTAUTH_URL=https://gamca.in
UPLOAD_DIR=/var/www/gamcapp/uploads
MAX_FILE_SIZE=10485760

# Production Security Headers
CORS_ORIGIN=https://gamca.in
ALLOWED_ORIGINS=https://gamca.in,https://www.gamca.in
```

#### Build and Deployment Commands

```bash
# Install production dependencies
npm ci --only=production

# Build the application
npm run build

# Start production server
npm start

# Or using PM2 for process management
pm2 start npm --name "gamcapp" -- start
```

### Database Optimization Settings

#### PostgreSQL Production Configuration

Add the following to your PostgreSQL configuration (`postgresql.conf`):

```sql
# Connection Settings
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Write Ahead Logging
wal_buffers = 16MB
checkpoint_completion_target = 0.9
wal_writer_delay = 200ms

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

#### Database Indexes for Performance

```sql
-- Optimize user queries
CREATE INDEX CONCURRENTLY idx_users_phone ON users(phone);
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_payment_status ON users(payment_status);
CREATE INDEX CONCURRENTLY idx_users_created_at ON users(created_at DESC);

-- Optimize OTP queries
CREATE INDEX CONCURRENTLY idx_otp_tokens_phone_expires ON otp_tokens(phone, expires_at);
CREATE INDEX CONCURRENTLY idx_otp_tokens_expires_at ON otp_tokens(expires_at);

-- Optimize payment queries
CREATE INDEX CONCURRENTLY idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX CONCURRENTLY idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX CONCURRENTLY idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- Optimize file queries
CREATE INDEX CONCURRENTLY idx_appointment_slips_user_id ON appointment_slips(user_id);
CREATE INDEX CONCURRENTLY idx_appointment_slips_uploaded_at ON appointment_slips(uploaded_at DESC);
```

#### Database Connection Pooling

```javascript
// lib/db.js - Production configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  min: 5,  // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
});
```

### Security Considerations

#### JWT Security Configuration

```javascript
// Enhanced JWT configuration for production
const jwtConfig = {
  secret: process.env.JWT_SECRET, // Minimum 64 characters
  expiresIn: '24h', // Token expiration
  issuer: 'gamca.in',
  audience: 'gamca-users',
  algorithm: 'HS256'
};

// Secure cookie configuration
const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};
```

#### CORS Configuration

```javascript
// next.config.js - Production CORS settings
const corsConfig = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://gamca.in', 'https://www.gamca.in']
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};
```

#### File Upload Security

```javascript
// Enhanced file upload security
const uploadConfig = {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Single file upload
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and image files are allowed.'), false);
    }
  },
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.env.UPLOAD_DIR || './uploads');
      // Ensure directory exists
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Generate secure filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
      cb(null, `${uniqueSuffix}-${sanitizedName}`);
    }
  })
};
```

#### Security Headers Configuration

```javascript
// next.config.js - Enhanced security headers
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-
src 'self' api.razorpay.com;"
  }
];
```

### Performance Optimization

#### Next.js Production Optimizations

```javascript
// next.config.js - Performance settings
const nextConfig = {
  // Enable compression
  compress: true,
  
  // Optimize images
  images: {
    domains: ['gamca.in', 'www.gamca.in'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false
  },
  
  // Enable SWC minification
  swcMinify: true,
  
  // Optimize bundle
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lodash', 'date-fns']
  },
  
  // Generate static pages where possible
  trailingSlash: false,
  
  // Standalone output for containerization
  output: 'standalone'
};
```

#### Database Query Optimization

```javascript
// Implement query optimization patterns
const optimizedQueries = {
  // Use prepared statements
  getUserByPhone: 'SELECT * FROM users WHERE phone = $1',
  
  // Limit results and use pagination
  getUsers: `
    SELECT u.*, pt.status as payment_status, as_table.file_name 
    FROM users u 
    LEFT JOIN payment_transactions pt ON u.id = pt.user_id 
    LEFT JOIN appointment_slips as_table ON u.id = as_table.user_id 
    ORDER BY u.created_at DESC 
    LIMIT $1 OFFSET $2
  `,
  
  // Use indexes effectively
  searchUsers: `
    SELECT * FROM users 
    WHERE phone ILIKE $1 OR email ILIKE $1 OR name ILIKE $1 
    ORDER BY created_at DESC 
    LIMIT 50
  `
};
```

#### Caching Strategy

```javascript
// Implement Redis caching for frequently accessed data
const cacheConfig = {
  // Cache user sessions
  userSessions: {
    ttl: 24 * 60 * 60, // 24 hours
    prefix: 'user_session:'
  },
  
  // Cache OTP tokens
  otpTokens: {
    ttl: 10 * 60, // 10 minutes
    prefix: 'otp:'
  },
  
  // Cache admin dashboard data
  adminDashboard: {
    ttl: 5 * 60, // 5 minutes
    prefix: 'admin_dashboard:'
  }
};
```

### Monitoring and Logging Setup

#### Application Logging Configuration

```javascript
// lib/logger.js - Production logging setup
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'gamcapp' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: '/var/log/gamcapp/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: '/var/log/gamcapp/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

#### Health Check Endpoint

```javascript
// pages/api/health.js - System health monitoring
export default async function handler(req, res) {
  const healthCheck = {
    timestamp: new Date().toISOString(),
    status: 'OK',
    services: {}
  };

  try {
    // Check database connection
    const dbResult = await pool.query('SELECT NOW()');
    healthCheck.services.database = {
      status: 'healthy',
      responseTime: Date.now() - startTime
    };

    // Check file system
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    await fs.access(uploadDir);
    healthCheck.services.fileSystem = { status: 'healthy' };

    // Check email service
    const emailHealthy = await testEmailConnection();
    healthCheck.services.email = { 
      status: emailHealthy ? 'healthy' : 'degraded' 
    };

    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.status = 'ERROR';
    healthCheck.error = error.message;
    res.status(503).json(healthCheck);
  }
}
```

#### Performance Monitoring

```javascript
// Implement performance monitoring
const performanceMonitoring = {
  // Track API response times
  trackApiPerformance: (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('API Performance', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    });
    
    next();
  },
  
  // Track database query performance
  trackDbPerformance: async (query, params) => {
    const start = Date.now();
    try {
      const result = await pool.query(query, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) { // Log slow queries
        logger.warn('Slow Query Detected', {
          query: query.substring(0, 100),
          duration: `${duration}ms`
        });
      }
      
      return result;
    } catch (error) {
      logger.error('Database Query Error', {
        query: query.substring(0, 100),
        error: error.message
      });
      throw error;
    }
  }
};
```

### Deployment Strategies

#### Docker Containerization

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create uploads directory
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Docker Compose for Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://gamcapp_user:${DB_PASSWORD}@db:5432/gamcapp
    depends_on:
      - db
      - redis
    volumes:
      - uploads:/app/uploads
      - logs:/var/log/gamcapp
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=gamcapp
      - POSTGRES_USER=gamcapp_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  uploads:
  logs:
```

#### PM2 Process Management

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'gamcapp',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/gamcapp/pm2-error.log',
    out_file: '/var/log/gamcapp/pm2-out.log',
    log_file: '/var/log/gamcapp/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### Troubleshooting Common Production Issues

#### Database Connection Issues

```bash
# Check PostgreSQL service status
sudo systemctl status postgresql

# Check database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Monitor slow queries
sudo -u postgres psql -d gamcapp -c "
  SELECT query, mean_time, calls 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;
"

# Check database locks
sudo -u postgres psql -d gamcapp -c "
  SELECT blocked_locks.pid AS blocked_pid,
         blocked_activity.usename AS blocked_user,
         blocking_locks.pid AS blocking_pid,
         blocking_activity.usename AS blocking_user,
         blocked_activity.query AS blocked_statement,
         blocking_activity.query AS current_statement_in_blocking_process
  FROM pg_catalog.pg_locks blocked_locks
  JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
  JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
  WHERE NOT blocked_locks.granted;
"
```

#### Memory and Performance Issues

```bash
# Monitor application memory usage
ps aux | grep node

# Check system resources
htop
free -h
df -h

# Monitor application logs
tail -f /var/log/gamcapp/combined.log

# Check PM2 process status
pm2 status
pm2 monit

# Restart application if needed
pm2 restart gamcapp
```

#### SSL/TLS Certificate Issues

```bash
# Check certificate expiration
openssl x509 -in /path/to/certificate.crt -text -noout | grep "Not After"

# Test SSL configuration
openssl s_client -connect gamca.in:443 -servername gamca.in

# Renew Let's Encrypt certificate
certbot renew --dry-run
```

#### File Upload Issues

```bash
# Check upload directory permissions
ls -la /var/www/gamcapp/uploads/

# Fix permissions if needed
sudo chown -R www-data:www-data /var/www/gamcapp/uploads/
sudo chmod -R 755 /var/www/gamcapp/uploads/

# Check disk space
df -h /var/www/gamcapp/uploads/

# Monitor file upload logs
grep "upload" /var/log/gamcapp/combined.log
```

#### Email Delivery Issues

```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# Check email logs
grep "email" /var/log/gamcapp/combined.log

# Test email configuration
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
transporter.verify().then(console.log).catch(console.error);
"
```
### Backup and Recovery

#### Database Backup Strategy

```bash
#!/bin/bash
# backup-db.sh - Automated database backup script

BACKUP_DIR="/var/backups/gamcapp"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="gamcapp"
DB_USER="gamcapp_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/gamcapp_backup_$DATE.sql.gz

# Keep only last 30 days of backups
find $BACKUP_DIR -name "gamcapp_backup_*.sql.gz" -mtime +30 -delete

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/gamcapp_backup_$DATE.sql.gz s3://your-backup-bucket/
```

#### File Backup Strategy

```bash
#!/bin/bash
# backup-files.sh - Backup uploaded files

UPLOAD_DIR="/var/www/gamcapp/uploads"
BACKUP_DIR="/var/backups/gamcapp/files"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz -C $UPLOAD_DIR .

# Keep only last 7 days of file backups
find $BACKUP_DIR -name "uploads_backup_*.tar.gz" -mtime +7 -delete
```

This comprehensive deployment and production setup guide ensures reliable, secure, and performant operation of the GAMCA Medical Services application in production environments.
