import React from 'react';

// The ticket's number, set quietly in tabular figures.
const RoutingBlock = ({ ticket, number }) => (
  <span className="ticket-id">#{number ?? ticket?.id}</span>
);

export default RoutingBlock;
