import React from 'react';
import about from '../../README.md';
import LazyMarkdown from '../components/LazyMarkdown.tsx';
import { __BUILD_DATE__, __COMMIT_HASH__ } from '../vars.ts';

export default function AboutPage() {
  const commitLink = 'https://github.com/scaddletoy/scaddletoy.github.io/commit/' + __COMMIT_HASH__;
  return (
    <div className={'page'}>
      <LazyMarkdown content={about} />
      <hr />
      <p>
        This version of the website was built on {__BUILD_DATE__} using{' '}
        <a href={commitLink} target="_blank" rel="noopener noreferrer">
          {commitLink}
        </a>
      </p>
    </div>
  );
}
