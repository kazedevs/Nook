import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/utils/cn";
import { HedgehogIcon } from "@/components/Hedgehog";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    { name: "Scanner", href: "/scanner", icon: <Search className="w-4 h-4" /> },
    {
      name: "Settings",
      href: "/settings",
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex h-screen bg-secondary-50">
      <aside className="w-52 bg-white border-r border-secondary-100 flex flex-col py-5 px-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <HedgehogIcon />
          <div>
            <p className="text-sm font-medium text-secondary-900 leading-none">
              Nook
            </p>
            <p className="text-[10px] text-secondary-400 mt-0.5">
              Disk analyzer
            </p>
          </div>
        </div>

        <nav className="space-y-0.5">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors",
                  isActive
                    ? "bg-secondary-100 text-secondary-900 font-medium"
                    : "text-secondary-500 hover:bg-secondary-50 hover:text-secondary-700",
                )}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
