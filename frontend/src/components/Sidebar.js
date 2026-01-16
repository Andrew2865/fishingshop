import React from 'react';

export default function Sidebar({ categories }) {
  return (
    <aside style={{ width:'200px', padding:'10px', borderRight:'1px solid #ccc' }}>
      <h3>Kategorie</h3>
      <ul style={{ listStyle:'none', padding:0 }}>
        {categories.map(cat => (
          <li key={cat.id} style={{ padding:'5px 0', cursor:'pointer' }}>{cat.name}</li>
        ))}
      </ul>
    </aside>
  );
}
