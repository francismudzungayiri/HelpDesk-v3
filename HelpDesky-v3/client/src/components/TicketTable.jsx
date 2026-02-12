import React from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import { timeAgo } from '../utils/dateUtils';

const TicketTable = ({ tickets }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN':
        return '#0052cc';
      case 'IN_PROGRESS':
        return '#FFAB00';
      case 'RESOLVED':
        return '#00875A';
      default:
        return '#42526e';
    }
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="table-responsive table-wide hide-mobile">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #dfe1e6', color: '#6b778c', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '15px', textAlign: 'left', width: '30px' }}>
                <input type="checkbox" aria-label="Select all tickets" />
              </th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Requester</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Subject</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Assignee</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '15px', textAlign: 'right' }}>Last Message</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '15px' }}>
                  <input type="checkbox" aria-label={`Select ticket ${ticket.id}`} />
                </td>

                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar name={ticket.caller_name} size={40} />
                    <div>
                      <div style={{ fontWeight: '500', color: '#172B4D' }}>{ticket.caller_name}</div>
                      {ticket.phone && <div style={{ fontSize: '12px', color: '#6b778c' }}>{ticket.phone}</div>}
                    </div>
                  </div>
                </td>

                <td style={{ padding: '15px' }}>
                  <div style={{ fontWeight: '500' }}>
                    <Link to={`/tickets/${ticket.id}`} style={{ color: '#172B4D', textDecoration: 'none' }}>
                      {ticket.description.substring(0, 50)}{ticket.description.length > 50 ? '...' : ''}
                    </Link>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b778c' }}>
                    {ticket.department}
                    {ticket.category_name ? ` • ${ticket.category_name}/${ticket.subcategory_name || '-'}` : ''}
                  </div>
                </td>

                <td style={{ padding: '15px' }}>
                  {ticket.assignee_name ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>{ticket.assignee_name.split(' ')[0]}</span>
                    </div>
                  ) : (
                    <span style={{ color: '#999', fontStyle: 'italic' }}>Unassigned</span>
                  )}
                </td>

                <td style={{ padding: '15px' }}>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: getStatusColor(ticket.status),
                      color: 'white',
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '12px'
                    }}
                  >
                    {ticket.status}
                  </span>
                </td>

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

      <div className="show-mobile" style={{ padding: '12px' }}>
        {tickets.length === 0 ? (
          <div style={{ padding: '12px', color: '#6b778c', textAlign: 'center' }}>No tickets found using current filter.</div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              style={{
                border: '1px solid #dfe1e6',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '10px',
                background: '#fff'
              }}
            >
              <div className="flex justify-between items-center" style={{ marginBottom: '10px' }}>
                <Link to={`/tickets/${ticket.id}`} style={{ fontWeight: 600, color: '#172B4D' }}>
                  Ticket #{ticket.id}
                </Link>
                <span
                  className="badge"
                  style={{
                    backgroundColor: getStatusColor(ticket.status),
                    color: 'white',
                    fontSize: '10px',
                    padding: '4px 8px',
                    borderRadius: '10px'
                  }}
                >
                  {ticket.status}
                </span>
              </div>

              <div style={{ marginBottom: '10px', color: '#172B4D', lineHeight: 1.4 }}>
                {ticket.description.substring(0, 100)}{ticket.description.length > 100 ? '...' : ''}
              </div>

              <div style={{ fontSize: '13px', color: '#6b778c', marginBottom: '8px' }}>
                <strong style={{ color: '#42526e' }}>Requester:</strong> {ticket.caller_name}
              </div>

              <div style={{ fontSize: '13px', color: '#6b778c', marginBottom: '8px' }}>
                <strong style={{ color: '#42526e' }}>Department:</strong> {ticket.department || '-'}
              </div>

              <div style={{ fontSize: '13px', color: '#6b778c', marginBottom: '8px' }}>
                <strong style={{ color: '#42526e' }}>Assignee:</strong> {ticket.assignee_name || 'Unassigned'}
              </div>

              <div style={{ fontSize: '12px', color: '#6b778c' }}>{timeAgo(ticket.created_at)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TicketTable;
