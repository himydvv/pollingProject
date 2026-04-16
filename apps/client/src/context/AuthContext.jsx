import { createContext, useContext, useEffect, useState } from "react";

import { supabase } from "../lib/supabase.js";

const AuthContext = createContext(null);

async function ensureAnonymousSession() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (session?.access_token) {
    return session;
  }

  const { error: signInError } = await supabase.auth.signInAnonymously();

  if (signInError) {
    throw signInError;
  }

  const {
    data: { session: nextSession },
    error: refreshedError
  } = await supabase.auth.getSession();

  if (refreshedError) {
    throw refreshedError;
  }

  if (!nextSession?.access_token) {
    throw new Error("Anonymous session was not created successfully.");
  }

  return nextSession;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      try {
        const activeSession = await ensureAnonymousSession();

        if (!isMounted) {
          return;
        }

        setSession(activeSession);
        setUser(activeSession.user ?? null);
        setAuthError("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAuthError(error.message || "Unable to start an anonymous session.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrapAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setAuthError("");
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function getAccessToken() {
    const activeSession = await ensureAnonymousSession();
    return activeSession.access_token;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        authError,
        getAccessToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
