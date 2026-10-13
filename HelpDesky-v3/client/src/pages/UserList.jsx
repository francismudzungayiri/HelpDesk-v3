import React, { useCallback, useEffect, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import { roleLabel } from '../utils/labels';
import { getWorkStatusMeta } from '../utils/profileStatus';

const EMPTY_FORM = { username: '', name: '', role: 'AGENT', password: '' };

const UserList = () => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editing, setEditing] = useState(null); // null = closed, {} = new, user = edit
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoadError('');
    try {
      const res = await api.get('/users/staff');
      setUsers(res.data);
    } catch {
      setLoadError("Couldn't load staff. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const isNew = editing && !editing.id;

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setFormError('');
    setEditing({});
  };

  const openEdit = (staff) => {
    setFormData({ username: staff.username, name: staff.name, role: staff.role, password: '' });
    setFormError('');
    setEditing(staff);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      if (isNew) {
        await api.post('/users', formData);
        toast.success(`${formData.name} added to staff`);
      } else {
        const updates = {};
        if (formData.name !== editing.name) updates.name = formData.name;
        if (formData.role !== editing.role) updates.role = formData.role;
        if (formData.password) updates.password = formData.password;
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

  const availableCount = users.filter((u) => u.work_status === 'AVAILABLE').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="page-lede">
            {loading ? 'Loading staff…' : `${users.length} staff, ${availableCount} available for new tickets.`}
            {!isAdmin && ' Only admins can add or change staff accounts.'}
          </p>
        </div>
        {isAdmin && (
          <button type="button" onClick={openAdd} className="btn btn-icon">
            <FiPlus size={16} aria-hidden="true" />
            Add staff member
          </button>
        )}
      </div>

      <div className="card table-card">
        {loadError ? (
          <div className="table-message" role="alert">
            <p>{loadError}</p>
            <button type="button" className="btn-secondary" onClick={fetchUsers}>Try again</button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="people-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Availability</th>
                  {isAdmin && <th scope="col" className="cell-actions"><span className="visually-hidden">Actions</span></th>}
                </tr>
              </thead>
              <tbody>
                {users.map((staff) => {
                  const status = getWorkStatusMeta(staff.work_status);
                  const isSelf = staff.id === currentUser.id;
                  return (
                    <tr key={staff.id}>
                      <td>
                        <div className="person">
                          <Avatar name={staff.name} size={32} />
                          <div>
                            <div className="person-name">{staff.name}{isSelf && <span className="person-you"> (you)</span>}</div>
                            <div className="person-sub">@{staff.username}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge role-badge role-${staff.role}`}>{roleLabel(staff.role)}</span></td>
                      <td><span className={`badge work-status-badge ${status.toneClass}`}>{status.label}</span></td>
                      {isAdmin && (
                        <td className="cell-actions">
                          <button type="button" className="btn-secondary btn-small" onClick={() => openEdit(staff)} aria-label={`Edit ${staff.name}`}>
                            Edit
                          </button>
                          {!isSelf && (
                            <button type="button" className="btn-danger btn-small" onClick={() => setDeleting(staff)} aria-label={`Remove ${staff.name}`}>
                              Remove
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal
          title={isNew ? 'Add staff member' : `Edit ${editing.name}`}
          onClose={() => setEditing(null)}
          busy={submitting}
        >
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="staff-name">Full name</label>
              <input id="staff-name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="staff-username">Username</label>
              <input
                id="staff-username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={!isNew}
                aria-describedby={!isNew ? 'staff-username-hint' : undefined}
              />
              {!isNew && <p className="field-hint" id="staff-username-hint">Usernames can't be changed.</p>}
            </div>
            <div className="form-group">
              <label htmlFor="staff-role">Role</label>
              <select id="staff-role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} aria-describedby="staff-role-hint">
                <option value="AGENT">Agent</option>
                <option value="ADMIN">Admin</option>
              </select>
              <p className="field-hint" id="staff-role-hint">Admins can also manage staff, ticket settings and reports.</p>
            </div>
            <div className="form-group">
              <label htmlFor="staff-password">{isNew ? 'Password' : 'New password'}</label>
              <input
                id="staff-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={isNew}
                minLength={6}
                autoComplete="new-password"
                aria-describedby="staff-password-hint"
              />
              <p className="field-hint" id="staff-password-hint">{isNew ? 'At least 6 characters.' : 'Leave blank to keep the current password.'}</p>
            </div>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary" disabled={submitting}>Cancel</button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Saving…' : isNew ? 'Add staff member' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal
          title={`Remove ${deleting.name}?`}
          description={`${deleting.name} won't be able to sign in any more. Staff who have worked on tickets can't be removed, so the ticket history stays complete.`}
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

export default UserList;
