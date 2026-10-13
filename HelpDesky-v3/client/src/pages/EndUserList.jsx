import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus, FiSearch } from 'react-icons/fi';
import api from '../api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';

const EMPTY_FORM = { username: '', name: '', role: 'END_USER', password: '', department: '', phone: '' };

const EndUserList = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');

  const [editing, setEditing] = useState(null); // null = closed, {} = new, user = edit
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoadError('');
    try {
      const res = await api.get('/users/end-users');
      setUsers(res.data);
    } catch {
      setLoadError("Couldn't load end users. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...users].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (!q) return sorted;
    return sorted.filter((u) => [u.name, u.username, u.department, u.phone].some((v) => v && String(v).toLowerCase().includes(q)));
  }, [users, query]);

  const isNew = editing && !editing.id;
  const setField = (key) => (event) => setFormData({ ...formData, [key]: event.target.value });

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setFormError('');
    setEditing({});
  };

  const openEdit = (person) => {
    setFormData({
      username: person.username,
      name: person.name,
      role: 'END_USER',
      password: '',
      department: person.department || '',
      phone: person.phone || ''
    });
    setFormError('');
    setEditing(person);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      if (isNew) {
        await api.post('/users', formData);
        toast.success(`${formData.name} added`);
      } else {
        const updates = {};
        if (formData.name !== editing.name) updates.name = formData.name;
        if (formData.password) updates.password = formData.password;
        if (formData.department !== (editing.department || '')) updates.department = formData.department;
        if (formData.phone !== (editing.phone || '')) updates.phone = formData.phone;
        if (Object.keys(updates).length > 0) {
          await api.patch(`/users/${editing.id}`, updates);
          toast.success(`${formData.name} updated`);
        }
      }
      setEditing(null);
      fetchUsers();
    } catch (err) {
      const messages = err.response?.data?.errors || [err.response?.data?.message || "Couldn't save. Try again."];
      setFormError(messages.join(' '));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await api.delete(`/users/${deleting.id}`);
      toast.success(`${deleting.name} removed`);
      setDeleting(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't remove this account. Try again.");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">End users</h1>
          <p className="page-lede">
            {loading ? 'Loading people…' : `${users.length} people can report problems.`}
            {' '}People can also register themselves from the sign-in page.
          </p>
        </div>
        <button type="button" onClick={openAdd} className="btn btn-icon">
          <FiPlus size={16} aria-hidden="true" />
          Add end user
        </button>
      </div>

      <div className="list-tools">
        <div className="queue-search">
          <FiSearch size={16} aria-hidden="true" />
          <label htmlFor="people-search" className="visually-hidden">Search end users</label>
          <input
            id="people-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, department, phone…"
          />
        </div>
      </div>

      <div className="card table-card">
        {loadError ? (
          <div className="table-message" role="alert">
            <p>{loadError}</p>
            <button type="button" className="btn-secondary" onClick={fetchUsers}>Try again</button>
          </div>
        ) : !loading && visible.length === 0 ? (
          <div className="table-message">
            <p>{query ? `Nobody matches "${query}".` : 'No end users yet.'}</p>
            {query && <button type="button" className="btn-secondary" onClick={() => setQuery('')}>Clear search</button>}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="people-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Department</th>
                  <th scope="col">Phone</th>
                  <th scope="col" className="cell-actions"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <div className="person">
                        <Avatar name={person.name} size={32} />
                        <div>
                          <div className="person-name">{person.name}</div>
                          <div className="person-sub">@{person.username}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Department">{person.department || <span className="muted">Not set</span>}</td>
                    <td data-label="Phone">
                      {person.phone
                        ? <a href={`tel:${person.phone.replace(/\s+/g, '')}`} className="tel-link">{person.phone}</a>
                        : <span className="muted">Not set</span>}
                    </td>
                    <td className="cell-actions">
                      <button type="button" className="btn-secondary btn-small" onClick={() => openEdit(person)} aria-label={`Edit ${person.name}`}>
                        Edit
                      </button>
                      {isAdmin && (
                        <button type="button" className="btn-danger btn-small" onClick={() => setDeleting(person)} aria-label={`Remove ${person.name}`}>
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal title={isNew ? 'Add end user' : `Edit ${editing.name}`} onClose={() => setEditing(null)} busy={submitting}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="eu-name">Full name</label>
              <input id="eu-name" type="text" value={formData.name} onChange={setField('name')} required />
            </div>
            <div className="form-group">
              <label htmlFor="eu-username">Username</label>
              <input
                id="eu-username"
                type="text"
                value={formData.username}
                onChange={setField('username')}
                required
                disabled={!isNew}
                aria-describedby={!isNew ? 'eu-username-hint' : undefined}
              />
              {!isNew && <p className="field-hint" id="eu-username-hint">Usernames can't be changed.</p>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="eu-department">Department</label>
                <input id="eu-department" type="text" value={formData.department} onChange={setField('department')} required={isNew} placeholder="e.g. Finance" />
              </div>
              <div className="form-group">
                <label htmlFor="eu-phone">Phone <span className="optional-tag">optional</span></label>
                <input id="eu-phone" type="tel" value={formData.phone} onChange={setField('phone')} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="eu-password">{isNew ? 'Password' : 'New password'}</label>
              <input
                id="eu-password"
                type="password"
                value={formData.password}
                onChange={setField('password')}
                required={isNew}
                minLength={6}
                autoComplete="new-password"
                aria-describedby="eu-password-hint"
              />
              <p className="field-hint" id="eu-password-hint">
                {isNew ? 'At least 6 characters. Share it with them so they can sign in.' : 'To reset their password, type a new one. Leave blank to keep it.'}
              </p>
            </div>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary" disabled={submitting}>Cancel</button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Saving…' : isNew ? 'Add end user' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal
          title={`Remove ${deleting.name}?`}
          description={`${deleting.name} won't be able to sign in or report problems. Accounts that have reported tickets can't be removed, so the ticket history stays complete.`}
          onClose={() => setDeleting(null)}
          busy={deleteBusy}
          size="sm"
        >
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setDeleting(null)} disabled={deleteBusy}>Keep account</button>
            <button type="button" className="btn-danger" onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy ? 'Removing…' : `Remove ${deleting.name}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EndUserList;
