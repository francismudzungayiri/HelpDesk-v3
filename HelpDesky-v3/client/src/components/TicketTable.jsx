import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import { timeAgo } from '../utils/dateUtils';

const TicketTable = ({ tickets }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return '#0052cc';
      case 'IN_PROGRESS': return '#FFAB00'; // Jira logic
      case 'RESOLVED': return '#00875A';
      default: return '#42526e';
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #dfe1e6', color: '#6b778c', fontSize: '12px', textTransform: 'uppercase' }}>
            <th style={{ padding: '15px', textAlign: 'left', width: '30px' }}>
              <input type="checkbox" />
            </th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Requester</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Subject</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Assignee</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '15px', textAlign: 'right' }}>Last Message</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(ticket => (
            <tr key={ticket.id} style={{ borderBottom: '1px solid #eee' }}>
              {/* Checkbox */}
              <td style={{ padding: '15px' }}>
                <input type="checkbox" />
              </td>

              {/* Requester */}
              <td style={{ padding: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar name={ticket.caller_name} size={40} />
                  <div>
                    <div style={{ fontWeight: '500', color: '#172B4D' }}>{ticket.caller_name}</div>
                    {/* Assuming phone is pseudo-email or identifier if needed, else hide */}
                    {ticket.phone && <div style={{ fontSize: '12px', color: '#6b778c' }}>{ticket.phone}</div>}
                  </div>
                </div>
              </td>

              {/* Subject (Link) */}
              <td style={{ padding: '15px' }}>
                <div style={{ fontWeight: '500' }}>
                  <Link to={`/tickets/${ticket.id}`} style={{ color: '#172B4D', textDecoration: 'none' }}>
                    {ticket.description.substring(0, 50)}{ticket.description.length > 50 ? '...' : ''}
                  </Link>
                </div>
                <div style={{ fontSize: '12px', color: '#6b778c' }}>{ticket.department}</div>
              </td>

              {/* Assignee */}
              <td style={{ padding: '15px' }}>
                 {ticket.assignee_name ? (
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     {/* Try to use username for initials if needed, fallback to name */}
                      <span style={{ fontSize: '14px' }}>{ticket.assignee_name.split(' ')[0]}</span>
                   </div>
                 ) : (
                   <span style={{ color: '#999', fontStyle: 'italic' }}>Unassigned</span>
                 )}
              </td>

              {/* Status */}
              <td style={{ padding: '15px' }}>
                <span className="badge" style={{ 
                  backgroundColor: getStatusColor(ticket.status), 
                  color: 'white',
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '12px'
                }}>
                  {ticket.status}
                </span>
              </td>

              {/* Last Message (Time Ago) */}
              <td style={{ padding: '15px', textAlign: 'right', color: '#6b778c', fontSize: '13px' }}>
                {timeAgo(ticket.created_at)}
              </td>
            </tr>
          ))}
          {tickets.length === 0 && (
            <tr>
              <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#6b778c' }}>
                No tickets found using current filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TicketTable;
