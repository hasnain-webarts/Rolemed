"use client";

import { FaRegAddressCard } from "react-icons/fa";
import { FaClockRotateLeft } from "react-icons/fa6";
import { MdOutlineDashboard, MdOutlinePerson, MdOutlineLocalPharmacy, MdSchedule, MdOutlineAnalytics } from "react-icons/md";
import { Stethoscope, Calendar, FlaskConical, X, Cpu, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from "next/navigation";
import { useSession, signOut } from 'next-auth/react';

function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { data: session } = useSession();

    const userName = session?.user?.name || "Chief Administrator";
    const userRole = session?.user?.role || "admin";

    const mainLinks = [
        { icon: <MdOutlineDashboard size={22} />, label: 'Dashboard', link: "/dashboard/admin" },
        { icon: <MdOutlinePerson size={22} />, label: 'Patients', link: "/dashboard/admin/patient" },
        { icon: <Stethoscope size={22} />, label: 'Doctors', link: "/dashboard/admin/doctor" },
        { icon: <FaRegAddressCard size={22} />, label: 'Staff', link: "/dashboard/admin/staff" },
        { icon: <Calendar size={22} />, label: 'Appointments', link: "/dashboard/admin/appointments" },
        { icon: <FlaskConical size={22} />, label: 'Laboratory', link: "/dashboard/admin/laboratory" },
        { icon: <MdOutlineLocalPharmacy size={22} />, label: 'Pharmacy', link: "/dashboard/admin/pharmacy" },
        { icon: <Cpu size={22} />, label: 'Equipments & Assets', link: "/dashboard/admin/equipments" },
    ];

    const operationalLinks = [
        { icon: <MessageSquare size={20} />, label: 'Messages & Outbox', link: "/dashboard/admin/notifications" },
        { icon: <MdSchedule size={22} />, label: 'Duty Rosters', link: "/dashboard/admin/duty-rosters" },
        { icon: <MdOutlineAnalytics size={22} />, label: 'Reports', link: "/dashboard/admin/reports" },
        { icon: <FaClockRotateLeft size={20} />, label: 'Audit Logs', link: "/dashboard/admin/audit-logs" },
    ];

    const isLinkActive = (link) => {
        if (link === "/dashboard/admin") {
            return pathname === "/dashboard/admin";
        }
        return pathname.startsWith(link);
    };

    return (
        <>
            {/* Mobile Backdrop */}
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
                <div className="p-margin border-b border-outline-variant/20 flex items-center justify-between">
                    <div>
                        <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">RB-HMS</h1>
                        <p className="text-[10px] font-label-caps text-outline uppercase mt-1">Admin Operations</p>
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

                <nav className="flex-1 overflow-y-auto sidebar-scroll px-4 py-6 space-y-1">
                    {mainLinks.map((link) => {
                        const active = isLinkActive(link.link);
                        return (
                            <Link
                                key={link.label}
                                href={link.link}
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                    active
                                        ? 'bg-primary-container text-on-primary-container font-semibold clinical-shadow'
                                        : 'text-on-surface-variant hover:bg-surface-container transition-colors'
                                }`}
                            >
                                <span className="flex items-center justify-center">{link.icon}</span>
                                <span className="text-body-md font-body-md">{link.label}</span>
                            </Link>
                        );
                    })}

                    <div className="pt-4 pb-2 px-4">
                        <span className="text-[11px] font-label-caps text-outline uppercase tracking-wider">Operational</span>
                    </div>

                    {operationalLinks.map((link) => {
                        const active = isLinkActive(link.link);
                        return (
                            <Link
                                key={link.label}
                                href={link.link}
                                onClick={onClose}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                    active
                                        ? 'bg-primary-container text-on-primary-container font-semibold clinical-shadow'
                                        : 'text-on-surface-variant hover:bg-surface-container transition-colors'
                                }`}
                            >
                                <span className="flex items-center justify-center">{link.icon}</span>
                                <span className="text-body-md font-body-md">{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-margin border-t border-outline-variant/20 space-y-3">
                    <Link 
                        href="/dashboard/admin/profile"
                        onClick={onClose}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low transition-all hover:bg-surface-container-high cursor-pointer group"
                    >
                        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shrink-0 border-2 border-primary-fixed group-hover:scale-105 transition-transform">
                            {userName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-body-sm font-bold truncate capitalize group-hover:text-primary transition-colors">{userName}</p>
                            <p className="text-[12px] text-outline truncate uppercase">{userRole}</p>
                        </div>
                    </Link>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-error/10 text-error hover:bg-error/20 rounded-xl font-bold transition-all text-body-sm cursor-pointer"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
