import { Menubar } from 'primereact/menubar';
import { lazy, Suspense, useEffect } from 'react';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { MenuItem } from 'primereact/menuitem';
import { useUserContext } from '../state/UseUserContext.tsx';
import { useUserPreferences } from '../state/UseUserPreferences.tsx';

const LazyWorkerPoolOverview = lazy(() => import('./WorkerPoolOverview.tsx'));

export function Navbar() {
  const { user, username, login, logout } = useUserContext();
  const [userPrefs, setUserPrefs] = useUserPreferences();

  useEffect(() => {
    const hash = window.location.hash;
    let debugParam: string | null = null;
    if (hash.includes('?')) {
      const queryString = hash.substring(hash.indexOf('?') + 1);
      const params = new URLSearchParams(queryString);
      debugParam = params.get('debug');
    }
    if (debugParam === 'true' && !userPrefs.debugMode) {
      setUserPrefs({ ...userPrefs, debugMode: true });
    } else if (debugParam === 'false' && userPrefs.debugMode) {
      setUserPrefs({ ...userPrefs, debugMode: false });
    }
  }, [setUserPrefs, userPrefs, window.location.hash]);

  const start = (
    <a href="#/" className="logo" style={{ fontSize: 24, paddingRight: 12 }}>
      ScaddleToy
    </a>
  );

  const debugItems: MenuItem[] = [
    {
      label: 'ZenFS',
      command: () => {
        window.location.href = '#/zenfs';
      },
    },
    {
      label: 'Workerpool',
      template: () => (
        <Suspense fallback={<span style={{ padding: 8 }}>Loading...</span>}>
          <LazyWorkerPoolOverview />
        </Suspense>
      ),
    },
  ];
  const items: MenuItem[] = [
    { label: 'Libraries', url: '#/libraries' },
    {
      label: 'Start Coding',
      command: () => {
        window.location.href = '#/model/new';
        window.location.reload();
      },
    },
    ...(userPrefs.debugMode ? debugItems : []),
  ];
  const end = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <IconField className="hide-on-very-small" iconPosition="left">
        <InputIcon className="pi pi-search"> </InputIcon>
        <InputText
          style={{ background: 'transparent', paddingTop: 8, paddingBottom: 8, border: 'none' }}
          placeholder="Search"
          // tooltip="Searches model title, description and username" tooltipOptions={{position: 'bottom'}}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              window.location.href = `#/search?q=${encodeURIComponent(e.currentTarget.value)}`;
            }
          }}
        />
      </IconField>
      <a
        className="show-on-very-small p-button p-button-icon-only p-button-outlined"
        href={`#/search`}
      >
        <i className="pi pi-search"></i>
      </a>
      {user ?
        <>
          <a
            className="hide-on-very-small p-button p-button-text button-smaller-padding"
            href={`#/user/${username}`}
          >
            {username}
          </a>
          <a
            className="hide-on-very-small p-button p-button-text button-smaller-padding"
            href="#"
            onClick={logout}
          >
            Logout
          </a>
          <a
            className="show-on-very-small p-button p-button-icon-only p-button-outlined"
            href={`#/user/${username}`}
          >
            <i className="pi pi-user"></i>
          </a>
          <a
            className="show-on-very-small p-button p-button-icon-only p-button-outlined"
            onClick={logout}
          >
            <i className="pi pi-sign-out"></i>
          </a>
        </>
      : <>
          <a
            className="hide-on-very-small p-button p-button-outlined button-smaller-padding"
            href="#"
            onClick={login}
          >
            <i className="pi pi-github" style={{ marginRight: 4 }}></i>Login with GitHub
          </a>
          <a
            className="show-on-very-small p-button p-button-icon-only p-button-outlined"
            href="#"
            onClick={login}
            style={{ width: 'auto' }}
          >
            <i className="pi pi-sign-in" style={{ marginRight: 4 }}></i>
            <i className="pi pi-github"></i>
          </a>
        </>
      }
    </div>
  );

  return (
    <Menubar
      className="maxw"
      model={items}
      start={start}
      end={end}
      style={{
        border: 'none',
        background: '#000',
        paddingTop: 8,
        paddingBottom: 8,
      }}
    />
  );
}
