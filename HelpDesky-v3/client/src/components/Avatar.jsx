import React from 'react';

const Avatar = ({ name, size = 32 }) => {
  const getInitials = (n) => {
    if (!n) return '?';
    return n.split(' ').map(part => part[0]).join('').substring(0, 2).toUpperCase();
  };

  // Simple hash for consistent colors
  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  const bgColor = name ? stringToColor(name) : '#ccc';

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: bgColor,
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: size / 2.5
    }}>
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
