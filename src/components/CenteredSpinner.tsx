import { CSSProperties, useEffect, useState } from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';
import { classNames } from 'primereact/utils';

export function CenteredSpinner({ style, text }: { style?: CSSProperties; text?: string }) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 15000);
    return () => clearTimeout(timer);
  }, []);

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
      {!timedOut ?
        <>
          <ProgressSpinner />
          {text && <span>{text}...</span>}
        </>
      : <>
          <span
            className={classNames('pi pi-times-circle')}
            style={{ fontSize: 48, color: 'var(--color-danger)', marginBottom: 8 }}
            aria-label="Error"
          />
          <span>{text || 'loading'}</span>
          <span>timed out...</span>
        </>
      }
    </div>
  );
}
