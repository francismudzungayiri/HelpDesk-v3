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

// Protected Route Wrapper
const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>; // Simple loading state
  if (!user) return <Navigate to="/login" replace />;

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
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<TicketList />} />
            <Route path="/tickets/new" element={<CreateTicket />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
