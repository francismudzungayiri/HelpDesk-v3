import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_WORK_STATUS, getWorkStatusMeta, PROFILE_STATUS_OPTIONS } from '../utils/profileStatus';

const Profile = () => {
  const { user, workStatus, updateWorkStatus } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState(DEFAULT_WORK_STATUS);
  const [savedStatus, setSavedStatus] = useState(DEFAULT_WORK_STATUS);

  useEffect(() => {
    setSelectedStatus(workStatus);
    setSavedStatus(workStatus);
  }, [workStatus]);

  const activeOption = getWorkStatusMeta(selectedStatus);
  const hasUnsavedChanges = selectedStatus !== savedStatus;

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const persistedStatus = await updateWorkStatus(selectedStatus);
      setSavedStatus(persistedStatus);
      setSelectedStatus(persistedStatus);
      toast.success('Profile status updated');
    } catch (err) {
      const messages = err.response?.data?.errors || [err.response?.data?.message || 'Failed to update status'];
      messages.forEach((msg) => toast.error(msg));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <div style={{ color: 'var(--text-secondary)' }}>Manage your availability status</div>
        </div>
      </div>

      <div className="card profile-layout">
        <div className="profile-header">
          <Avatar name={user?.name || user?.username} size={64} />
          <div className="profile-header-meta">
            <h2>{user?.name || user?.username}</h2>
            <div className="profile-secondary-row">@{user?.username}</div>
            <div className="profile-secondary-row">{user?.role}</div>
            <span className={`badge work-status-badge ${activeOption.toneClass}`}>{activeOption.label}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset className="profile-status-fieldset">
            <legend>Work status</legend>

            {PROFILE_STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`profile-status-option ${selectedStatus === option.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="workStatus"
                  value={option.value}
                  checked={selectedStatus === option.value}
                  onChange={() => setSelectedStatus(option.value)}
                />
                <div>
                  <div className="profile-status-option-label">{option.label}</div>
                  <div className="profile-status-option-description">{option.description}</div>
                </div>
              </label>
            ))}
          </fieldset>

          <div className="profile-actions">
            <button type="submit" className="btn" disabled={!hasUnsavedChanges}>Save status</button>
            {!hasUnsavedChanges && <span className="profile-saved-indicator">Saved</span>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
