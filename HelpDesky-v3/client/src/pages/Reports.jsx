import { FiDownload, FiPrinter } from 'react-icons/fi';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api';
import { priorityLabel, statusLabel } from '../utils/labels';

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

// Chart fills reuse the badge inks so a status or priority is the same colour everywhere.
const STATUS_COLORS = {
  OPEN: 'var(--open-ink)',
  IN_PROGRESS: 'var(--progress-ink)',
  RESOLVED: 'var(--resolved-ink)'
};

const PRIORITY_COLORS = {
  HIGH: 'var(--alert-ink)',
  MEDIUM: 'var(--caution-ink)',
  LOW: 'var(--resolved-ink)'
};

// Single-series charts (category, volume) carry no status meaning, so they stay neutral.
const NEUTRAL_SERIES_COLOR = 'var(--nav-slate)';
const BAR_TRACK = 'var(--bar-track)';

const buildParams = (filters) => {
  const entries = Object.entries(filters).filter(([, value]) => value !== '' && value !== null && value !== undefined);
  return Object.fromEntries(entries);
};

const getMax = (items, key = 'count') => Math.max(...items.map((item) => Number(item[key]) || 0), 1);

// 0.09 -> "5 min", 2.62 -> "2.6 h", 5226 -> "218 days"
const formatDuration = (hours) => {
  if (hours === null || hours === undefined || Number.isNaN(Number(hours))) return 'No data yet';
  const h = Number(hours);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  const days = h / 24;
  return `${days < 10 ? days.toFixed(1) : Math.round(days)} days`;
};

const formatPct = (value) => `${Number(value || 0).toFixed(1)}%`;

const csvEscape = (value) => {
  const stringValue = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const htmlEscape = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

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

  const getExportRows = () => {
    if (!data) return;

    const filtersApplied = data.filters_applied || DEFAULT_FILTERS_APPLIED;

    const rows = [
      ['Section', 'Metric', 'Value'],
      ['Filters', 'Start Date', filtersApplied.start_date || 'All'],
      ['Filters', 'End Date', filtersApplied.end_date || 'All'],
      ['Filters', 'Status', (filtersApplied.status ? statusLabel(filtersApplied.status) : 'All')],
      ['Filters', 'Priority', (filtersApplied.priority ? priorityLabel(filtersApplied.priority) : 'All')],
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
      rows.push(['Status Distribution', statusLabel(item.status), item.count]);
    });

    priorityDistribution.forEach((item) => {
      rows.push(['Priority Distribution', priorityLabel(item.priority), item.count]);
    });

    categoryDistribution.forEach((item) => {
      rows.push(['Category Distribution', item.category, item.count]);
    });

    ticketsOverTime.forEach((item) => {
      rows.push(['Tickets over time', item.date, item.count]);
    });

    return rows;
  };

  const downloadCSV = () => {
    const rows = getExportRows();
    if (!rows) return;
    downloadRowsAsCsv(rows, 'helpdesk_reports.csv');
  };

  const downloadPDF = () => {
    const rows = getExportRows();
    if (!rows) return;

    const tableRows = rows
      .slice(1)
      .map((row) => `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join('')}</tr>`)
      .join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>HelpDesky report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; padding: 28px; color: #1d1d1f; }
            h1 { margin: 0 0 4px; font-size: 22px; letter-spacing: -0.02em; }
            p { margin: 0 0 18px; font-size: 12px; color: #6e6e73; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-bottom: 1px solid #e5e5ea; padding: 7px 8px; text-align: left; font-size: 12px; }
            th { color: #6e6e73; font-weight: 600; }
          </style>
        </head>
        <body>
          <h1>HelpDesky report</h1>
          <p>Generated ${htmlEscape(new Date().toLocaleString())}</p>
          <table>
            <thead>
              <tr><th>Section</th><th>Metric</th><th>Value</th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (!printWindow) {
      URL.revokeObjectURL(url);
      return;
    }

    const onLoaded = () => {
      printWindow.focus();
      printWindow.print();
      URL.revokeObjectURL(url);
    };

    if (printWindow.document.readyState === 'complete') {
      onLoaded();
      return;
    }

    printWindow.addEventListener('load', onLoaded, { once: true });
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

  if (loading && !data) return <div className="card" aria-live="polite">Loading reports…</div>;
  if (error && !data) {
    return (
      <div className="card table-message" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => loadReports(filters)} className="btn-secondary">Try again</button>
      </div>
    );
  }

  if (!data) return <div className="card table-message" role="alert"><p>Couldn't load reports.</p></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-lede">Ticket volume, workload and response times for the filters below.</p>
        </div>
        <div className="page-header-actions">
          {loading ? <span className="field-hint" aria-live="polite">Refreshing…</span> : null}
          <button type="button" className="btn-secondary btn-icon" onClick={downloadCSV}>
            <FiDownload size={15} aria-hidden="true" />
            Export CSV
          </button>
          <button type="button" className="btn-secondary btn-icon" onClick={downloadPDF}>
            <FiPrinter size={15} aria-hidden="true" />
            Print / PDF
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h2 className="side-title">Filters</h2>
        <form onSubmit={handleApplyFilters}>
          <div className="reports-filter-grid">
            <div className="form-group">
              <label htmlFor="reports-start-date">Start date</label>
              <input
                id="reports-start-date"
                type="date"
                value={filters.start_date}
                onChange={(event) => handleFilterChange('start_date', event.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reports-end-date">End date</label>
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
                  <option key={option} value={option}>{statusLabel(option)}</option>
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
                  <option key={option} value={option}>{priorityLabel(option)}</option>
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
            <button type="submit" className="btn">Apply filters</button>
            <button type="button" onClick={handleResetFilters} className="btn-secondary">Reset</button>
          </div>
        </form>
      </div>

      <div className="segmented reports-segmented" role="tablist" aria-label="Report sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'is-active' : ''}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' ? (
        <div>
          <div className="stat-row">
            {[
              ['All tickets', summary.total_tickets, null],
              ['Open', summary.open_tickets, 'OPEN'],
              ['In progress', summary.in_progress_tickets, 'IN_PROGRESS'],
              ['Resolved', summary.resolved_tickets, 'RESOLVED']
            ].map(([label, value, status]) => (
              <div key={label} className="card stat-tile">
                <span className={`stat-label${status ? ` tag status-tag status-tag-${status}` : ''}`}>{label}</span>
                <span className="stat-number">{value}</span>
              </div>
            ))}
          </div>

          <div className="card-grid cols-2" style={{ marginBottom: '20px' }}>
            <div className="card">
              <h3>Tickets by status</h3>
              <div style={{ marginTop: '16px' }}>
                {statusDistribution.length === 0 ? <p>No data for current filters.</p> : null}
                {statusDistribution.map((item) => (
                  <div key={item.status} style={{ marginBottom: '12px' }}>
                    <div className="flex justify-between" style={{ fontSize: '14px', marginBottom: '5px' }}>
                      <span>{statusLabel(item.status)}</span>
                      <span>{item.count}</span>
                    </div>
                    <div style={{ background: BAR_TRACK, borderRadius: '4px', height: '10px', width: '100%' }}>
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
              <h3>Tickets by priority</h3>
              <div style={{ marginTop: '16px' }}>
                {priorityDistribution.length === 0 ? <p>No data for current filters.</p> : null}
                {priorityDistribution.map((item) => (
                  <div key={item.priority} style={{ marginBottom: '12px' }}>
                    <div className="flex justify-between" style={{ fontSize: '14px', marginBottom: '5px' }}>
                      <span>{priorityLabel(item.priority)}</span>
                      <span>{item.count}</span>
                    </div>
                    <div style={{ background: BAR_TRACK, borderRadius: '4px', height: '10px', width: '100%' }}>
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
            <h3>Tickets by category</h3>
            <div style={{ marginTop: '16px' }}>
              {categoryDistribution.length === 0 ? <p>No data for current filters.</p> : null}
              {categoryDistribution.map((item) => (
                <div key={item.category} style={{ marginBottom: '12px' }}>
                  <div className="flex justify-between" style={{ fontSize: '14px', marginBottom: '5px' }}>
                    <span>{item.category}</span>
                    <span>{item.count}</span>
                  </div>
                  <div style={{ background: BAR_TRACK, borderRadius: '4px', height: '10px', width: '100%' }}>
                    <div
                      style={{
                        background: NEUTRAL_SERIES_COLOR,
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
          <h3>Tickets over time</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>Ticket creation volume for the selected filters.</p>

          {ticketsOverTime.length === 0 ? <p style={{ marginTop: '16px' }}>No trend data for current filters.</p> : null}

          <div style={{ marginTop: '16px' }}>
            {ticketsOverTime.map((item) => (
              <div key={item.date} style={{ marginBottom: '12px' }}>
                <div className="flex justify-between" style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <span>{item.date}</span>
                  <span>{item.count}</span>
                </div>
                <div style={{ background: BAR_TRACK, borderRadius: '4px', height: '10px', width: '100%' }}>
                  <div
                    style={{
                      background: NEUTRAL_SERIES_COLOR,
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
            <h2 className="side-title">Response times</h2>
            <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
              <div className="ticket-field-row">
                <span>Average first response</span>
                <strong>{formatDuration(operationalMetrics.first_response_hours_avg)}</strong>
              </div>
              <div className="ticket-field-row">
                <span>Average time to resolve</span>
                <strong>{formatDuration(operationalMetrics.resolution_hours_avg)}</strong>
              </div>
              <div className="ticket-field-row">
                <span>Average age of open tickets</span>
                <strong>{formatDuration(operationalMetrics.backlog_age_hours_avg)}</strong>
              </div>
              <div className="ticket-field-row">
                <span>Reopened tickets</span>
                <strong>{operationalMetrics.reopened_tickets}</strong>
              </div>
              <div className="ticket-field-row">
                <span>Reopened rate</span>
                <strong>{formatPct(operationalMetrics.reopened_rate_pct)}</strong>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="side-title">SLA performance</h2>
            <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
              <div className="ticket-field-row">
                <span>Tickets with an SLA target</span>
                <strong>{operationalMetrics.sla_eligible_tickets}</strong>
              </div>
              <div className="ticket-field-row">
                <span>Missed the target</span>
                <strong className={operationalMetrics.sla_breached_tickets > 0 ? 'metric-alert' : undefined}>{operationalMetrics.sla_breached_tickets}</strong>
              </div>
              <div className="ticket-field-row">
                <span>Missed rate</span>
                <strong className={operationalMetrics.sla_breach_rate_pct > 0 ? 'metric-alert' : undefined}>{formatPct(operationalMetrics.sla_breach_rate_pct)}</strong>
              </div>
            </div>

            <h3 className="label-caption" style={{ margin: '20px 0 6px' }}>Targets by priority</h3>
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {['HIGH', 'MEDIUM', 'LOW'].map((priority) => (
                    <tr key={priority}>
                      <td>{priorityLabel(priority)}</td>
                      <td>{slaThresholdHours[priority]} h</td>
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
