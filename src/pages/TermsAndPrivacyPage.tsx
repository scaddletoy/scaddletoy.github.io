import React from 'react';
import privacy from '../../PRIVACY.md';
import licenses from '../../LICENSE.md';
import LazyMarkdown from '../components/LazyMarkdown.tsx';

export default function TermsAndPrivacyPage() {
  return (
    <div className={'page'}>
      <LazyMarkdown content={privacy} />
      <LazyMarkdown content={licenses} />
    </div>
  );
}
