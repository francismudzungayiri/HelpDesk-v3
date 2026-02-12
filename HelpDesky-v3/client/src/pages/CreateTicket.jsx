import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const CreateTicket = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEndUser = user?.role === 'END_USER';

  const [formData, setFormData] = useState({
    caller_name: '',
    department: '',
    phone: '',
    priority: 'MEDIUM',
    description: '',
    category_id: '',
    subcategory_id: ''
  });

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [fieldDefinitions, setFieldDefinitions] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const res = await api.get('/ticket-meta/categories');
        if (active) setCategories(res.data);
      } catch (err) {
        console.error('Failed to load categories:', err);
        toast.error('Failed to load ticket categories');
      } finally {
        if (active) setLoadingMeta(false);
      }
    };

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!formData.category_id) {
      setSubcategories([]);
      setFieldDefinitions([]);
      setFieldValues({});
      return undefined;
    }

    const loadSubcategories = async () => {
      setLoadingSubcategories(true);
      try {
        const res = await api.get(`/ticket-meta/categories/${formData.category_id}/subcategories`);
        if (active) setSubcategories(res.data);
      } catch (err) {
        console.error('Failed to load subcategories:', err);
        toast.error('Failed to load subcategories');
      } finally {
        if (active) setLoadingSubcategories(false);
      }
    };

    loadSubcategories();

    return () => {
      active = false;
    };
  }, [formData.category_id]);

  useEffect(() => {
    let active = true;

    if (!formData.category_id || !formData.subcategory_id) {
      setFieldDefinitions([]);
      setFieldValues({});
      return undefined;
    }

    const loadFields = async () => {
      setLoadingFields(true);
      try {
        const res = await api.get(
          `/ticket-meta/fields?category_id=${formData.category_id}&subcategory_id=${formData.subcategory_id}`
        );

        if (!active) return;

        setFieldDefinitions(res.data);
        setFieldValues((previous) => {
          const next = {};
          res.data.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(previous, field.id)) {
              next[field.id] = previous[field.id];
            } else {
              next[field.id] = field.field_type === 'checkbox' ? false : '';
            }
          });
          return next;
        });
      } catch (err) {
        console.error('Failed to load custom fields:', err);
        toast.error('Failed to load custom fields');
      } finally {
        if (active) setLoadingFields(false);
      }
    };

    loadFields();

    return () => {
      active = false;
    };
  }, [formData.category_id, formData.subcategory_id]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === 'category_id') {
      setFormData((previous) => ({
        ...previous,
        category_id: value,
        subcategory_id: ''
      }));
      setSubcategories([]);
      setFieldDefinitions([]);
      setFieldValues({});
      return;
    }

    if (name === 'subcategory_id') {
      setFormData((previous) => ({
        ...previous,
        subcategory_id: value
      }));
      setFieldDefinitions([]);
      setFieldValues({});
      return;
    }

    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleFieldChange = (field, value) => {
    setFieldValues((previous) => ({
      ...previous,
      [field.id]: value
    }));
  };

  const renderCustomField = (field) => {
    const value = fieldValues[field.id];

    if (field.field_type === 'select') {
      return (
        <select
          value={value ?? ''}
          onChange={(event) => handleFieldChange(field, event.target.value)}
          required={field.required}
        >
          <option value="">Select an option</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (field.field_type === 'number') {
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(event) => handleFieldChange(field, event.target.value)}
          required={field.required}
          placeholder={field.placeholder || ''}
        />
      );
    }

    if (field.field_type === 'date') {
      return (
        <input
          type="date"
          value={value ?? ''}
          onChange={(event) => handleFieldChange(field, event.target.value)}
          required={field.required}
        />
      );
    }

    if (field.field_type === 'checkbox') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#172b4d' }}>
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => handleFieldChange(field, event.target.checked)}
            style={{ width: 'auto' }}
          />
          <span>{field.placeholder || 'Yes / No'}</span>
        </label>
      );
    }

    return (
      <input
        type="text"
        value={value ?? ''}
        onChange={(event) => handleFieldChange(field, event.target.value)}
        required={field.required}
        placeholder={field.placeholder || ''}
      />
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.category_id || !formData.subcategory_id) {
      toast.error('Please select a category and subcategory');
      return;
    }

    setSubmitting(true);
    const loadId = toast.loading('Creating ticket...');

    try {
      const customFields = fieldDefinitions.map((field) => {
        const rawValue = fieldValues[field.id];
        return {
          field_definition_id: field.id,
          value: field.field_type === 'checkbox' ? Boolean(rawValue) : rawValue
        };
      });

      const sharedPayload = {
        description: formData.description,
        priority: formData.priority,
        category_id: Number(formData.category_id),
        subcategory_id: Number(formData.subcategory_id),
        custom_fields: customFields
      };

      const payload = isEndUser
        ? {
            ...sharedPayload,
            phone: formData.phone || undefined
          }
        : {
            ...sharedPayload,
            caller_name: formData.caller_name,
            department: formData.department,
            phone: formData.phone || undefined
          };

      await api.post('/tickets', payload);
      toast.success('Ticket created successfully', { id: loadId });
      navigate(isEndUser ? '/portal' : '/');
    } catch (err) {
      const messages = err.response?.data?.errors || [err.response?.data?.message || 'Failed to create ticket'];
      messages.forEach((message) => toast.error(message, { id: loadId }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '760px', margin: '24px auto', width: '100%' }}>
      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>{isEndUser ? 'Submit a Support Ticket' : 'Create New Ticket'}</h2>

        {loadingMeta ? (
          <div>Loading ticket categories...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {!isEndUser && (
              <>
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

                <div className="form-row">
                  <div className="form-group">
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
                  <div className="form-group">
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
              </>
            )}

            {isEndUser && (
              <div className="form-group">
                <label>Phone Number (optional)</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Use this if we should call a different number"
                />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Subcategory *</label>
                <select
                  name="subcategory_id"
                  value={formData.subcategory_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.category_id || loadingSubcategories}
                >
                  <option value="">{loadingSubcategories ? 'Loading...' : 'Select subcategory'}</option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingFields && <div style={{ marginBottom: '12px', color: '#6b778c' }}>Loading custom fields...</div>}

            {fieldDefinitions.length > 0 && (
              <div className="card" style={{ marginBottom: '20px', background: '#f9fafb' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>Ticket Details</h3>
                {fieldDefinitions.map((field) => (
                  <div className="form-group" key={field.id}>
                    <label>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </label>
                    {renderCustomField(field)}
                  </div>
                ))}
              </div>
            )}

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

            <div className="form-row" style={{ marginTop: '20px', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(isEndUser ? '/portal' : '/')}
              >
                Cancel
              </button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateTicket;
