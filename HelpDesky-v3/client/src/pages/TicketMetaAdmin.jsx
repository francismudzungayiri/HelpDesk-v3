import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { errorMessage } from '../utils/errors';

const FIELD_TYPE_LABELS = { text: 'Text', number: 'Number', date: 'Date', checkbox: 'Checkbox', select: 'Choice list' };

// "Drive Name" -> "drive_name"
const toFieldKey = (label) => label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 120);

const TicketMetaAdmin = () => {
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [subcategoryCategoryId, setSubcategoryCategoryId] = useState('');
  const [fieldCategoryId, setFieldCategoryId] = useState('');

  const [subcategoryList, setSubcategoryList] = useState([]);
  const [fieldSubcategories, setFieldSubcategories] = useState([]);
  const [fields, setFields] = useState([]);

  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);

  const [fieldViewSubcategoryId, setFieldViewSubcategoryId] = useState('');

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    sort_order: 0
  });

  const [subcategoryForm, setSubcategoryForm] = useState({
    name: '',
    description: '',
    sort_order: 0
  });

  const [fieldForm, setFieldForm] = useState({
    subcategory_id: '',
    field_key: '',
    label: '',
    field_type: 'text',
    required: false,
    placeholder: '',
    options_text: '',
    sort_order: 0
  });

  const [savingCategory, setSavingCategory] = useState(false);
  const [savingSubcategory, setSavingSubcategory] = useState(false);
  const [savingField, setSavingField] = useState(false);
  const [deletingFieldId, setDeletingFieldId] = useState(null);
  const [confirmField, setConfirmField] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [loadError, setLoadError] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);

  const setFormError = (form, message) => setFormErrors((prev) => ({ ...prev, [form]: message }));

  const selectedCategoryName = useMemo(() => {
    const category = categories.find((item) => String(item.id) === String(subcategoryCategoryId));
    return category?.name || '';
  }, [categories, subcategoryCategoryId]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/ticket-meta/categories');
      setCategories(res.data);

      if (res.data.length > 0) {
        const firstId = String(res.data[0].id);
        setSubcategoryCategoryId((prev) => prev || firstId);
        setFieldCategoryId((prev) => prev || firstId);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      setLoadError(errorMessage(err, "Couldn't load ticket categories. Try again."));
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadSubcategoriesForPanel = async (categoryId) => {
    if (!categoryId) {
      setSubcategoryList([]);
      return;
    }

    setLoadingSubcategories(true);
    try {
      const res = await api.get(`/ticket-meta/categories/${categoryId}/subcategories`);
      setSubcategoryList(res.data);
    } catch (err) {
      console.error('Failed to load subcategories:', err);
      toast.error('Failed to load subcategories');
    } finally {
      setLoadingSubcategories(false);
    }
  };

  const loadSubcategoriesForFields = async (categoryId) => {
    if (!categoryId) {
      setFieldSubcategories([]);
      return;
    }

    try {
      const res = await api.get(`/ticket-meta/categories/${categoryId}/subcategories`);
      setFieldSubcategories(res.data);
    } catch (err) {
      console.error('Failed to load field subcategories:', err);
      toast.error('Failed to load subcategories for fields');
    }
  };

  const loadFields = async (categoryId, subcategoryId) => {
    if (!categoryId) {
      setFields([]);
      return;
    }

    setLoadingFields(true);
    try {
      const query = subcategoryId
        ? `/ticket-meta/fields?category_id=${categoryId}&subcategory_id=${subcategoryId}`
        : `/ticket-meta/fields?category_id=${categoryId}`;

      const res = await api.get(query);
      setFields(res.data);
    } catch (err) {
      console.error('Failed to load fields:', err);
      toast.error('Failed to load custom fields');
    } finally {
      setLoadingFields(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadSubcategoriesForPanel(subcategoryCategoryId);
  }, [subcategoryCategoryId]);

  useEffect(() => {
    if (!fieldCategoryId) {
      setFieldSubcategories([]);
      setFieldViewSubcategoryId('');
      setFieldForm((prev) => ({ ...prev, subcategory_id: '' }));
      setFields([]);
      return;
    }

    loadSubcategoriesForFields(fieldCategoryId);
    setFieldViewSubcategoryId('');
    setFieldForm((prev) => ({ ...prev, subcategory_id: '' }));
    loadFields(fieldCategoryId, '');
  }, [fieldCategoryId]);

  useEffect(() => {
    if (!fieldCategoryId) return;
    loadFields(fieldCategoryId, fieldViewSubcategoryId);
  }, [fieldCategoryId, fieldViewSubcategoryId]);

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    setSavingCategory(true);
    setFormError('category', '');
    const toastId = toast.loading('Adding category…');

    try {
      await api.post('/ticket-meta/categories', {
        name: categoryForm.name,
        description: categoryForm.description || undefined,
        sort_order: Number(categoryForm.sort_order || 0)
      });

      toast.success(`${categoryForm.name} added`, { id: toastId });
      setCategoryForm({ name: '', description: '', sort_order: 0 });
      await loadCategories();
    } catch (err) {
      toast.dismiss(toastId);
      setFormError('category', errorMessage(err, "Couldn't add the category. Try again."));
    } finally {
      setSavingCategory(false);
    }
  };

  const handleCreateSubcategory = async (event) => {
    event.preventDefault();

    if (!subcategoryCategoryId) {
      setFormError('subcategory', 'Choose a category first.');
      return;
    }

    setSavingSubcategory(true);
    setFormError('subcategory', '');
    const toastId = toast.loading('Adding subcategory…');

    try {
      await api.post('/ticket-meta/subcategories', {
        category_id: Number(subcategoryCategoryId),
        name: subcategoryForm.name,
        description: subcategoryForm.description || undefined,
        sort_order: Number(subcategoryForm.sort_order || 0)
      });

      toast.success(`${subcategoryForm.name} added`, { id: toastId });
      setSubcategoryForm({ name: '', description: '', sort_order: 0 });
      await loadSubcategoriesForPanel(subcategoryCategoryId);
      if (String(fieldCategoryId) === String(subcategoryCategoryId)) {
        await loadSubcategoriesForFields(fieldCategoryId);
      }
    } catch (err) {
      toast.dismiss(toastId);
      setFormError('subcategory', errorMessage(err, "Couldn't add the subcategory. Try again."));
    } finally {
      setSavingSubcategory(false);
    }
  };

  const handleCreateField = async (event) => {
    event.preventDefault();

    if (!fieldCategoryId) {
      setFormError('field', 'Choose a category first.');
      return;
    }

    if (fieldForm.field_type === 'select' && !fieldForm.options_text.trim()) {
      setFormError('field', 'Add at least one option, separated by commas.');
      document.getElementById('field-options')?.focus();
      return;
    }

    if (!/^[a-z0-9_]{2,}$/.test(fieldForm.field_key.trim())) {
      setFormError('field', 'The field key needs at least 2 lowercase letters, numbers or underscores.');
      document.getElementById('field-key')?.focus();
      return;
    }

    setSavingField(true);
    setFormError('field', '');
    const toastId = toast.loading('Adding field…');

    try {
      const options = fieldForm.field_type === 'select'
        ? fieldForm.options_text.split(',').map((item) => item.trim()).filter(Boolean)
        : undefined;

      await api.post('/ticket-meta/fields', {
        category_id: Number(fieldCategoryId),
        subcategory_id: fieldForm.subcategory_id ? Number(fieldForm.subcategory_id) : undefined,
        field_key: fieldForm.field_key.trim(),
        label: fieldForm.label.trim(),
        field_type: fieldForm.field_type,
        required: fieldForm.required,
        placeholder: fieldForm.placeholder || undefined,
        options,
        sort_order: Number(fieldForm.sort_order || 0)
      });

      toast.success(`${fieldForm.label} added`, { id: toastId });
      setKeyTouched(false);
      setFieldForm((prev) => ({
        ...prev,
        field_key: '',
        label: '',
        placeholder: '',
        options_text: '',
        sort_order: 0,
        required: false
      }));
      await loadFields(fieldCategoryId, fieldViewSubcategoryId);
    } catch (err) {
      toast.dismiss(toastId);
      setFormError('field', errorMessage(err, "Couldn't add the field. Try again."));
    } finally {
      setSavingField(false);
    }
  };

  const handleDeleteField = async (field) => {
    setDeletingFieldId(field.id);
    const toastId = toast.loading('Removing field…');

    try {
      try {
        await api.delete(`/ticket-meta/fields/${field.id}`);
      } catch (deleteErr) {
        const status = deleteErr.response?.status;
        const message = String(deleteErr.response?.data?.message || '').toLowerCase();
        const shouldTryFallback = status === 404 || status === 405 || message.includes('route not found');

        if (!shouldTryFallback) {
          throw deleteErr;
        }

        await api.post(`/ticket-meta/fields/${field.id}/delete`);
      }

      toast.success(`${field.label} removed`, { id: toastId });
      setConfirmField(null);
      await loadFields(fieldCategoryId, fieldViewSubcategoryId);
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't remove the field. Try again."), { id: toastId });
    } finally {
      setDeletingFieldId(null);
    }
  };

  if (categoriesLoading) {
    return <div className="card" aria-live="polite">Loading ticket settings…</div>;
  }

  if (loadError && categories.length === 0) {
    return (
      <div className="card table-message" role="alert">
        <p>{loadError}</p>
        <button type="button" className="btn-secondary" onClick={() => { setLoadError(''); setCategoriesLoading(true); loadCategories(); }}>Try again</button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ticket settings</h1>
          <p className="page-lede">Categories, subcategories and the extra questions people answer when they report a problem.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 className="side-title">Categories</h2>

        <form onSubmit={handleCreateCategory} style={{ marginBottom: '20px' }}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cat-name">Name</label>
              <input
                id="cat-name"
                maxLength={100}
                value={categoryForm.name}
                onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="form-group form-field-compact">
              <label htmlFor="cat-sort">Sort order</label>
              <input
                id="cat-sort"
                type="number"
                value={categoryForm.sort_order}
                onChange={(event) => setCategoryForm((prev) => ({ ...prev, sort_order: event.target.value }))}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="cat-desc">Description <span className="optional-tag">optional</span></label>
            <input
              id="cat-desc"
              maxLength={400}
              value={categoryForm.description}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          {formErrors.category && <p className="form-error" role="alert">{formErrors.category}</p>}
          <button type="submit" className="btn" disabled={savingCategory}>{savingCategory ? 'Adding…' : 'Add category'}</button>
        </form>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Sort</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td style={{ fontWeight: 500 }}>{category.name}</td>
                  <td>{category.description || '-'}</td>
                  <td>{category.sort_order}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 className="side-title">Subcategories</h2>

        <div className="form-group" style={{ maxWidth: '320px' }}>
          <label htmlFor="sub-scope">Category</label>
          <select
            id="sub-scope"
            value={subcategoryCategoryId}
            onChange={(event) => setSubcategoryCategoryId(event.target.value)}
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleCreateSubcategory} style={{ marginBottom: '20px' }}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sub-name">Name</label>
              <input
                id="sub-name"
                maxLength={120}
                value={subcategoryForm.name}
                onChange={(event) => setSubcategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="form-group form-field-compact">
              <label htmlFor="sub-sort">Sort order</label>
              <input
                id="sub-sort"
                type="number"
                value={subcategoryForm.sort_order}
                onChange={(event) => setSubcategoryForm((prev) => ({ ...prev, sort_order: event.target.value }))}
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="sub-desc">Description <span className="optional-tag">optional</span></label>
            <input
              id="sub-desc"
              maxLength={400}
              value={subcategoryForm.description}
              onChange={(event) => setSubcategoryForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          {formErrors.subcategory && <p className="form-error" role="alert">{formErrors.subcategory}</p>}
          <button type="submit" className="btn" disabled={savingSubcategory || !subcategoryCategoryId}>
            {savingSubcategory ? 'Adding…' : 'Add subcategory'}
          </button>
        </form>

        <h4 style={{ marginBottom: '10px' }}>{selectedCategoryName ? `${selectedCategoryName} subcategories` : 'Subcategories'}</h4>
        {loadingSubcategories ? (
          <div>Loading subcategories...</div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Sort</th>
                </tr>
              </thead>
              <tbody>
                {subcategoryList.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ color: 'var(--text-secondary)' }}>No subcategories for this category yet.</td>
                  </tr>
                ) : (
                  subcategoryList.map((subcategory) => (
                    <tr key={subcategory.id}>
                      <td style={{ fontWeight: 500 }}>{subcategory.name}</td>
                      <td>{subcategory.description || '-'}</td>
                      <td>{subcategory.sort_order}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="side-title">Extra questions</h2>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="field-scope">Category</label>
            <select id="field-scope" value={fieldCategoryId} onChange={(event) => setFieldCategoryId(event.target.value)}>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="field-filter">Show fields for</label>
            <select
              id="field-filter"
              value={fieldViewSubcategoryId}
              onChange={(event) => setFieldViewSubcategoryId(event.target.value)}
              disabled={!fieldCategoryId}
            >
              <option value="">Every subcategory</option>
              {fieldSubcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleCreateField} style={{ marginBottom: '20px' }}>
          <div className="form-group" style={{ maxWidth: '360px' }}>
            <label htmlFor="field-applies">New field applies to</label>
            <select
              id="field-applies"
              value={fieldForm.subcategory_id}
              onChange={(event) => setFieldForm((prev) => ({ ...prev, subcategory_id: event.target.value }))}
              disabled={!fieldCategoryId}
            >
              <option value="">Every subcategory in this category</option>
              {fieldSubcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="field-label">Label</label>
              <input
                id="field-label"
                maxLength={120}
                value={fieldForm.label}
                onChange={(event) => {
                  const label = event.target.value;
                  setFieldForm((prev) => ({ ...prev, label, field_key: keyTouched ? prev.field_key : toFieldKey(label) }));
                }}
                placeholder="e.g. Asset Tag"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="field-key">Field key</label>
              <input
                id="field-key"
                maxLength={120}
                pattern="[a-z0-9_]+"
                aria-describedby="field-key-hint"
                value={fieldForm.field_key}
                onChange={(event) => { setKeyTouched(true); setFieldForm((prev) => ({ ...prev, field_key: event.target.value.toLowerCase() })); }}
                placeholder="e.g. asset_tag"
                required
              />
              <p className="field-hint" id="field-key-hint">Filled in from the label. Lowercase letters, numbers and underscores.</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="field-type">Field type</label>
              <select
                id="field-type"
                value={fieldForm.field_type}
                onChange={(event) => setFieldForm((prev) => ({ ...prev, field_type: event.target.value }))}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="checkbox">Checkbox</option>
                <option value="select">Choice list</option>
              </select>
            </div>
            <div className="form-group form-field-compact">
              <label htmlFor="field-sort">Sort order</label>
              <input
                id="field-sort"
                type="number"
                value={fieldForm.sort_order}
                onChange={(event) => setFieldForm((prev) => ({ ...prev, sort_order: event.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="field-placeholder">Placeholder <span className="optional-tag">optional</span></label>
            <input
              id="field-placeholder"
              maxLength={255}
              value={fieldForm.placeholder}
              onChange={(event) => setFieldForm((prev) => ({ ...prev, placeholder: event.target.value }))}
            />
          </div>

          {fieldForm.field_type === 'select' && (
            <div className="form-group">
              <label htmlFor="field-options">Options</label>
              <input
                id="field-options"
                aria-describedby="field-options-hint"
                value={fieldForm.options_text}
                onChange={(event) => setFieldForm((prev) => ({ ...prev, options_text: event.target.value }))}
                placeholder="Read, Write, Admin"
              />
              <p className="field-hint" id="field-options-hint">Separate choices with commas.</p>
            </div>
          )}

          <div className="form-group">
            <label className="check-field" htmlFor="field-required">
              <input
                id="field-required"
                type="checkbox"
                checked={fieldForm.required}
                onChange={(event) => setFieldForm((prev) => ({ ...prev, required: event.target.checked }))}
              />
              People must fill this in
            </label>
          </div>

          {formErrors.field && <p className="form-error" role="alert">{formErrors.field}</p>}
          <button type="submit" className="btn" disabled={savingField || !fieldCategoryId}>
            {savingField ? 'Adding…' : 'Add field'}
          </button>
        </form>

        <h3 className="label-caption" style={{ marginBottom: '8px' }}>Current fields</h3>
        {loadingFields ? (
          <div>Loading fields...</div>
        ) : (
          <div className="table-responsive table-wide">
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Key</th>
                  <th>Type</th>
                  <th>Scope</th>
                  <th>Required</th>
                  <th>Options</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fields.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ color: 'var(--text-secondary)' }}>No fields in this scope yet.</td>
                  </tr>
                ) : (
                  fields.map((field) => (
                    <tr key={field.id}>
                      <td style={{ fontWeight: 500 }}>{field.label}</td>
                      <td>{field.field_key}</td>
                      <td>{FIELD_TYPE_LABELS[field.field_type] || field.field_type}</td>
                      <td>{field.subcategory_name || 'All subcategories'}</td>
                      <td>{field.required ? 'Yes' : 'No'}</td>
                      <td>{field.field_type === 'select' ? (field.options || []).join(', ') || '-' : '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => setConfirmField(field)}
                          disabled={deletingFieldId === field.id}
                          aria-label={`Remove field ${field.label}`}
                        >
                          {deletingFieldId === field.id ? 'Removing…' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmField && (
        <Modal
          title={`Remove “${confirmField.label}”?`}
          description="New tickets won't ask for it any more. Answers already given on existing tickets are kept."
          onClose={() => setConfirmField(null)}
          busy={deletingFieldId === confirmField.id}
          size="sm"
        >
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setConfirmField(null)} disabled={deletingFieldId === confirmField.id}>Keep field</button>
            <button type="button" className="btn-danger" onClick={() => handleDeleteField(confirmField)} disabled={deletingFieldId === confirmField.id}>
              {deletingFieldId === confirmField.id ? 'Removing…' : 'Remove field'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TicketMetaAdmin;
