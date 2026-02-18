import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, Gift, Settings, LogOut, Megaphone, BarChart3, Trophy,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Home", end: true },
  { to: "/admin/branches", icon: Building2, label: "Branches" },
  { to: "/admin/customers", icon: Users, label: "Customers" },
  { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-lg px-4 py-3 flex items-center justify-between">
        <Logo size="sm" />
        <button onClick={signOut} className="text-muted-foreground p-2" title="Sign out">
          <LogOut className="h-4 w-4" />
        </button>
      </header>
      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ to, icon: Icon, label, end }) => {
            const isActive = end ? location.pathname === to : location.pathname.startsWith(to + "/") || location.pathname === to;
            return (
              <NavLink key={to} to={to} className="flex flex-col items-center gap-0.5 px-3 py-1">
                <Icon className={`h-5 w-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
