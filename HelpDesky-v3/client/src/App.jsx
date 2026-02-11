import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import NavBar from './components/NavBar';
import Login from './pages/Login';
import CreateTicket from './pages/CreateTicket';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import AdminDashboard from './pages/AdminDashboard';
import Reports from './pages/Reports';
import UserList from './pages/UserList';
import Register from './pages/Register';
import EndUserPortal from './pages/EndUserPortal';

// Protected Route Wrapper
const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '15px' }}>
        <div className="spinner"></div>
        <div style={{ color: '#6b778c', fontSize: '18px' }}>Loading HelpDesky...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role-based redirect for END_USERs who land on the admin root
  if (user.role === 'END_USER' && location.pathname === '/') {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div style={{ display: 'flex' }}>
      <NavBar />
      <div className="container" style={{ marginLeft: '240px', width: '100%', padding: '40px' }}>
        <Outlet />
      </div>
    </div>
  );
};


import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<TicketList />} />
            <Route path="/portal" element={<EndUserPortal />} />
            <Route path="/tickets/new" element={<CreateTicket />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
