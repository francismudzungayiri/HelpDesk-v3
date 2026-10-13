// Turns an API failure into a message that says what actually went wrong.
export const errorMessage = (err, fallback) => {
  if (err && !err.response) {
    return "Can't reach the HelpDesky server. Check your connection, or ask IT if it's down.";
  }
  const data = err?.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length > 0) return data.errors.join(' ');
  return data?.message || fallback;
};
