// The product's date style: "13 Oct 2026, 7:15 PM". No seconds.
const formatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

export const formatDateTime = (value) => (value ? formatter.format(new Date(value)) : '');
