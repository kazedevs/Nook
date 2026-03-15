import React from "react";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div
      className="flex h-screen"
      style={{ background: "#0A0A0A", color: "#E8E6E1" }}
    >
      <Sidebar />
      <main
        className="flex-1 overflow-auto p-5"
        style={{ background: "#0A0A0A", marginLeft: "188px" }}
      >
        {children}
      </main>
    </div>
  );
}
