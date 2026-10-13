import React from 'react';

// Wash-and-ink pairs from the status palette, so initials always meet contrast.
const AVATAR_TONES = [
  { background: '#deebff', color: '#0747a6' },
  { background: '#eae6ff', color: '#403294' },
  { background: '#e3fcef', color: '#006644' },
  { background: '#fffae6', color: '#974f0c' },
  { background: '#ffebe6', color: '#bf2600' },
  { background: '#ebecf0', color: '#42526e' }
];

const getInitials = (name) => {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((part) => part[0]).join('').substring(0, 2).toUpperCase();
};

const toneFor = (name) => {
  if (!name) return AVATAR_TONES[AVATAR_TONES.length - 1];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
};

const Avatar = ({ name, size = 32 }) => (
  <div
    aria-hidden="true"
    style={{
      ...toneFor(name),
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: Math.round(size / 2.6)
    }}
  >
    {getInitials(name)}
  </div>
);

export default Avatar;
