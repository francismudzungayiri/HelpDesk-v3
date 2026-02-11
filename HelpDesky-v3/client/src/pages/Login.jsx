import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadId = toast.loading('Signing in...');
    try {
      const response = await login(username, password);
      toast.success('Welcome back!', { id: loadId });
      
      if (response?.user?.role === 'END_USER') {
        navigate('/portal');
      } else {
        navigate('/');
      }
    } catch (err) {
      const messages = err.response?.data?.errors || [err.response?.data?.message || 'Invalid username or password'];
      toast.error(messages[0], { id: loadId });
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
      <div className="card" style={{ width: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>HelpDesky Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn" style={{ width: '100%' }}>Sign In</button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '20px', color: '#6b778c' }}>
          Don't have an account? <Link to="/register" style={{ color: '#667eea', textDecoration: 'none', fontWeight: '500' }}>Register</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
