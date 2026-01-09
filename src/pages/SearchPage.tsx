import React, { useEffect, useState } from 'react';
import ModelGallery from './ModelGallery';
import { InputText } from 'primereact/inputtext';
import { InputIcon } from 'primereact/inputicon';
import { IconField } from 'primereact/iconfield';

export default function SearchPage() {
  const [query, setQuery] = useState<string | undefined>(undefined);
  useEffect(() => {
    const onQueryChange = () => {
      const hash = window.location.hash;
      const q = new URLSearchParams(hash.substring(hash.indexOf('?') + 1)).get('q');
      if (!q) return;
      setQuery(q);
    };
    window.addEventListener('hashchange', onQueryChange);
    return () => window.removeEventListener('hashchange', onQueryChange);
  }, [window.location.hash]);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <IconField iconPosition="left" className="show-on-very-small" style={{ width: '100%' }}>
        <InputIcon className="pi pi-search"> </InputIcon>
        <InputText
          style={{ width: '100%' }}
          placeholder="Search"
          tooltipOptions={{ position: 'bottom' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              window.location.href = `#/search?q=${encodeURIComponent(e.currentTarget.value)}`;
            }
          }}
        />
      </IconField>
      {query ?
        <ModelGallery filter={{ searchTerm: query }} />
      : <h3>No query provided</h3>}
    </div>
  );
}
