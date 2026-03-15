import { Link, useLocation } from "react-router-dom";
import { Search, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/utils/cn";

export function Sidebar() {
  const location = useLocation();

  const navigation = [
    {
      name: "dashboard",
      href: "/",
      icon: <LayoutDashboard className="w-3.5 h-3.5" strokeWidth={1.6} />,
    },
    {
      name: "scanner",
      href: "/scanner",
      icon: <Search className="w-3.5 h-3.5" strokeWidth={1.6} />,
    },
    {
      name: "settings",
      href: "/settings",
      icon: <Settings className="w-3.5 h-3.5" strokeWidth={1.6} />,
    },
  ];

  return (
    <aside
      className="w-[188px] flex flex-col py-[18px] px-2.5 flex-shrink-0 fixed left-0 top-0 h-screen"
      style={{ background: "#0F0F0F", borderRight: "0.5px solid #1E1E1E" }}
    >
      <div className="flex items-center gap-2.5 px-2 mb-7">
        <div
          className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center flex-shrink-0"
          style={{ border: "0.5px solid #2A2A2A" }}
        >
          <img src="/nook.jpg" alt="nook" className="w-full h-full rounded-[6px] scale-130" />
        </div>
        <div>
          <p
            className="text-[13px] font-medium leading-none"
            style={{
              color: "#E8E6E1",
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "-0.01em",
            }}
          >
            nook
          </p>
          <p
            className="mt-0.5"
            style={{
              fontSize: 9,
              color: "#444",
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            disk analyzer
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-px">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-2 px-[9px] py-[7px] rounded-[6px] text-[11px] transition-all",
                "font-mono tracking-wide",
              )}
              style={{
                background: isActive ? "#161616" : "transparent",
                color: isActive ? "#E8E6E1" : "#555",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {item.icon}
              {item.name}
              {isActive && (
                <span
                  className="ml-auto w-1 h-1 rounded-full"
                  style={{ background: "#444" }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
