import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
// @ts-ignore
import logo from "@/image/logo/logo.webp";

/**
 * Admin login gate — uses Supabase email/password auth.
 */
export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  // Check for existing session
  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/admin/dashboard");
      }
      setChecking(false);
    }
    check();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
    } else {
      navigate("/admin/dashboard");
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#030213] flex items-center justify-center">
        <div className="animate-pulse text-white text-lg">Checking session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030213] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10 flex flex-col items-center">
          <img 
            src={logo} 
            alt="Pacific Products & Solutions" 
            className="h-20 w-auto object-contain mb-2 rounded-full bg-white/5 p-2"
          />
          <p className="text-xs tracking-wider text-gray-400">
            ADMIN PANEL
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-2">Sign In</h2>
          <p className="text-gray-400 text-sm mb-6">
            Enter your credentials to access the admin panel
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706] transition-colors"
                placeholder="admin@pacific.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] focus:ring-1 focus:ring-[#7FB706] transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#7FB706] text-white font-semibold rounded-xl hover:bg-[#6fa005] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Create an admin user in your Supabase Authentication dashboard
        </p>
      </div>
    </div>
  );
}
