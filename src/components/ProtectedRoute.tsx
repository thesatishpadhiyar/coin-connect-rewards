import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

type AppRole = "superadmin" | "branch" | "customer";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && !allowedRoles.includes(role)) {
    if (role === "superadmin") return <Navigate to="/admin" replace />;
    if (role === "branch") return <Navigate to="/branch" replace />;
    if (role === "customer") return <Navigate to="/app" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
