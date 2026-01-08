import { CSSProperties } from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';

export function CenteredSpinner({ style, text }: { style?: CSSProperties; text?: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <ProgressSpinner />
      {text && <p>{text}...</p>}
    </div>
  );
}
