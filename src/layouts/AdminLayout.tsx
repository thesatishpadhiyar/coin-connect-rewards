import { ReactNode, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Building2, Users, Gift, Settings, Menu, X, LogOut,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/branches", icon: Building2, label: "Branches" },
  { to: "/admin/customers", icon: Users, label: "Customers" },
  { to: "/admin/referrals", icon: Gift, label: "Referrals" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card p-4">
        <div className="mb-6"><Logo size="sm" /></div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </nav>
        <Button variant="ghost" onClick={signOut} className="justify-start gap-2 text-muted-foreground">
          <LogOut className="h-4 w-4" />Sign out
        </Button>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card p-4 animate-fade-in shadow-elevated">
            <div className="flex items-center justify-between mb-6">
              <Logo size="sm" />
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></Button>
            </div>
            <nav className="flex flex-col gap-1">
              {navItems.map(({ to, icon: Icon, label, end }) => (
                <NavLink key={to} to={to} end={end} onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`
                  }>
                  <Icon className="h-4 w-4" />{label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-lg px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
              <span className="text-sm font-medium text-muted-foreground lg:hidden">Admin Panel</span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="lg:hidden" title="Sign out"><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
