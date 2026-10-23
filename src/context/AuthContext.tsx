import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, UserRole } from '../types';
import { getSupabaseClient, getSupabaseCredentials } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
  message?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  role: UserRole;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<AuthResult>;
  signupWithEmail: (email: string, pass: string, fullName: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const STORAGE_KEY_LOCAL_USERS = 'campusbite_local_registered_users';
const STORAGE_KEY_LOCAL_SESSION = 'campusbite_local_active_session';

// Initial pre-configured accounts for offline / local testing before Supabase keys are pasted
const PRESET_LOCAL_USERS: Array<AuthUser & { password: string }> = [
  {
    id: 'std-rahul-01',
    email: 'rahul.student@campusbite.edu',
    full_name: 'Rahul Sharma',
    role: 'student',
    phone: '+91 98765 43210',
    password: 'password123',
  },
  {
    id: 'adm-suresh-01',
    email: 'suresh.manager@campusbite.edu',
    full_name: 'Chef Suresh (Canteen Manager)',
    role: 'admin',
    phone: '+91 99887 76655',
    password: 'admin123',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState<boolean>(false);

  // Helper to query profiles table in Supabase
  const loadUserProfile = async (userId: string, email: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        const authUser: AuthUser = {
          id: data.id,
          email,
          full_name: data.full_name || email.split('@')[0],
          role: (data.role as UserRole) || 'student',
          phone: data.phone || undefined,
        };
        setUser(authUser);
        setProfile(data as Profile);
        return authUser;
      } else if (!data) {
        // Fallback: create student profile if trigger hasn't finished yet
        const defaultName = email.split('@')[0];
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: defaultName,
            role: 'student',
          })
          .select()
          .maybeSingle();

        if (newProfile) {
          const authUser: AuthUser = {
            id: newProfile.id,
            email,
            full_name: newProfile.full_name,
            role: 'student',
          };
          setUser(authUser);
          setProfile(newProfile as Profile);
          return authUser;
        }
      }
    } catch (err) {
      console.warn('Profile load error:', err);
    }
    return null;
  };

  // Initialize auth session on mount
  const initAuth = async () => {
    setIsLoading(true);
    const { isConfigured } = getSupabaseCredentials();
    setIsSupabaseConfigured(isConfigured);

    const supabase = getSupabaseClient();
    if (supabase && isConfigured) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session?.user) {
          await loadUserProfile(session.user.id, session.user.email || '');
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.warn('Supabase getSession failed:', err);
        setUser(null);
      }
    } else {
      // In local offline fallback mode, restore active session from storage if present
      try {
        const savedSession = localStorage.getItem(STORAGE_KEY_LOCAL_SESSION);
        if (savedSession) {
          const parsed = JSON.parse(savedSession) as AuthUser;
          setUser(parsed);
          setProfile({
            id: parsed.id,
            full_name: parsed.full_name,
            role: parsed.role,
            phone: parsed.phone,
          });
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch {
        setUser(null);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initAuth();

    const handleConfigChange = () => {
      initAuth();
    };
    window.addEventListener('supabase_config_changed', handleConfigChange);

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          await loadUserProfile(session.user.id, session.user.email || '');
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
      });
      return () => {
        subscription.unsubscribe();
        window.removeEventListener('supabase_config_changed', handleConfigChange);
      };
    }

    return () => {
      window.removeEventListener('supabase_config_changed', handleConfigChange);
    };
  }, []);

  const loginWithEmail = async (emailInput: string, passInput: string): Promise<AuthResult> => {
    const email = emailInput.trim().toLowerCase();
    const password = passInput;

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          await loadUserProfile(data.user.id, data.user.email || email);
          return { success: true };
        }
        return { success: false, error: 'Sign in failed. Please check your credentials.' };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Login failed' };
      }
    }

    // Local / Offline fallback auth
    try {
      let registered: Array<AuthUser & { password: string }> = [];
      const stored = localStorage.getItem(STORAGE_KEY_LOCAL_USERS);
      if (stored) {
        registered = JSON.parse(stored);
      }
      const allUsers = [...registered, ...PRESET_LOCAL_USERS];
      const match = allUsers.find((u) => u.email.toLowerCase() === email);

      if (!match) {
        return { success: false, error: 'No account found with this email. Please sign up first.' };
      }

      if (match.password !== password) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }

      const sessionUser: AuthUser = {
        id: match.id,
        email: match.email,
        full_name: match.full_name,
        role: match.role,
        phone: match.phone,
      };

      setUser(sessionUser);
      setProfile({
        id: match.id,
        full_name: match.full_name,
        role: match.role,
        phone: match.phone,
      });

      localStorage.setItem(STORAGE_KEY_LOCAL_SESSION, JSON.stringify(sessionUser));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Local login error' };
    }
  };

  const signupWithEmail = async (emailInput: string, passInput: string, fullNameInput: string): Promise<AuthResult> => {
    const email = emailInput.trim().toLowerCase();
    const password = passInput;
    const fullName = fullNameInput.trim();

    if (!fullName) {
      return { success: false, error: 'Please enter your full name.' };
    }
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              // Always student! Database trigger on_auth_user_created also enforces role = 'student'
              role: 'student',
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.session?.user) {
          await loadUserProfile(data.session.user.id, data.session.user.email || email);
          return { success: true };
        } else if (data.user) {
          // Email confirmation is required by Supabase project settings
          return {
            success: true,
            message: 'Registration successful! If confirmation is enabled on your Supabase project, check your email to activate.',
          };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Registration failed' };
      }
    }

    // Local / Offline fallback registration
    try {
      let registered: Array<AuthUser & { password: string }> = [];
      const stored = localStorage.getItem(STORAGE_KEY_LOCAL_USERS);
      if (stored) {
        registered = JSON.parse(stored);
      }
      const allUsers = [...registered, ...PRESET_LOCAL_USERS];
      const existing = allUsers.find((u) => u.email.toLowerCase() === email);

      if (existing) {
        return { success: false, error: 'An account with this email already exists. Please sign in.' };
      }

      // Security: New registrations MUST always receive 'student' role.
      const newStudentUser: AuthUser & { password: string } = {
        id: 'std-' + Date.now(),
        email,
        full_name: fullName,
        role: 'student',
        password,
      };

      registered.push(newStudentUser);
      localStorage.setItem(STORAGE_KEY_LOCAL_USERS, JSON.stringify(registered));

      const sessionUser: AuthUser = {
        id: newStudentUser.id,
        email: newStudentUser.email,
        full_name: newStudentUser.full_name,
        role: 'student',
      };

      setUser(sessionUser);
      setProfile({
        id: newStudentUser.id,
        full_name: newStudentUser.full_name,
        role: 'student',
      });
      localStorage.setItem(STORAGE_KEY_LOCAL_SESSION, JSON.stringify(sessionUser));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Local registration error' };
    }
  };

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out error:', err);
      }
    }
    localStorage.removeItem(STORAGE_KEY_LOCAL_SESSION);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id, user.email);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: user?.role || 'student',
        isLoading,
        isSupabaseConfigured,
        loginWithEmail,
        signupWithEmail,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
