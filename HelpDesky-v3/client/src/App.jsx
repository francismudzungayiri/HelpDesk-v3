import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
  
  if (loading) return <div>Loading...</div>; // Simple loading state
  if (!user) return <Navigate to="/login" replace />;

  // Role-based redirect for END_USERs
  if (user.role === 'END_USER' && window.location.pathname === '/') {
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

function App() {
  return (
    <Router>
      <AuthProvider>
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
