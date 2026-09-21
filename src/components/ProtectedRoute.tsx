import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * ProtectedRoute — wraps admin routes that require an active Supabase session.
 */
export default function ProtectedRoute() {
  const [status, setStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStatus("unauthenticated");
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "authenticated" : "unauthenticated");
    });

    // Keep the guard reactive to sign-out/sign-in events from other tabs.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "authenticated" : "unauthenticated");
    });

    return () => listener.subscription.unsubscribe();
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
