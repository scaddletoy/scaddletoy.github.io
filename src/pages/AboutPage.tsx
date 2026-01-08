import React from 'react';
import about from '../../README.md';
import LazyMarkdown from '../components/LazyMarkdown.tsx';

export default function AboutPage() {
  return (
    <div className={'page'}>
      <LazyMarkdown content={about} />
    </div>
  );
}
