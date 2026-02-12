import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api';

const DEFAULT_FILTERS = {
  start_date: '',
  end_date: '',
  status: '',
  priority: '',
  assignee_id: '',
  category_id: ''
};

const DEFAULT_FILTERS_APPLIED = {
  start_date: null,
  end_date: null,
  status: null,
  priority: null,
  assignee_id: null,
  category_id: null
};

const DEFAULT_OPERATIONAL_METRICS = {
  first_response_hours_avg: null,
  resolution_hours_avg: null,
  backlog_age_hours_avg: null,
  reopened_tickets: 0,
  ever_resolved_tickets: 0,
  reopened_rate_pct: 0,
  sla_eligible_tickets: 0,
  sla_breached_tickets: 0,
  sla_breach_rate_pct: 0
};

const DEFAULT_SLA_THRESHOLDS = {
  HIGH: 4,
  MEDIUM: 8,
  LOW: 24
};
const EMPTY_LIST = [];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const TABS = [
  { id: 'OVERVIEW', label: 'Overview' },
  { id: 'TRENDS', label: 'Trends' },
  { id: 'SLA', label: 'SLA' }
];

const STATUS_COLORS = {
  OPEN: '#DE350B',
  IN_PROGRESS: '#0052cc',
  RESOLVED: '#00875A'
};

const PRIORITY_COLORS = {
  HIGH: '#DE350B',
  MEDIUM: '#FF991F',
  LOW: '#00875A'
};

const CATEGORY_COLOR = '#4C9AFF';

const buildParams = (filters) => {
  const entries = Object.entries(filters).filter(([, value]) => value !== '' && value !== null && value !== undefined);
  return Object.fromEntries(entries);
};

const getMax = (items, key = 'count') => Math.max(...items.map((item) => Number(item[key]) || 0), 1);

const formatHours = (hours) => {
  if (hours === null || hours === undefined) return 'N/A';
  return `${Number(hours).toFixed(2)} hrs`;
};

const formatPct = (value) => `${Number(value || 0).toFixed(2)}%`;

const csvEscape = (value) => {
  const stringValue = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const downloadRowsAsCsv = (rows, fileName) => {
  const csv = rows.map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

const Reports = () => {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  const loadReports = useCallback(async (filtersToApply) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/stats/reports', { params: buildParams(filtersToApply) });
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch reports', err);
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports(DEFAULT_FILTERS);
  }, [loadReports]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyFilters = (event) => {
    event.preventDefault();
    loadReports(filters);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    loadReports(DEFAULT_FILTERS);
  };

  const downloadCSV = () => {
    if (!data) return;

    const filtersApplied = data.filters_applied || DEFAULT_FILTERS_APPLIED;

    const rows = [
      ['Section', 'Metric', 'Value'],
      ['Filters', 'Start Date', filtersApplied.start_date || 'All'],
      ['Filters', 'End Date', filtersApplied.end_date || 'All'],
      ['Filters', 'Status', filtersApplied.status || 'All'],
      ['Filters', 'Priority', filtersApplied.priority || 'All'],
      ['Filters', 'Assignee', filtersApplied.assignee_id || 'All'],
      ['Filters', 'Category', filtersApplied.category_id || 'All'],
      ['Summary', 'Total Tickets', summary.total_tickets],
      ['Summary', 'Open Tickets', summary.open_tickets],
      ['Summary', 'In Progress Tickets', summary.in_progress_tickets],
      ['Summary', 'Resolved Tickets', summary.resolved_tickets],
      ['Operational', 'First Response (Avg Hours)', operationalMetrics.first_response_hours_avg ?? 'N/A'],
      ['Operational', 'Resolution (Avg Hours)', operationalMetrics.resolution_hours_avg ?? 'N/A'],
      ['Operational', 'Backlog Age (Avg Hours)', operationalMetrics.backlog_age_hours_avg ?? 'N/A'],
      ['Operational', 'Reopened Tickets', operationalMetrics.reopened_tickets],
      ['Operational', 'Reopened Rate (%)', operationalMetrics.reopened_rate_pct],
      ['Operational', 'SLA Eligible Tickets', operationalMetrics.sla_eligible_tickets],
      ['Operational', 'SLA Breached Tickets', operationalMetrics.sla_breached_tickets],
      ['Operational', 'SLA Breach Rate (%)', operationalMetrics.sla_breach_rate_pct]
    ];

    statusDistribution.forEach((item) => {
      rows.push(['Status Distribution', item.status, item.count]);
    });

    priorityDistribution.forEach((item) => {
      rows.push(['Priority Distribution', item.priority, item.count]);
    });

    categoryDistribution.forEach((item) => {
      rows.push(['Category Distribution', item.category, item.count]);
    });

    ticketsOverTime.forEach((item) => {
      rows.push(['Tickets Over Time', item.date, item.count]);
    });

    downloadRowsAsCsv(rows, 'helpdesk_reports.csv');
  };

  const statusDistribution = Array.isArray(data?.status_distribution) ? data.status_distribution : EMPTY_LIST;
  const priorityDistribution = Array.isArray(data?.priority_distribution) ? data.priority_distribution : EMPTY_LIST;
  const categoryDistribution = Array.isArray(data?.category_distribution) ? data.category_distribution : EMPTY_LIST;
  const ticketsOverTime = Array.isArray(data?.tickets_over_time) ? data.tickets_over_time : EMPTY_LIST;

  const derivedSummaryFromStatus = statusDistribution.reduce(
    (acc, item) => {
      const count = toNumber(item.count);
      acc.total_tickets += count;
      if (item.status === 'OPEN') acc.open_tickets += count;
      if (item.status === 'IN_PROGRESS') acc.in_progress_tickets += count;
      if (item.status === 'RESOLVED') acc.resolved_tickets += count;
      return acc;
    },
    { total_tickets: 0, open_tickets: 0, in_progress_tickets: 0, resolved_tickets: 0 }
  );

  const summary = data?.summary
    ? {
        total_tickets: toNumber(data.summary.total_tickets),
        open_tickets: toNumber(data.summary.open_tickets),
        in_progress_tickets: toNumber(data.summary.in_progress_tickets),
        resolved_tickets: toNumber(data.summary.resolved_tickets)
      }
    : derivedSummaryFromStatus;

  const assigneeOptions = data?.filter_options?.assignees || [];
  const categoryOptions = data?.filter_options?.categories || [];
  const statusOptions = data?.filter_options?.statuses || ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
  const priorityOptions = data?.filter_options?.priorities || ['HIGH', 'MEDIUM', 'LOW'];
  const operationalMetrics = {
    ...DEFAULT_OPERATIONAL_METRICS,
    ...(data?.operational_metrics || {})
  };
  const slaThresholdHours = {
    ...DEFAULT_SLA_THRESHOLDS,
    ...(data?.sla_threshold_hours || {})
  };

  const trendMax = useMemo(() => getMax(ticketsOverTime), [ticketsOverTime]);

  if (loading && !data) return <div>Loading reports...</div>;
  if (error && !data) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: '8px' }}>Error loading reports</h3>
        <p style={{ marginTop: 0, color: '#6b778c' }}>{error}</p>
        <button type="button" onClick={() => loadReports(filters)} className="btn-secondary">Retry</button>
      </div>
    );
  }

  if (!data) return <div>Error loading reports</div>;

  return (
    <div>
      <div className="page-header">
        <h2>System Reports</h2>
        <div className="page-header-actions">
          {loading ? <span style={{ color: '#6b778c', fontSize: '13px' }}>Refreshing...</span> : null}
          <button type="button" onClick={downloadCSV} className="btn-secondary">Export to CSV</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '16px' }}>Filters</h3>
        <form onSubmit={handleApplyFilters}>
          <div className="reports-filter-grid">
            <div className="form-group">
              <label htmlFor="reports-start-date">Start Date</label>
              <input
                id="reports-start-date"
                type="date"
                value={filters.start_date}
                onChange={(event) => handleFilterChange('start_date', event.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reports-end-date">End Date</label>
              <input
                id="reports-end-date"
                type="date"
                value={filters.end_date}
                onChange={(event) => handleFilterChange('end_date', event.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reports-status">Status</label>
              <select
                id="reports-status"
                value={filters.status}
                onChange={(event) => handleFilterChange('status', event.target.value)}
              >
                <option value="">All</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="reports-priority">Priority</label>
              <select
                id="reports-priority"
                value={filters.priority}
                onChange={(event) => handleFilterChange('priority', event.target.value)}
              >
                <option value="">All</option>
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="reports-assignee">Assignee</label>
              <select
                id="reports-assignee"
                value={filters.assignee_id}
                onChange={(event) => handleFilterChange('assignee_id', event.target.value)}
              >
                <option value="">All</option>
                <option value="unassigned">Unassigned</option>
                {assigneeOptions.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>{assignee.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="reports-category">Category</label>
              <select
                id="reports-category"
                value={filters.category_id}
                onChange={(event) => handleFilterChange('category_id', event.target.value)}
              >
                <option value="">All</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="reports-filter-actions">
            <button type="submit" className="btn">Apply Filters</button>
            <button type="button" onClick={handleResetFilters} className="btn-secondary">Reset</button>
          </div>
        </form>
      </div>

      <div className="reports-tabs" role="tablist" aria-label="Report sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`reports-tab-button ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' ? (
        <div>
          <div className="card-grid cols-3" style={{ marginBottom: '20px' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px', color: '#6b778c' }}>Total Tickets</h4>
              <div style={{ fontSize: '30px', fontWeight: '700' }}>{summary.total_tickets}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px', color: '#6b778c' }}>Open</h4>
              <div style={{ fontSize: '30px', fontWeight: '700', color: '#DE350B' }}>{summary.open_tickets}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 8px', color: '#6b778c' }}>In Progress</h4>
              <div style={{ fontSize: '30px', fontWeight: '700', color: '#0052cc' }}>{summary.in_progress_tickets}</div>
            </div>
          </div>

          <div className="card-grid cols-2" style={{ marginBottom: '20px' }}>
            <div className="card">
              <h3>Tickets by Status</h3>
              <div style={{ marginTop: '16px' }}>
                {statusDistribution.length === 0 ? <p>No data for current filters.</p> : null}
                {statusDistribution.map((item) => (
                  <div key={item.status} style={{ marginBottom: '12px' }}>
                    <div className="flex justify-between" style={{ fontSize: '14px', marginBottom: '5px' }}>
                      <span>{item.status}</span>
                      <span>{item.count}</span>
                    </div>
                    <div style={{ background: '#eee', borderRadius: '4px', height: '10px', width: '100%' }}>
                      <div
                        style={{
                          background: STATUS_COLORS[item.status] || '#42526e',
                          borderRadius: '4px',
                          height: '100%',
                          width: `${(item.count / getMax(statusDistribution)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3>Tickets by Priority</h3>
              <div style={{ marginTop: '16px' }}>
                {priorityDistribution.length === 0 ? <p>No data for current filters.</p> : null}
                {priorityDistribution.map((item) => (
                  <div key={item.priority} style={{ marginBottom: '12px' }}>
                    <div className="flex justify-between" style={{ fontSize: '14px', marginBottom: '5px' }}>
                      <span>{item.priority}</span>
                      <span>{item.count}</span>
                    </div>
                    <div style={{ background: '#eee', borderRadius: '4px', height: '10px', width: '100%' }}>
                      <div
                        style={{
                          background: PRIORITY_COLORS[item.priority] || '#42526e',
                          borderRadius: '4px',
                          height: '100%',
                          width: `${(item.count / getMax(priorityDistribution)) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Tickets by Category</h3>
            <div style={{ marginTop: '16px' }}>
              {categoryDistribution.length === 0 ? <p>No data for current filters.</p> : null}
              {categoryDistribution.map((item) => (
                <div key={item.category} style={{ marginBottom: '12px' }}>
                  <div className="flex justify-between" style={{ fontSize: '14px', marginBottom: '5px' }}>
                    <span>{item.category}</span>
                    <span>{item.count}</span>
                  </div>
                  <div style={{ background: '#eee', borderRadius: '4px', height: '10px', width: '100%' }}>
                    <div
                      style={{
                        background: CATEGORY_COLOR,
                        borderRadius: '4px',
                        height: '100%',
                        width: `${(item.count / getMax(categoryDistribution)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'TRENDS' ? (
        <div className="card">
          <h3>Tickets Over Time</h3>
          <p style={{ color: '#6b778c', marginTop: '6px' }}>Ticket creation volume for the selected filters.</p>

          {ticketsOverTime.length === 0 ? <p style={{ marginTop: '16px' }}>No trend data for current filters.</p> : null}

          <div style={{ marginTop: '16px' }}>
            {ticketsOverTime.map((item) => (
              <div key={item.date} style={{ marginBottom: '12px' }}>
                <div className="flex justify-between" style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <span>{item.date}</span>
                  <span>{item.count}</span>
                </div>
                <div style={{ background: '#eee', borderRadius: '4px', height: '10px', width: '100%' }}>
                  <div
                    style={{
                      background: '#36B37E',
                      borderRadius: '4px',
                      height: '100%',
                      width: `${(item.count / trendMax) * 100}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'SLA' ? (
        <div className="card-grid cols-2">
          <div className="card">
            <h3>Operational Metrics</h3>
            <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
              <div className="ticket-field-row">
                <span>Avg First Response Time</span>
                <strong>{formatHours(operationalMetrics.first_response_hours_avg)}</strong>
              </div>
              <div className="ticket-field-row">
                <span>Avg Resolution Time</span>
                <strong>{formatHours(operationalMetrics.resolution_hours_avg)}</strong>
              </div>
              <div className="ticket-field-row">
                <span>Avg Backlog Age (Open/In Progress)</span>
                <strong>{formatHours(operationalMetrics.backlog_age_hours_avg)}</strong>
              </div>
              <div className="ticket-field-row">
                <span>Reopened Tickets</span>
                <strong>{operationalMetrics.reopened_tickets}</strong>
              </div>
              <div className="ticket-field-row">
                <span>Reopened Rate</span>
                <strong>{formatPct(operationalMetrics.reopened_rate_pct)}</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>SLA Performance</h3>
            <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
              <div className="ticket-field-row">
                <span>SLA Eligible Tickets</span>
                <strong>{operationalMetrics.sla_eligible_tickets}</strong>
              </div>
              <div className="ticket-field-row">
                <span>SLA Breached Tickets</span>
                <strong>{operationalMetrics.sla_breached_tickets}</strong>
              </div>
              <div className="ticket-field-row">
                <span>SLA Breach Rate</span>
                <strong>{formatPct(operationalMetrics.sla_breach_rate_pct)}</strong>
              </div>
            </div>

            <h4 style={{ marginTop: '18px', marginBottom: '8px' }}>SLA Targets (Hours)</h4>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Target Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {['HIGH', 'MEDIUM', 'LOW'].map((priority) => (
                    <tr key={priority}>
                      <td>{priority}</td>
                      <td>{slaThresholdHours[priority]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Reports;
