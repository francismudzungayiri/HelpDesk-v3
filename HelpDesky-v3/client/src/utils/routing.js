// Routing codes for the label block: short, uppercase, stable for a given category.

const CATEGORY_CODES = {
  hardware: 'HW',
  software: 'SW',
  network: 'NET',
  access: 'ACC'
};

const shortCode = (name, length = 3) => String(name || '')
  .replace(/[^a-z0-9]/gi, '')
  .slice(0, length)
  .toUpperCase();

export const categoryCode = (categoryName) => {
  if (!categoryName) return 'NEW';
  const known = CATEGORY_CODES[String(categoryName).trim().toLowerCase()];
  return known || shortCode(categoryName);
};

export const routingCode = (ticket) => {
  if (!ticket?.category_name) return 'UNSORTED';
  if (String(ticket.category_name).trim().toLowerCase() === 'not sure') return 'TRIAGE';
  const sub = ticket.subcategory_name ? shortCode(ticket.subcategory_name) : '';
  return sub ? `${categoryCode(ticket.category_name)}·${sub}` : categoryCode(ticket.category_name);
};

export const destinationName = (ticket) => (ticket?.assignee_name ? String(ticket.assignee_name).trim().split(/\s+/)[0] : null);
