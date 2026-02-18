import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, ShoppingBag, FileText, Wallet, Menu, X, LogOut, PlusCircle, Tag } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/branch", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/branch/customers", icon: Users, label: "Customers" },
  { to: "/branch/purchase/new", icon: ShoppingBag, label: "New Purchase" },
  { to: "/branch/purchases", icon: FileText, label: "Purchases" },
  { to: "/branch/wallet", icon: Wallet, label: "Wallet" },
  { to: "/branch/offers", icon: Tag, label: "Offers" },
];

const bottomNavItems = [
  { to: "/branch", icon: LayoutDashboard, label: "Home", end: true },
  { to: "/branch/customers", icon: Users, label: "Customers" },
  { to: "/branch/purchase/new", icon: PlusCircle, label: "Add Sale" },
  { to: "/branch/offers", icon: Tag, label: "Offers" },
  { to: "/branch/wallet", icon: Wallet, label: "Wallet" },
];

export default function BranchLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top header */}
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
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">{children}</main>

      {/* Bottom nav - mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom md:hidden">
        <div className="flex items-center justify-around py-2">
          {bottomNavItems.map(({ to, icon: Icon, label, end }) => {
            const isActive = end
              ? location.pathname === to
              : location.pathname.startsWith(to) && to !== "/branch";
            const isAddSale = to === "/branch/purchase/new";
            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center gap-0.5 px-2 py-1"
              >
                {isAddSale ? (
                  <div className="rounded-full bg-primary p-2 -mt-4 shadow-lg">
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                ) : (
                  <Icon
                    className={`h-5 w-5 transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                )}
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive || isAddSale ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
