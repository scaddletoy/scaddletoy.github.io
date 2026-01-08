// LazyMarkdown.tsx
import { lazy, Suspense } from 'react';
import { CenteredSpinner } from './CenteredSpinner.tsx';

const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'));

export default function LazyMarkdown(props: { content: string }) {
  return (
    <Suspense fallback={<CenteredSpinner text="Rendering markdown" />}>
      <MarkdownRenderer {...props} />
    </Suspense>
  );
}
