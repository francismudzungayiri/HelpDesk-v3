import React from 'react';
import { useNavigate } from 'react-router-dom';

const TicketTable = ({ tickets }) => {
  const navigate = useNavigate();

  if (!tickets || tickets.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#6b778c' }}>No tickets found. Great job!</div>;
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="card" style={{ padding: '0' }}>
      <table>
        <thead>
          <tr>
            <th style={{ paddingLeft: '24px' }}>ID</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Caller</th>
            <th>Subject</th>
            <th>Assignee</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(ticket => (
            <tr 
              key={ticket.id} 
              className="clickable-row"
              onClick={() => navigate(`/tickets/${ticket.id}`)}
              style={{ borderLeft: ticket.priority === 'HIGH' ? '4px solid #bf2600' : '4px solid transparent' }}
            >
              <td style={{ paddingLeft: '20px' }}>#{ticket.id}</td>
              <td>
                <span className={`badge priority-${ticket.priority}`}>{ticket.priority}</span>
              </td>
              <td>
                <span className={`badge status-${ticket.status}`}>{ticket.status.replace('_', ' ')}</span>
              </td>
              <td style={{ fontWeight: '500' }}>{ticket.caller_name}</td>
              <td>{ticket.description.length > 50 ? ticket.description.substring(0, 50) + '...' : ticket.description}</td>
              <td>
                {ticket.assignee_name ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#dfe1e6', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {ticket.assignee_name.charAt(0)}
                    </div>
                    {ticket.assignee_name}
                  </span>
                ) : <span style={{ color: '#aaa' }}>Unassigned</span>}
              </td>
              <td style={{ color: '#6b778c', fontSize: '12px' }}>{formatDate(ticket.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TicketTable;
