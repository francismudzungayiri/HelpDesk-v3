import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const CreateTicket = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    caller_name: '',
    department: '',
    phone: '',
    priority: 'MEDIUM',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const loadId = toast.loading('Creating ticket...');

    try {
      await api.post('/tickets', formData);
      toast.success('Ticket created successfully', { id: loadId });
      navigate('/');
    } catch (err) {
      const messages = err.response?.data?.errors || [err.response?.data?.message || 'Failed to create ticket'];
      messages.forEach(msg => toast.error(msg, { id: loadId }));
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto' }}>
      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Create New Ticket</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Caller Name *</label>
            <input
              type="text"
              name="caller_name"
              value={formData.caller_name}
              onChange={handleChange}
              required
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div className="flex gap-2">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Department *</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                placeholder="e.g. Finance"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Priority *</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              required
            >
              <option value="LOW">Low - Not urgent</option>
              <option value="MEDIUM">Medium - Standard issue</option>
              <option value="HIGH">High - Critical/Blocker</option>
            </select>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="5"
              placeholder="Describe the issue..."
            />
          </div>

          <div className="flex justify-between items-center" style={{ marginTop: '20px' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => navigate('/')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn" 
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicket;
