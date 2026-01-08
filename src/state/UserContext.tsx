import React, { ReactNode, useEffect, useState } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { UserContext } from './UseUserContext.tsx';

export interface UserContextType {
  user: User | null;
  username: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  likedModelIds: Set<string>;
  commentedModelIds: Set<string>;
}

// Helper to dynamically import supabase client and cache it
let supabasePromise: Promise<SupabaseClient> | null = null;
async function getSupabase() {
  if (!supabasePromise) {
    supabasePromise = import('../services/SupabaseService.ts').then((mod) => mod.supabase);
  }
  return supabasePromise;
}

export function UserContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [likedModelIds, setLikedModelIds] = useState<Set<string>>(new Set());
  const [commentedModelIds, setCommentedModelIds] = useState<Set<string>>(new Set());

  const insertUser = async (user: User) => {
    const id = user.id;
    const userMeta = user.user_metadata || {};
    const username = userMeta.user_name || userMeta.name || user.email || null;
    const avatar_url = userMeta.avatar_url || null;
    if (!id) return;
    const supabase = await getSupabase();
    const existing = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('id', id);
    if ((existing.count ?? 0) === 0) {
      await supabase.from('users').insert({ id, username, avatar_url });
    }
  };

  const refresh = async (user?: User) => {
    const user_id = user?.id;
    if (!user_id) {
      setLikedModelIds(new Set());
      setCommentedModelIds(new Set());
      return;
    }
    if (likedModelIds.size > 0 || commentedModelIds.size > 0) {
      return; // Already loaded
    }
    const supabase = await getSupabase();
    const { data: likes } = await supabase
      .from('model_likes')
      .select('model_id')
      .eq('user_id', user_id);
    const { data: comments } = await supabase
      .from('model_comments')
      .select('model_id')
      .eq('user_id', user_id);
    setLikedModelIds(new Set(likes?.map((l) => l.model_id)));
    setCommentedModelIds(new Set(comments?.map((c) => c.model_id)));
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    getSupabase().then((supabase) => {
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        const fetchData = async () => {
          setUser(session?.user ?? null);
          setUsername(
            session?.user?.user_metadata?.user_name
              || session?.user?.user_metadata?.name
              || session?.user?.email
              || null,
          );
          if (session?.user) {
            if (_event === 'INITIAL_SESSION') {
              await insertUser(session.user);
            }
          }
          await refresh(session?.user);
        };
        fetchData();
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const login = async () => {
    console.log('Logging in with GitHub...');
    const supabase = await getSupabase();
    await supabase.auth.signInWithOAuth({ provider: 'github' });
  };

  const logout = async () => {
    console.log('Logging out...');
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    setUser(null);
    setUsername(null);
    setLikedModelIds(new Set());
    setCommentedModelIds(new Set());
  };

  return (
    <UserContext.Provider
      value={{ user, username, login, logout, likedModelIds, commentedModelIds }}
    >
      {children}
    </UserContext.Provider>
  );
}
