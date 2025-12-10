import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmailPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<{ error?: string }>;
  sendMagicLink: (email: string) => Promise<{ error?: string }>;
  signInWithProvider: (provider: "google" | "apple") => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[Auth] getSession error", error);
        }
        if (!ignore) {
          setSession(data.session ?? null);
          setUser(data.session?.user ?? null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmailPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("[Auth] signIn error", error);
      return { error: error.message };
    }
    return {};
  };

  const signUpWithEmailPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error("[Auth] signUp error", error);
      return { error: error.message };
    }
    return {};
  };

  const sendMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      console.error("[Auth] magic link error", error);
      return { error: error.message };
    }
    return {};
  };

  const signInWithProvider = async (provider: "google" | "apple") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      console.error("[Auth] provider sign-in error", error);
      return { error: error.message };
    }
    return {};
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("[Auth] signOut error", error);
  };

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    sendMagicLink,
    signInWithProvider,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};

