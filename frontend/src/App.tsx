import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Home } from '@/pages/Home'
import Login from '@/pages/Login'
import BookAppointment from '@/pages/BookAppointment'
import AppointmentFormPage from '@/pages/AppointmentForm'
import Payment from '@/pages/Payment'
import PaymentSuccess from '@/pages/PaymentSuccess'
import { UserDashboard } from '@/pages/UserDashboard'
import UserProfile from '@/pages/UserProfile'
import { AdminLogin } from '@/pages/AdminLogin'
import { AdminDashboard } from '@/pages/AdminDashboard'
import '@/styles/globals.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/book-appointment" element={<BookAppointment />} />
        <Route path="/appointment-form" element={<AppointmentFormPage />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/user/dashboard" element={<UserDashboard />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  )
}

export default App