import React from 'react';
import ModelGallery from './ModelGallery';

export default function HomePage() {
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          margin: 60,
        }}
      >
        <h1 style={{ margin: 0, fontWeight: 800, letterSpacing: 2 }}>
          Explore Parametric 3D Creations
        </h1>
        <h2 style={{ margin: 0, maxWidth: 600, fontWeight: 400, textAlign: 'center' }}>
          <span style={{ color: 'var(--theme-color)', fontWeight: 600 }}>Design</span>,
          <span style={{ color: 'var(--theme-color)', fontWeight: 600 }}> code</span>, and
          <span style={{ color: 'var(--theme-color)', fontWeight: 600 }}> share</span> your own 3D
          models. Bring your ideas to life, one line at a time.
        </h2>

        <div style={{ display: 'flex', gap: 16 }}>
          <a
            href="/#/model/new"
            className="p-button p-button-success"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <span className="pi pi-code" />
            Start coding
          </a>
          <a
            href="/#/about"
            className="p-button p-button-info p-button-outlined"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <span className="pi pi-info-circle" />
            Learn more
          </a>
        </div>
      </div>
      <ModelGallery />
    </div>
  );
}
