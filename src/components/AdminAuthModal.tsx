import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  X,
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  ChefHat,
  ArrowRight,
  Database,
  HelpCircle,
  Sparkles,
  Terminal,
  AlertTriangle
} from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStudentAuth?: () => void;
  onSuccess?: () => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onOpenStudentAuth,
  onSuccess,
}) => {
  const { loginAsAdmin, isSupabaseConfigured, user, role, logout } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terminalPin, setTerminalPin] = useState('2026');
  const [station, setStation] = useState<'kitchen' | 'counter1' | 'manager'>('manager');
  const [showPassword, setShowPassword] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFillDemoAdmin = () => {
    setEmail('suresh.manager@campusbite.edu');
    setPassword('admin123');
    setTerminalPin('2026');
    setStation('manager');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginAsAdmin(email, password);

      if (!res.success) {
        setError(res.error || 'Authentication failed. Please verify staff credentials.');
      } else {
        const staffName = res.user?.full_name || 'Canteen Staff';
        showToast({
          type: 'info',
          title: 'Staff Terminal Activated',
          message: `Welcome, ${staffName}! Terminal connected to ${
            station === 'kitchen'
              ? 'Kitchen Dispatch (Counter #2)'
              : station === 'counter1'
              ? 'Counter #1 Billing'
              : 'Management Operations'
          }.`,
        });

        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate administrative session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Frosted dark backdrop for security context */}
      <div
        className="fixed inset-0 bg-stone-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top security header bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand & Security Header */}
        <div className="flex items-start gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center shadow-lg shadow-stone-900/10 shrink-0 border border-stone-800">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3 h-3 text-amber-600" />
              <span>Canteen Staff Portal · PIT Operations</span>
            </div>
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight leading-tight">
              Staff & Operations Login
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Kitchen order dispatch, live token management, and menu control.
            </p>
          </div>
        </div>

        {/* Active Session Warning if logged in as student */}
        {user && role === 'student' && (
          <div className="p-3 mb-5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Student Session Detected</p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                You are currently signed in as <strong>{user.full_name}</strong> (student). Authenticating here will switch your active session to staff permissions.
              </p>
            </div>
          </div>
        )}

        {/* Quick Demo Staff Autofill Card */}
        <div className="p-3 mb-5 rounded-2xl bg-stone-50 border border-stone-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900 leading-tight">Staff Demo Account</p>
              <p className="text-[11px] text-stone-500">Chef Suresh (Canteen Manager)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFillDemoAdmin}
            className="w-full sm:w-auto px-3 py-1.5 bg-stone-900 hover:bg-orange-600 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-2xs whitespace-nowrap"
          >
            Fill Demo Credentials
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 mb-5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Authentication Refused</p>
              <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Admin Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Station Selection */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1.5">
              Assigned Staff Terminal / Station
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStation('manager')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                  station === 'manager'
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                Manager Desk
              </button>
              <button
                type="button"
                onClick={() => setStation('kitchen')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                  station === 'kitchen'
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                Kitchen (Counter #2)
              </button>
              <button
                type="button"
                onClick={() => setStation('counter1')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                  station === 'counter1'
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                Cashier (Counter #1)
              </button>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1.5">
              Staff Official Email <span className="text-orange-600">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="suresh.manager@campusbite.edu"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-stone-900 shadow-2xs font-mono"
              />
            </div>
          </div>

          {/* Password & Security PIN in responsive row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1.5">
                Staff Password <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-stone-900 shadow-2xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1.5">
                Terminal Security PIN
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  maxLength={6}
                  value={terminalPin}
                  onChange={(e) => setTerminalPin(e.target.value)}
                  placeholder="2026"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-xs text-stone-900 shadow-2xs font-mono tracking-widest"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-stone-900 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-stone-900/10 hover:shadow-orange-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-98 mt-3"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying Staff Credentials...</span>
              </span>
            ) : (
              <>
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Authorize & Open Canteen Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Supabase PostgreSQL Role Info Accordion */}
        <div className="mt-5 pt-4 border-t border-stone-200/80">
          <button
            type="button"
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-stone-400" />
              <span>How are staff roles granted in Supabase?</span>
            </span>
            <span className="text-stone-400">{showSqlGuide ? 'Hide' : 'Show SQL'}</span>
          </button>

          {showSqlGuide && (
            <div className="mt-2.5 p-3 rounded-xl bg-stone-900 text-stone-200 text-[11px] font-mono leading-relaxed space-y-1.5 animate-in fade-in duration-150">
              <p className="text-stone-400 text-[10px]">
                By design, staff accounts cannot be self-registered. In Supabase PostgreSQL, grant admin rights using:
              </p>
              <div className="p-2 rounded bg-stone-950 text-amber-300 overflow-x-auto">
                <code>UPDATE profiles SET role = 'admin' WHERE email = 'staff@pit.ac.in';</code>
              </div>
              <p className="text-stone-400 text-[10px]">
                This updates Row Level Security (RLS) policies allowing kitchen order mutations.
              </p>
            </div>
          )}
        </div>

        {/* Switch to Student Login */}
        <div className="mt-4 pt-3 text-center border-t border-stone-100">
          <p className="text-xs text-stone-500">
            Student ordering meals?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenStudentAuth?.();
              }}
              className="font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
            >
              Switch to Student Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
