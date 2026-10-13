import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { ServiceBand } from '../components/TicketMarks';
import LabelField from '../components/LabelField';

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
  const [people, setPeople] = useState([]);
  const [autoFilledFrom, setAutoFilledFrom] = useState(null);

  useEffect(() => {
    if (isEndUser) return;
    api.get('/users/end-users')
      .then((res) => setPeople(res.data))
      .catch(() => setPeople([]));
  }, [isEndUser]);

  // Picking a known person fills their department and phone; typing someone new leaves the fields to the agent.
  const handleCallerChange = (event) => {
    const value = event.target.value;
    const match = people.find((person) => person.name.toLowerCase() === value.trim().toLowerCase());
    setFormData((previous) => {
      const next = { ...previous, caller_name: value };
      if (match) {
        next.department = match.department || previous.department;
        next.phone = match.phone || previous.phone;
      } else if (autoFilledFrom) {
        next.department = '';
        next.phone = '';
      }
      return next;
    });
    setAutoFilledFrom(match ? match.name : null);
  };

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
          id={`cf-${field.id}`}
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
          id={`cf-${field.id}`}
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
          id={`cf-${field.id}`}
          type="date"
          value={value ?? ''}
          onChange={(event) => handleFieldChange(field, event.target.value)}
          required={field.required}
        />
      );
    }

    if (field.field_type === 'checkbox') {
      return (
        <label className="check-field">
          <input
            id={`cf-${field.id}`}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => handleFieldChange(field, event.target.checked)}
          />
          <span>{field.label}{field.placeholder ? ` (${field.placeholder})` : ''}</span>
        </label>
      );
    }

    return (
      <input
        id={`cf-${field.id}`}
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
    const loadId = toast.loading('Creating ticket…');

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
        category_id: Number(formData.category_id),
        subcategory_id: Number(formData.subcategory_id),
        custom_fields: customFields
      };

      const payload = isEndUser
        ? sharedPayload
        : {
            ...sharedPayload,
            priority: formData.priority,
            caller_name: formData.caller_name,
            department: formData.department,
            phone: formData.phone || undefined
          };

      const res = await api.post('/tickets', payload);
      toast.success(`Ticket #${res.data.id} created`, { id: loadId });
      navigate(isEndUser ? '/portal' : `/tickets/${res.data.id}`);
    } catch (err) {
      const messages = err.response?.data?.errors || [err.response?.data?.message || 'Failed to create ticket'];
      toast.error(messages.join(' '), { id: loadId });
    } finally {
      setSubmitting(false);
    }
  };

  const PRIORITIES = [
    { value: 'LOW', label: 'Low', hint: 'Annoying, but they can work' },
    { value: 'MEDIUM', label: 'Medium', hint: 'Slowing them down' },
    { value: 'HIGH', label: 'High', hint: "They can't work" }
  ];

  return (
    <div className="create-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Create ticket</h1>
          <p className="page-lede">For problems reported by phone, email or in person.</p>
        </div>
      </div>

      {loadingMeta ? (
        <div className="card" aria-live="polite">Loading categories…</div>
      ) : (
        <form className="card create-form" onSubmit={handleSubmit}>
          <fieldset className="create-section">
            <legend>Who's reporting it?</legend>
            <div className="label-grid label-grid-2">
              <LabelField
                id="ct-caller"
                label="Caller"
                span={2}
                hint={autoFilledFrom
                  ? `Department and phone filled in from ${autoFilledFrom}'s account.`
                  : 'Pick someone from the list to fill in their department and phone.'}
              >
                <input
                  id="ct-caller"
                  type="text"
                  name="caller_name"
                  list="ct-people"
                  autoComplete="off"
                  value={formData.caller_name}
                  onChange={handleCallerChange}
                  required
                  placeholder="Start typing a name"
                  aria-describedby="ct-caller-hint"
                />
                <datalist id="ct-people">
                  {people.map((person) => (
                    <option key={person.id} value={person.name}>{person.department || ''}</option>
                  ))}
                </datalist>
              </LabelField>
              <LabelField id="ct-department" label="Department">
                <input id="ct-department" type="text" name="department" value={formData.department} onChange={handleChange} required placeholder="e.g. Finance" />
              </LabelField>
              <LabelField id="ct-phone" label="Phone (optional)">
                <input id="ct-phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} />
              </LabelField>
            </div>
          </fieldset>

          <fieldset className="create-section">
            <legend>What's wrong?</legend>
            <div className="label-grid label-grid-2">
              <LabelField id="ct-description" label="Description" span={2}>
                <textarea
                  id="ct-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows="4"
                  placeholder="In the caller's words, plus anything you've already checked."
                />
              </LabelField>
              <LabelField id="ct-category" label="Category">
                <select id="ct-category" name="category_id" value={formData.category_id} onChange={handleChange} required>
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </LabelField>
              <LabelField id="ct-subcategory" label="Subcategory">
                <select
                  id="ct-subcategory"
                  name="subcategory_id"
                  value={formData.subcategory_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.category_id || loadingSubcategories}
                >
                  <option value="">{loadingSubcategories ? 'Loading…' : formData.category_id ? 'Choose a subcategory' : 'Choose a category first'}</option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                  ))}
                </select>
              </LabelField>
              {fieldDefinitions.map((field) => (
                field.field_type === 'checkbox' ? (
                  <div className="label-field" key={field.id}>{renderCustomField(field)}</div>
                ) : (
                  <LabelField key={field.id} id={`cf-${field.id}`} label={`${field.label}${field.required ? '' : ' (optional)'}`}>
                    {renderCustomField(field)}
                  </LabelField>
                )
              ))}
            </div>
            {loadingFields && <p className="field-hint" aria-live="polite">Loading extra fields…</p>}
          </fieldset>

          <fieldset className="create-section">
            <legend>Priority</legend>
            <div className="segmented-choice" role="radiogroup" aria-label="Priority">
              {PRIORITIES.map((option) => (
                <label key={option.value} className={formData.priority === option.value ? 'is-selected' : ''}>
                  <input
                    type="radio"
                    name="priority"
                    value={option.value}
                    checked={formData.priority === option.value}
                    onChange={handleChange}
                  />
                  <ServiceBand priority={option.value} />
                  <span className="segmented-hint">{option.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="create-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate('/')}>Cancel</button>
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create ticket'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateTicket;
