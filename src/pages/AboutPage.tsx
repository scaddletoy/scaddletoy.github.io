import React from 'react';
import about from '../../README.md';
import LazyMarkdown from '../components/LazyMarkdown.tsx';
declare const VITE_COMMIT_HASH: string;
declare const VITE_BUILD_DATE: string;

export default function AboutPage() {
  const commitLink =
    'https://github.com/scaddletoy/scaddletoy.github.io/commit/' + VITE_COMMIT_HASH;
  return (
    <div className={'page'}>
      <LazyMarkdown content={about} />
      <hr />
      <p>
        This version of the website was built on {VITE_BUILD_DATE} using{' '}
        <a href={commitLink} target="_blank" rel="noopener noreferrer">
          {commitLink}
        </a>
      </p>
    </div>
  );
}
