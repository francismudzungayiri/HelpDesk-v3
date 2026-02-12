import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

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
      toast.error('Failed to load categories');
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
    const toastId = toast.loading('Creating category...');

    try {
      await api.post('/ticket-meta/categories', {
        name: categoryForm.name,
        description: categoryForm.description || undefined,
        sort_order: Number(categoryForm.sort_order || 0)
      });

      toast.success('Category created', { id: toastId });
      setCategoryForm({ name: '', description: '', sort_order: 0 });
      await loadCategories();
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed to create category';
      toast.error(message, { id: toastId });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleCreateSubcategory = async (event) => {
    event.preventDefault();

    if (!subcategoryCategoryId) {
      toast.error('Select a category first');
      return;
    }

    setSavingSubcategory(true);
    const toastId = toast.loading('Creating subcategory...');

    try {
      await api.post('/ticket-meta/subcategories', {
        category_id: Number(subcategoryCategoryId),
        name: subcategoryForm.name,
        description: subcategoryForm.description || undefined,
        sort_order: Number(subcategoryForm.sort_order || 0)
      });

      toast.success('Subcategory created', { id: toastId });
      setSubcategoryForm({ name: '', description: '', sort_order: 0 });
      await loadSubcategoriesForPanel(subcategoryCategoryId);
      if (String(fieldCategoryId) === String(subcategoryCategoryId)) {
        await loadSubcategoriesForFields(fieldCategoryId);
      }
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed to create subcategory';
      toast.error(message, { id: toastId });
    } finally {
      setSavingSubcategory(false);
    }
  };

  const handleCreateField = async (event) => {
    event.preventDefault();

    if (!fieldCategoryId) {
      toast.error('Select a category first');
      return;
    }

    if (fieldForm.field_type === 'select' && !fieldForm.options_text.trim()) {
      toast.error('Select fields require options');
      return;
    }

    setSavingField(true);
    const toastId = toast.loading('Creating custom field...');

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

      toast.success('Custom field created', { id: toastId });
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
      const message = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Failed to create custom field';
      toast.error(message, { id: toastId });
    } finally {
      setSavingField(false);
    }
  };

  if (categoriesLoading) {
    return <div>Loading ticket settings...</div>;
  }

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Ticket Taxonomy & Custom Fields</h2>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Categories</h3>

        <form onSubmit={handleCreateCategory} style={{ marginBottom: '20px' }}>
          <div className="form-row">
            <div className="form-group">
              <label>Name *</label>
              <input
                value={categoryForm.name}
                onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="form-group form-field-compact">
              <label>Sort Order</label>
              <input
                type="number"
                value={categoryForm.sort_order}
                onChange={(event) => setCategoryForm((prev) => ({ ...prev, sort_order: event.target.value }))}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              value={categoryForm.description}
              onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <button type="submit" className="btn" disabled={savingCategory}>{savingCategory ? 'Saving...' : 'Add Category'}</button>
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
        <h3 style={{ marginTop: 0 }}>Subcategories</h3>

        <div className="form-group" style={{ maxWidth: '320px' }}>
          <label>Category Scope</label>
          <select
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
              <label>Name *</label>
              <input
                value={subcategoryForm.name}
                onChange={(event) => setSubcategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="form-group form-field-compact">
              <label>Sort Order</label>
              <input
                type="number"
                value={subcategoryForm.sort_order}
                onChange={(event) => setSubcategoryForm((prev) => ({ ...prev, sort_order: event.target.value }))}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              value={subcategoryForm.description}
              onChange={(event) => setSubcategoryForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <button type="submit" className="btn" disabled={savingSubcategory || !subcategoryCategoryId}>
            {savingSubcategory ? 'Saving...' : 'Add Subcategory'}
          </button>
        </form>

        <h4 style={{ marginBottom: '10px' }}>{selectedCategoryName ? `${selectedCategoryName} Subcategories` : 'Subcategories'}</h4>
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
                    <td colSpan="3" style={{ color: '#6b778c' }}>No subcategories for this category yet.</td>
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
        <h3 style={{ marginTop: 0 }}>Custom Fields</h3>

        <div className="form-row">
          <div className="form-group">
            <label>Category Scope</label>
            <select value={fieldCategoryId} onChange={(event) => setFieldCategoryId(event.target.value)}>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Filter List By Subcategory</label>
            <select
              value={fieldViewSubcategoryId}
              onChange={(event) => setFieldViewSubcategoryId(event.target.value)}
              disabled={!fieldCategoryId}
            >
              <option value="">All Scopes</option>
              {fieldSubcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleCreateField} style={{ marginBottom: '20px' }}>
          <div className="form-group" style={{ maxWidth: '360px' }}>
            <label>Apply Field To</label>
            <select
              value={fieldForm.subcategory_id}
              onChange={(event) => setFieldForm((prev) => ({ ...prev, subcategory_id: event.target.value }))}
              disabled={!fieldCategoryId}
            >
              <option value="">All Subcategories in Category</option>
              {fieldSubcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Field Key *</label>
              <input
                value={fieldForm.field_key}
                onChange={(event) => setFieldForm((prev) => ({ ...prev, field_key: event.target.value }))}
                placeholder="e.g. asset_tag"
                required
              />
            </div>
            <div className="form-group">
              <label>Label *</label>
              <input
                value={fieldForm.label}
                onChange={(event) => setFieldForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="e.g. Asset Tag"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Field Type *</label>
              <select
                value={fieldForm.field_type}
                onChange={(event) => setFieldForm((prev) => ({ ...prev, field_type: event.target.value }))}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="checkbox">Checkbox</option>
                <option value="select">Select</option>
              </select>
            </div>
            <div className="form-group form-field-compact">
              <label>Sort Order</label>
              <input
                type="number"
                value={fieldForm.sort_order}
                onChange={(event) => setFieldForm((prev) => ({ ...prev, sort_order: event.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Placeholder</label>
            <input
              value={fieldForm.placeholder}
              onChange={(event) => setFieldForm((prev) => ({ ...prev, placeholder: event.target.value }))}
            />
          </div>

          {fieldForm.field_type === 'select' && (
            <div className="form-group">
              <label>Select Options (comma-separated) *</label>
              <input
                value={fieldForm.options_text}
                onChange={(event) => setFieldForm((prev) => ({ ...prev, options_text: event.target.value }))}
                placeholder="Read, Write, Admin"
              />
            </div>
          )}

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#172b4d' }}>
              <input
                type="checkbox"
                checked={fieldForm.required}
                onChange={(event) => setFieldForm((prev) => ({ ...prev, required: event.target.checked }))}
                style={{ width: 'auto' }}
              />
              Required field
            </label>
          </div>

          <button type="submit" className="btn" disabled={savingField || !fieldCategoryId}>
            {savingField ? 'Saving...' : 'Add Custom Field'}
          </button>
        </form>

        <h4 style={{ marginBottom: '10px' }}>Existing Fields</h4>
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
                </tr>
              </thead>
              <tbody>
                {fields.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ color: '#6b778c' }}>No fields in this scope yet.</td>
                  </tr>
                ) : (
                  fields.map((field) => (
                    <tr key={field.id}>
                      <td style={{ fontWeight: 500 }}>{field.label}</td>
                      <td>{field.field_key}</td>
                      <td>{field.field_type}</td>
                      <td>{field.subcategory_name || 'All subcategories'}</td>
                      <td>{field.required ? 'Yes' : 'No'}</td>
                      <td>{field.field_type === 'select' ? (field.options || []).join(', ') || '-' : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketMetaAdmin;
