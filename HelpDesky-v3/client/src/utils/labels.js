// Human labels for values stored as codes. Never render the raw code.

const STATUS_LABELS = { OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved' };
const PRIORITY_LABELS = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };
const ROLE_LABELS = { ADMIN: 'Admin', AGENT: 'Agent', END_USER: 'End user' };

const humanize = (value) => (value ? String(value).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : '');

export const statusLabel = (value) => STATUS_LABELS[value] || humanize(value);
export const priorityLabel = (value) => PRIORITY_LABELS[value] || humanize(value);
export const roleLabel = (value) => ROLE_LABELS[value] || humanize(value);
