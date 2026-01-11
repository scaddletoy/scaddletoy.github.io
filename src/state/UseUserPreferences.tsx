import { createContext, useContext } from 'react';
import { UserPreferencesContextType } from './UserPreferences.tsx';

export const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(
  undefined,
);

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  return [ctx.prefs, ctx.setPrefs] as const;
}
