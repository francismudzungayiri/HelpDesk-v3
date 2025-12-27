import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import TicketTable from '../components/TicketTable';

const TicketList = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN'); // Default to OPEN

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tickets?status=${filter}`);
      setTickets(res.data);
    } catch (err) {
      console.error('Failed to fetch tickets', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: '20px' }}>
        <h2>Tickets</h2>
        <div className="flex gap-2">
           <select 
             value={filter} 
             onChange={(e) => setFilter(e.target.value)}
             style={{ width: '150px' }}
           >
             <option value="">All Tickets</option>
             <option value="OPEN">Open</option>
             <option value="IN_PROGRESS">In Progress</option>
             <option value="RESOLVED">Resolved</option>
           </select>
           <Link to="/tickets/new" className="btn">Create Ticket</Link>
        </div>
      </div>

      {loading ? (
        <div>Loading tickets...</div>
      ) : (
        <TicketTable tickets={tickets} />
      )}
    </div>
  );
};

export default TicketList;
