import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import api from '../api';

const DESCRIPTION_LIMIT = 5000;

const IMPACT_OPTIONS = [
  { value: 'LOW', label: 'I can still work', hint: "It's annoying, but I can get on with things." },
  { value: 'MEDIUM', label: "It's slowing me down", hint: "I can work around it, but it's costing me time." },
  { value: 'HIGH', label: "I can't work", hint: "I'm stuck until this is fixed." }
];

const FieldError = ({ id, message }) => (message ? (
  <p className="field-error" id={id}>
    <FiAlertCircle size={14} aria-hidden="true" />
    {message}
  </p>
) : null);

const ReportProblem = () => {
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [impact, setImpact] = useState('');

  const [categories, setCategories] = useState([]);
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState({});
  const [fieldDefinitions, setFieldDefinitions] = useState([]);
  const [fieldValues, setFieldValues] = useState({});

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState('');
  const [loadingFields, setLoadingFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({ fields: {} });
  const [metaAttempt, setMetaAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    const loadMeta = async () => {
      setLoadingMeta(true);
      setMetaError('');
      try {
        const categoriesRes = await api.get('/ticket-meta/categories');
        const subcategoryResults = await Promise.all(
          categoriesRes.data.map((category) => api.get(`/ticket-meta/categories/${category.id}/subcategories`))
        );
        if (!active) return;

        const byCategory = {};
        categoriesRes.data.forEach((category, index) => {
          byCategory[category.id] = subcategoryResults[index].data;
        });
        setCategories(categoriesRes.data);
        setSubcategoriesByCategory(byCategory);
      } catch (err) {
        console.error('Failed to load ticket categories:', err);
        if (active) setMetaError("We couldn't load the list of problem types.");
      } finally {
        if (active) setLoadingMeta(false);
      }
    };

    loadMeta();
    return () => {
      active = false;
    };
  }, [metaAttempt]);

  const subcategories = categoryId ? subcategoriesByCategory[categoryId] || [] : [];

  useEffect(() => {
    let active = true;

    if (!categoryId || !subcategoryId) {
      setFieldDefinitions([]);
      setFieldValues({});
      return undefined;
    }

    const loadFields = async () => {
      setLoadingFields(true);
      try {
        const res = await api.get(`/ticket-meta/fields?category_id=${categoryId}&subcategory_id=${subcategoryId}`);
        if (!active) return;
        setFieldDefinitions(res.data);
        setFieldValues((previous) => {
          const next = {};
          res.data.forEach((field) => {
            next[field.id] = Object.prototype.hasOwnProperty.call(previous, field.id)
              ? previous[field.id]
              : (field.field_type === 'checkbox' ? false : '');
          });
          return next;
        });
      } catch (err) {
        console.error('Failed to load custom fields:', err);
        if (active) setFieldDefinitions([]);
      } finally {
        if (active) setLoadingFields(false);
      }
    };

    loadFields();
    return () => {
      active = false;
    };
  }, [categoryId, subcategoryId]);

  const clearError = (key) => {
    setErrors((previous) => (previous[key] ? { ...previous, [key]: undefined } : previous));
  };

  const chooseCategory = (nextCategoryId) => {
    setCategoryId(nextCategoryId);
    const options = subcategoriesByCategory[nextCategoryId] || [];
    setSubcategoryId(options.length === 1 ? String(options[0].id) : '');
    clearError('category');
    clearError('subcategory');
  };

  const chooseSubcategory = (nextSubcategoryId) => {
    setSubcategoryId(nextSubcategoryId);
    clearError('subcategory');
  };

  const setFieldValue = (field, value) => {
    setFieldValues((previous) => ({ ...previous, [field.id]: value }));
    setErrors((previous) => {
      if (!previous.fields[field.id]) return previous;
      const fields = { ...previous.fields };
      delete fields[field.id];
      return { ...previous, fields };
    });
  };

  const validate = () => {
    const next = { fields: {} };
    if (!description.trim()) next.description = 'Tell IT what is wrong. A sentence or two is enough.';
    if (!categoryId) next.category = 'Pick the closest match, or choose "Not sure".';
    else if (!subcategoryId) next.subcategory = 'Pick which one it is.';

    fieldDefinitions.forEach((field) => {
      const value = fieldValues[field.id];
      const empty = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
      if (field.required && field.field_type !== 'checkbox' && empty) {
        next.fields[field.id] = `Add the ${field.label.toLowerCase()}.`;
      }
    });

    return next;
  };

  const focusFirstError = (next) => {
    const order = [
      next.description && 'report-description',
      next.category && 'report-category',
      next.subcategory && 'report-subcategory',
      ...Object.keys(next.fields).map((id) => `report-field-${id}`)
    ].filter(Boolean);

    const target = order[0] && document.getElementById(order[0]);
    if (!target) return;
    const focusable = target.matches('input, textarea, select') ? target : target.querySelector('input, textarea, select');
    (focusable || target).focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const next = validate();
    const hasErrors = next.description || next.category || next.subcategory || Object.keys(next.fields).length > 0;
    setErrors(next);
    if (hasErrors) {
      focusFirstError(next);
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/tickets', {
        description: description.trim(),
        category_id: Number(categoryId),
        subcategory_id: Number(subcategoryId),
        priority: impact || 'MEDIUM',
        custom_fields: fieldDefinitions.map((field) => ({
          field_definition_id: field.id,
          value: field.field_type === 'checkbox' ? Boolean(fieldValues[field.id]) : fieldValues[field.id]
        }))
      });
      navigate('/portal', { state: { sentId: response.data.id } });
    } catch (err) {
      const messages = err.response?.data?.errors || [err.response?.data?.message || "Your report didn't send. Check your connection and try again."];
      setErrors((previous) => ({ ...previous, form: messages.join(' ') }));
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const id = `report-field-${field.id}`;
    const errorId = `${id}-error`;
    const value = fieldValues[field.id];
    const error = errors.fields[field.id];
    const shared = {
      id,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? errorId : undefined,
      'aria-required': field.required || undefined
    };

    if (field.field_type === 'checkbox') {
      return (
        <div className="report-field report-field-check" key={field.id}>
          <label htmlFor={id}>
            <input
              {...shared}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(event) => setFieldValue(field, event.target.checked)}
            />
            <span>{field.label}{field.placeholder ? ` (${field.placeholder})` : ''}</span>
          </label>
        </div>
      );
    }

    let control;
    if (field.field_type === 'select') {
      control = (
        <select {...shared} value={value ?? ''} onChange={(event) => setFieldValue(field, event.target.value)}>
          <option value="">Choose one</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    } else {
      const inputType = field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text';
      control = (
        <input
          {...shared}
          type={inputType}
          value={value ?? ''}
          placeholder={field.placeholder || ''}
          onChange={(event) => setFieldValue(field, event.target.value)}
        />
      );
    }

    return (
      <div className="report-field" key={field.id}>
        <label htmlFor={id}>
          {field.label}
          {!field.required && <span className="optional-tag">optional</span>}
        </label>
        {control}
        <FieldError id={errorId} message={error} />
      </div>
    );
  };

  const selectedCategory = categories.find((category) => String(category.id) === categoryId);

  return (
    <div className="portal-page report-page">
      <Link to="/portal" className="back-link">
        <FiArrowLeft size={16} aria-hidden="true" />
        Your tickets
      </Link>

      <h1>Report a problem</h1>
      <p className="report-lede">Describe it in your own words. IT will see exactly what you write.</p>

      {loadingMeta ? (
        <div className="report-loading" aria-live="polite">Getting the form ready…</div>
      ) : metaError ? (
        <div className="form-alert" role="alert">
          <FiAlertCircle size={18} aria-hidden="true" />
          <div>
            <p>{metaError}</p>
            <button type="button" className="btn-secondary" onClick={() => setMetaAttempt((n) => n + 1)}>Try again</button>
          </div>
        </div>
      ) : (
        <form className="report-form" onSubmit={handleSubmit} noValidate>
          <div className="report-step">
            <label htmlFor="report-description" className="report-step-label">What's wrong?</label>
            <textarea
              id="report-description"
              rows={5}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                clearError('description');
              }}
              placeholder="For example: The printer on the 2nd floor says 'paper jam', but there's no paper stuck."
              maxLength={DESCRIPTION_LIMIT}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? 'report-description-error' : undefined}
              aria-required="true"
            />
            {description.length > DESCRIPTION_LIMIT - 500 && (
              <p className="char-count" aria-live="polite">{DESCRIPTION_LIMIT - description.length} characters left</p>
            )}
            <FieldError id="report-description-error" message={errors.description} />
          </div>

          <fieldset
            className="report-step"
            id="report-category"
            aria-describedby={errors.category ? 'report-category-error' : undefined}
          >
            <legend className="report-step-label">What's it about?</legend>
            <div className="tile-grid">
              {categories.map((category) => {
                const subs = subcategoriesByCategory[category.id] || [];
                const hint = subs.length > 1 ? subs.map((sub) => sub.name).join(' · ') : category.description;
                const checked = String(category.id) === categoryId;
                return (
                  <label key={category.id} className={`tile${checked ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="category"
                      value={category.id}
                      checked={checked}
                      onChange={() => chooseCategory(String(category.id))}
                    />
                    <span className="tile-label">{category.name}</span>
                    {hint && <span className="tile-hint">{hint}</span>}
                  </label>
                );
              })}
            </div>
            <FieldError id="report-category-error" message={errors.category} />
          </fieldset>

          {selectedCategory && subcategories.length > 1 && (
            <fieldset
              className="report-step"
              id="report-subcategory"
              aria-describedby={errors.subcategory ? 'report-subcategory-error' : undefined}
            >
              <legend className="report-step-label">Which {selectedCategory.name.toLowerCase()} problem?</legend>
              <div className="chip-row">
                {subcategories.map((sub) => {
                  const checked = String(sub.id) === subcategoryId;
                  return (
                    <label key={sub.id} className={`chip${checked ? ' is-selected' : ''}`}>
                      <input
                        type="radio"
                        name="subcategory"
                        value={sub.id}
                        checked={checked}
                        onChange={() => chooseSubcategory(String(sub.id))}
                      />
                      <span>{sub.name}</span>
                    </label>
                  );
                })}
              </div>
              <FieldError id="report-subcategory-error" message={errors.subcategory} />
            </fieldset>
          )}

          {loadingFields && <p className="report-loading" aria-live="polite">Loading a few extra questions…</p>}

          {fieldDefinitions.length > 0 && (
            <div className="report-step">
              <p className="report-step-label">A few details help IT fix it faster</p>
              {fieldDefinitions.map(renderField)}
            </div>
          )}

          <fieldset className="report-step">
            <legend className="report-step-label">
              How much is this stopping you?
              <span className="optional-tag">optional</span>
            </legend>
            <div className="tile-grid tile-grid-3">
              {IMPACT_OPTIONS.map((option) => {
                const checked = impact === option.value;
                return (
                  <label key={option.value} className={`tile tile-impact impact-${option.value.toLowerCase()}${checked ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="impact"
                      value={option.value}
                      checked={checked}
                      onChange={() => setImpact(option.value)}
                    />
                    <span className="tile-label">{option.label}</span>
                    <span className="tile-hint">{option.hint}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {errors.form && (
            <div className="form-alert" role="alert">
              <FiAlertCircle size={18} aria-hidden="true" />
              <p>{errors.form}</p>
            </div>
          )}

          <div className="report-actions">
            <button type="submit" className="btn report-submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send to IT'}
            </button>
            <Link to="/portal" className="report-cancel">Cancel</Link>
          </div>
        </form>
      )}
    </div>
  );
};

export default ReportProblem;
