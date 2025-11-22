import { Link, useLocation } from "@remix-run/react";
import { User } from 'lucide-react';
import React from "react";

const navItems = [
  { to: "/profile", icon: User, label: "Profile" },
];

export function Layout({ children, title = "Agentic Research App" }) {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header (Top Nav) */}
      <nav className="border-b border-border bg-background shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">
                <Link to={`/`}>{title}</Link>
              </h1>
            </div>
            <div className="flex items-center">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`
                    flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${location.pathname.startsWith(item.to.replace(/\/:id.*$/, '')) ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}
                  `}
                >
                  <item.icon className="w-5 h-5 mr-2" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}