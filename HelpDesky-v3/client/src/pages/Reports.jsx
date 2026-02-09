import React, { useEffect, useState } from 'react';
import api from '../api';

const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get('/stats/reports');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!data) return;
    
    // Combine metrics into a simple CSV format
    let csvContent = "data:text/csv;charset=utf-8,";
    
    csvContent += "Metric,Category,Count\n";
    
    data.status_distribution.forEach(item => {
      csvContent += `Status,${item.status},${item.count}\n`;
    });
    
    data.priority_distribution.forEach(item => {
      csvContent += `Priority,${item.priority},${item.count}\n`;
    });

    data.assignee_performance.forEach(item => {
      csvContent += `Resolved By,${item.name},${item.resolved_count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "helpdesk_reports.csv");
    document.body.appendChild(link);
    link.click();
  };

  if (loading) return <div>Loading reports...</div>;
  if (!data) return <div>Error loading reports</div>;

  // Helper to find max value for scaling charts
  const getMax = (arr) => Math.max(...arr.map(i => parseInt(i.count || i.resolved_count)), 1);

  return (
    <div>
       <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
        <h2>System Reports</h2>
        <button onClick={downloadCSV} className="btn-secondary">Export to CSV</button>
      </div>

      <div className="flex gap-2" style={{ marginBottom: '30px' }}>
        {/* Status Chart */}
        <div className="card" style={{ flex: 1 }}>
          <h3>Tickets by Status</h3>
          <div style={{ marginTop: '20px' }}>
            {data.status_distribution.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '10px' }}>
                <div className="flex justify-between" style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <span>{item.status}</span>
                  <span>{item.count}</span>
                </div>
                <div style={{ background: '#eee', borderRadius: '4px', height: '10px', width: '100%' }}>
                  <div style={{ 
                    background: item.status === 'OPEN' ? '#DE350B' : item.status === 'IN_PROGRESS' ? '#0052cc' : '#00875A', 
                    borderRadius: '4px', 
                    height: '100%', 
                    width: `${(item.count / getMax(data.status_distribution)) * 100}%` 
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Chart */}
        <div className="card" style={{ flex: 1 }}>
           <h3>Tickets by Priority</h3>
           <div style={{ marginTop: '20px' }}>
            {data.priority_distribution.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '10px' }}>
                <div className="flex justify-between" style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <span>{item.priority}</span>
                  <span>{item.count}</span>
                </div>
                <div style={{ background: '#eee', borderRadius: '4px', height: '10px', width: '100%' }}>
                  <div style={{ 
                    background: item.priority === 'HIGH' ? '#DE350B' : item.priority === 'MEDIUM' ? '#FF991F' : '#00875A', 
                    borderRadius: '4px', 
                    height: '100%', 
                    width: `${(item.count / getMax(data.priority_distribution)) * 100}%` 
                  }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Staff Performance (Resolved Tickets)</h3>
         <div style={{ marginTop: '20px' }}>
            {data.assignee_performance.length === 0 ? <p>No resolved tickets yet.</p> : null}
            {data.assignee_performance.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '15px' }}>
                <div className="flex justify-between" style={{ fontSize: '14px', marginBottom: '5px' }}>
                  <span>{item.name}</span>
                  <span>{item.resolved_count}</span>
                </div>
                 <div style={{ background: '#eee', borderRadius: '4px', height: '10px', width: '100%' }}>
                  <div style={{ 
                    background: '#6554C0', 
                    borderRadius: '4px', 
                    height: '100%', 
                    width: `${(item.resolved_count / getMax(data.assignee_performance)) * 100}%` 
                  }}></div>
                </div>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
};

export default Reports;
