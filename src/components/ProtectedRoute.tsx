import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * ProtectedRoute — wraps admin routes that require an active Supabase session.
 */
export default function ProtectedRoute() {
  const [status, setStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");

  useEffect(() => {
    // 1. Primary check: Pacific Backend JWT token
    const token = localStorage.getItem("pacific_access_token");
    if (token) {
      setStatus("authenticated");
      return;
    }

    // 2. Fallback check: Supabase Auth session
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data }) => {
        setStatus(data.session ? "authenticated" : "unauthenticated");
      }).catch(() => {
        setStatus("unauthenticated");
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!localStorage.getItem("pacific_access_token")) {
          setStatus(session ? "authenticated" : "unauthenticated");
        }
      });

      return () => listener.subscription.unsubscribe();
    } else {
      setStatus("unauthenticated");
    }
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-[#030213] flex items-center justify-center">
        <div className="animate-pulse text-white text-lg">Checking session…</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  // Authenticated — render the child admin route.
  return <Outlet />;
}
