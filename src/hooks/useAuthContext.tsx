import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * User profile interface matching our database schema
 */
export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'admin' | 'staff' | 'user';  // ✅ staff added
  created_at: string;
  updated_at: string;

  // Address fields
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
}

/**
 * Authentication context interface
 */
interface AuthContextType {
  // Auth state
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  
  // Loading states
  loading: boolean;
  profileLoading: boolean;
  
  // Computed properties
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;   // ✅ added
  isUser: boolean;
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string, phone?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  
  // Utility methods
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * useAuth() Hook
 * MUST be inside AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider
 * Handles session, profile, auth state, and exposes helpers.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Base state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  /**
   * Fetch user profile from DB
   */
  const fetchProfile = async (userId: string): Promise<void> => {
    try {
      setProfileLoading(true);
      console.log('Fetching profile for user:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        return;
      }

      console.log('Profile fetched:', data);
      setProfile(data as UserProfile);
    } catch (error) {
      console.error('Exception fetching profile:', error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Manual refresh
   */
  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };
  /**
   * Initialize Authentication System
   * Listens for auth changes & loads initial session
   */
  useEffect(() => {
    let mounted = true;
    console.log("🔧 Initializing authentication system");

    /**
     * Handler for auth state changes
     */
    const handleAuthChange = async (event: string, session: Session | null) => {
      if (!mounted) return;

      console.log("🔄 Auth state changed:", event, session?.user?.email || "No user");

      // Set session and user immediately
      setSession(session);
      setUser(session?.user ?? null);

      // Profile fetch occurs async
      if (session?.user) {
        setTimeout(() => {
          if (mounted) fetchProfile(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }

      setLoading(false);
    };

    // Listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Load initial session
    const initialize = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("❌ Error getting initial session:", error);
          setLoading(false);
          return;
        }

        console.log("🚀 Initial session:", session?.user?.email || "No session");
        await handleAuthChange("INITIAL_SESSION", session);
      } catch (err) {
        console.error("💥 Exception initializing auth:", err);
        if (mounted) setLoading(false);
      }
    };

    initialize();

    // Cleanup listener
    return () => {
      console.log("🧹 Cleaning up auth listener");
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign In
   */
  const signIn = async (email: string, password: string) => {
    try {
      console.log("🔑 Signing in:", email);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Sign in error:", error);
        return { error };
      }

      console.log("✅ Sign in successful");
      return { error: null };
    } catch (error) {
      console.error("💥 Sign in exception:", error);
      return { error };
    }
  };

  /**
   * Sign Up
   */
  const signUp = async (email: string, password: string, fullName?: string, phone?: string) => {
    try {
      console.log("📝 Signing up:", email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName || "",
            phone: phone || "",
          }
        }
      });

      if (error) {
        console.error("❌ Sign up error:", error);
        return { error };
      }

      console.log("✅ Signup complete. Email verification required.");
      return { error: null };

    } catch (error) {
      console.error("💥 Sign up exception:", error);
      return { error };
    }
  };

  /**
   * Sign Out
   */
  const signOut = async () => {
    try {
      console.log("🚪 Signing out");

      const { error } = await supabase.auth.signOut();
      if (error) console.error("❌ Sign out error:", error);

      setUser(null);
      setSession(null);
      setProfile(null);
      setLoading(false);
      setProfileLoading(false);

      if (typeof window !== "undefined") {
        window.location.href = "/";
      }

    } catch (error) {
      console.error("💥 Sign out exception:", error);
    }
  };

  /**
   * Computed properties
   */
  const isAuthenticated = !!user && !!session;
  const isAdmin = profile?.role === "admin";
  const isStaff = profile?.role === "staff";   // ✅ ADDED
  const isUser = profile?.role === "user";
  /**
   * Auth context value
   */
  const value: AuthContextType = {
    // State
    user,
    session,
    profile,
    loading,
    profileLoading,

    // Computed
    isAuthenticated,
    isAdmin,
    isStaff,   // ✅ included
    isUser,

    // Methods
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
