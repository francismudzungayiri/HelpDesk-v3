import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import NavBar from './components/NavBar';
import Login from './pages/Login';
import CreateTicket from './pages/CreateTicket';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import AdminDashboard from './pages/AdminDashboard';
import Reports from './pages/Reports';
import UserList from './pages/UserList';
import EndUserList from './pages/EndUserList';
import Register from './pages/Register';
import EndUserPortal from './pages/EndUserPortal';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <div style={{ color: '#6b778c', fontSize: '18px' }}>Loading HelpDesky...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'END_USER' && location.pathname === '/') {
    return <Navigate to="/portal" replace />;
  }

  return (
    <div style={{ display: 'flex' }}>
      <NavBar />
      <div className="app-shell-content container">
        <Outlet />
      </div>
    </div>
  );
};

const RoleRoute = ({ roles, children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={user.role === 'END_USER' ? '/portal' : '/'} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={(
                <RoleRoute roles={['ADMIN', 'AGENT']}>
                  <TicketList />
                </RoleRoute>
              )}
            />
            <Route
              path="/portal"
              element={(
                <RoleRoute roles={['END_USER']}>
                  <EndUserPortal />
                </RoleRoute>
              )}
            />
            <Route path="/tickets/new" element={<CreateTicket />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route
              path="/admin"
              element={(
                <RoleRoute roles={['ADMIN']}>
                  <AdminDashboard />
                </RoleRoute>
              )}
            />
            <Route
              path="/users"
              element={(
                <RoleRoute roles={['ADMIN']}>
                  <UserList />
                </RoleRoute>
              )}
            />
            <Route
              path="/end-users"
              element={(
                <RoleRoute roles={['ADMIN']}>
                  <EndUserList />
                </RoleRoute>
              )}
            />
            <Route
              path="/reports"
              element={(
                <RoleRoute roles={['ADMIN']}>
                  <Reports />
                </RoleRoute>
              )}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
