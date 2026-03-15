import React from "react"
import { Sidebar } from "@/components/Sidebar"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0A0A0A" }}>
      <Sidebar />

      {/* Offset for fixed sidebar */}
      <div className="flex flex-col flex-1 min-w-0" style={{ marginLeft: 188 }}>
        {/* Drag strip across top of main area — matches sidebar traffic light height */}
        <div style={{ height: 52, flexShrink: 0 }} data-tauri-drag-region />

        <main className="flex-1 overflow-auto" style={{ padding: "0 20px 20px" }}>
          {children}
        </main>
      </div>
    </div>
  )
}