import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import TicketTable from '../components/TicketTable';
import toast from 'react-hot-toast';

const TicketList = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN'); // Default to OPEN

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/tickets?status=${filter}`);
        if (active) setTickets(res.data);
      } catch (err) {
        console.error('Failed to fetch tickets', err);
        toast.error('Failed to fetch tickets');
      } finally {
        if (active) setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [filter]);

  return (
    <div>
      <div className="page-header">
        <h2>Tickets</h2>
        <div className="page-header-actions">
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
