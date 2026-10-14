import React from 'react';

const getInitials = (name) => {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((part) => part[0]).join('').substring(0, 2).toUpperCase();
};

// Apple contacts style: one grey gradient circle with white initials (5:1 contrast at the lighter end).
const Avatar = ({ name, size = 32 }) => (
  <div
    className="avatar"
    aria-hidden="true"
    style={{
      width: size,
      height: size,
      fontSize: Math.round(size / 2.6)
    }}
  >
    {getInitials(name)}
  </div>
);

export default Avatar;
