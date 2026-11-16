"use client";

import { MdOutlineDashboard } from "react-icons/md";
import { Calendar, FileText, Pill, FlaskConical, Bed, X, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from "next/navigation";
import { useSession, signOut } from 'next-auth/react';

export default function PatientSidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userName = session?.user?.name || "John Doe";
  const patientId = session?.user?.patientId || "PAT-001";

  const mainLinks = [
    { icon: <MdOutlineDashboard size={22} />, label: 'Portal Overview', link: "/dashboard/patient" },
    { icon: <Calendar size={22} />, label: 'My Appointments', link: "/dashboard/patient/appointments" },
    { icon: <FileText size={22} />, label: 'Medical Records (EHR)', link: "/dashboard/patient/records" },
  ];

  const isLinkActive = (link) => {
    if (link === "/dashboard/patient") {
      return pathname === "/dashboard/patient";
    }
    return pathname.startsWith(link);
  };

  return (
    <>
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity" 
        />
      )}

      <aside className={`
        w-72 bg-surface-container-lowest border-r border-outline-variant/30 shrink-0 flex flex-col h-screen z-50
        fixed lg:static top-0 left-0 transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Header */}
        <div className="p-margin border-b border-outline-variant/20 flex items-center justify-between">
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">RB-HMS</h1>
            <p className="text-[10px] font-label-caps text-secondary font-bold uppercase mt-0.5">Patient Health Portal</p>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="lg:hidden p-1 text-outline hover:text-primary rounded-lg"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="p-margin flex-1 overflow-y-auto no-scrollbar space-y-md">
          <div>
            <p className="text-[10px] font-label-caps text-outline uppercase tracking-wider mb-sm px-3">
              Patient Care Services
            </p>
            <nav className="space-y-1">
              {mainLinks.map((item) => {
                const active = isLinkActive(item.link);
                return (
                  <Link
                    key={item.link}
                    href={item.link}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-semibold text-body-sm ${
                      active
                        ? "bg-primary text-on-primary clinical-shadow"
                        : "text-on-surface hover:bg-surface-container hover:text-primary"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Quick Help Card */}
          <div className="p-4 rounded-2xl bg-primary-fixed/40 border border-primary/20 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Need Emergency Assistance?</span>
            <p className="text-xs text-on-primary-fixed-variant leading-snug font-medium">
              Call hospital emergency triage 24/7 at <strong>(042) 111-ROLEMED</strong>.
            </p>
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="p-margin border-t border-outline-variant/20 bg-surface-container/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white font-bold flex items-center justify-center text-body-sm">
              {userName.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div className="overflow-hidden flex-1">
              <h5 className="font-bold text-on-surface text-body-sm truncate">{userName}</h5>
              <span className="text-[11px] font-mono font-bold text-primary block">
                ID: {patientId}
              </span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="cursor-pointer w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-outline-variant/30 text-outline hover:text-error hover:bg-error-container/20 text-xs font-bold transition-colors"
          >
            <LogOut size={14} /> Sign Out of Portal
          </button>
        </div>
      </aside>
    </>
  );
}

