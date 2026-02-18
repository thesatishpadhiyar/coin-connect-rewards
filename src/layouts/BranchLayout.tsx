import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, ShoppingBag, FileText, Menu, X, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/branch", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/branch/customers", icon: Users, label: "Customers" },
  { to: "/branch/purchase/new", icon: ShoppingBag, label: "New Purchase" },
  { to: "/branch/purchases", icon: FileText, label: "Purchases" },
];

export default function BranchLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mt-3 flex flex-col gap-1 md:hidden animate-fade-in">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
