"use client";

import { Menu } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useSession } from "next-auth/react";

export default function Header({
  onMenuClick,
  title = "Dashboard",
  subtitle = "",
  children,
}) {
  const { data: session } = useSession();
  const role = session?.user?.role || "admin";

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/80 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden transition"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {children}
        <NotificationBell role={role} />
      </div>
    </header>
  );
}
