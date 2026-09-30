import { Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { canRoleAccessPath, getRoleBadgeInfo } from "../utils/rbacNavigation";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

/**
 * ProtectedRoute — wraps admin routes requiring an active authenticated session
 * and verifies role-based access control (RBAC).
 */
export default function ProtectedRoute() {
  const { user, isLoading, isAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030213] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#7FB706] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium animate-pulse">Verifying secure session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check RBAC permission for current route
  const hasAccess = canRoleAccessPath(user.role, location.pathname);

  if (!hasAccess) {
    const roleInfo = getRoleBadgeInfo(user.role);
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#07061d] border border-red-500/20 rounded-2xl p-6 lg:p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400 mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">403 — Access Restricted</h2>
          <p className="text-sm text-gray-400 mt-2">
            Your assigned role{" "}
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${roleInfo.badgeClass}`}>
              {roleInfo.name}
            </span>{" "}
            does not have authorization to view this module.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition border border-white/10 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#6fa005] text-[#030213] text-xs font-black transition shadow-lg shadow-[#7FB706]/20 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Return to Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated and authorized — render the child admin route
  return <Outlet />;
}
