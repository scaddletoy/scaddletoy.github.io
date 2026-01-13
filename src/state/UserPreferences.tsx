import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { UserPreferencesContext } from './UseUserPreferences.tsx';

export interface UserPrefs {
  debugMode: boolean;
  autoPreview: boolean;
  commentsPanelExpanded: boolean;
  logsPanelExpanded: boolean;
  customizerPanelExpanded: boolean;
}

function getDefaultUserPrefs(): UserPrefs {
  return {
    debugMode: false,
    autoPreview: true,
    commentsPanelExpanded: true,
    logsPanelExpanded: false,
    customizerPanelExpanded: true,
  };
}

export interface UserPreferencesContextType {
  prefs: UserPrefs;
  setPrefs: (update: Partial<UserPrefs> | ((prev: UserPrefs) => Partial<UserPrefs>)) => void;
}

function loadUserPrefs(): UserPrefs {
  const raw = localStorage.getItem('userPreferences');
  if (raw) {
    try {
      return { ...getDefaultUserPrefs(), ...JSON.parse(raw) };
    } catch {}
  }
  return getDefaultUserPrefs();
}

function saveUserPrefs(prefs: UserPrefs) {
  localStorage.setItem('userPreferences', JSON.stringify(prefs));
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  // Load from localStorage or use defaults
  const [prefs, setPrefsState] = useState<UserPrefs>(() => loadUserPrefs());

  // Save to localStorage whenever prefs change
  useEffect(() => {
    saveUserPrefs(prefs);
  }, [prefs]);

  // Update state (and thus localStorage)
  const setPrefs = useCallback(
    (update: Partial<UserPrefs> | ((prev: UserPrefs) => Partial<UserPrefs>)) => {
      setPrefsState((prev) => {
        const updates = typeof update === 'function' ? update(prev) : update;
        return { ...prev, ...updates };
      });
    },
    [],
  );

  return (
    <UserPreferencesContext.Provider value={{ prefs, setPrefs }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}
