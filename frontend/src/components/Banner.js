import React from 'react';

export default function Banner({ banners }) {
  return (
    <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', margin: '10px 0' }}>
      {banners.map((b, i) => (
        <div
          key={i}
          style={{
            minWidth: '300px',
            height: '150px',
            background: `url(${b.img}) center/cover`,
            borderRadius: '10px',
          }}
        >
          <h3 style={{ color: '#fff', padding: '10px', background: 'rgba(0,0,0,0.4)' }}>
            {b.title}
          </h3>
        </div>
      ))}
    </div>
  );
}
