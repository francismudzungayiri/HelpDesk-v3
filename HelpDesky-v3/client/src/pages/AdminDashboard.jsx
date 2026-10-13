import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import useTicketEvents from '../hooks/useTicketEvents';
import Avatar from '../components/Avatar';
import { getWorkStatusMeta } from '../utils/profileStatus';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async ({ background = false } = {}) => {
    if (!background && mountedRef.current) {
      setLoading(true);
    }

    try {
      const res = await api.get('/stats');
      if (mountedRef.current) {
        setStats(res.data);
      }
    } catch (err) {
      if (!background) {
        toast.error('Failed to load dashboard data');
      } else {
        console.error('Failed to refresh dashboard data', err);
      }
    } finally {
      if (!background && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData({ background: false });
  }, [fetchData]);

  useTicketEvents(() => {
    fetchData({ background: true });
  });

  if (loading) return <div className="card" aria-live="polite">Loading dashboard…</div>;
  if (!stats) {
    return (
      <div className="card table-message" role="alert">
        <p>Couldn't load the dashboard. Check your connection and try again.</p>
        <button type="button" className="btn-secondary" onClick={() => fetchData()}>Try again</button>
      </div>
    );
  }

  const tiles = [
    { label: 'Open tickets', value: stats.total_open, to: '/?scope=all' },
    { label: 'Unassigned', value: stats.unassigned_active ?? 0, to: '/?scope=all&view=unassigned', attention: (stats.unassigned_active ?? 0) > 0 },
    { label: 'Reported today', value: stats.today_tickets },
    { label: 'All tickets', value: stats.total_tickets, to: '/?scope=all&view=all' }
  ];

  const availableStaff = stats.staff_stats.filter((s) => s.work_status === 'AVAILABLE').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-lede">Updates live as tickets change.</p>
        </div>
      </div>

      <div className="stat-row">
        {tiles.map((tile) => {
          const content = (
            <>
              <span className="stat-label">{tile.label}</span>
              <span className="stat-number">{tile.value}</span>
            </>
          );
          return tile.to ? (
            <Link key={tile.label} to={tile.to} className={`card stat-tile is-link${tile.attention ? ' needs-attention' : ''}`}>
              {content}
            </Link>
          ) : (
            <div key={tile.label} className="card stat-tile">{content}</div>
          );
        })}
      </div>

      <section className="card table-card" aria-labelledby="workload-heading">
        <div className="table-card-head">
          <h2 id="workload-heading">Staff workload</h2>
          <p className="field-hint">{availableStaff} of {stats.staff_stats.length} available for new tickets.</p>
        </div>
        <div className="table-responsive">
          <table className="people-table">
            <thead>
              <tr>
                <th scope="col">Staff member</th>
                <th scope="col">Availability</th>
                <th scope="col" className="cell-number">Active</th>
                <th scope="col" className="cell-number">Resolved</th>
              </tr>
            </thead>
            <tbody>
              {stats.staff_stats.map((staff) => {
                const status = getWorkStatusMeta(staff.work_status);
                return (
                  <tr key={staff.id ?? staff.name}>
                    <td>
                      <div className="person">
                        <Avatar name={staff.name} size={28} />
                        <span className="person-name">{staff.name}</span>
                      </div>
                    </td>
                    <td><span className={`badge work-status-badge ${status.toneClass}`}>{status.label}</span></td>
                    <td className="cell-number" data-label="Active">{staff.active_tickets}</td>
                    <td className="cell-number" data-label="Resolved">{staff.resolved_tickets}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
