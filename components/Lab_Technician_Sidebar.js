"use client";

import { useState, useEffect } from "react";
import { MdOutlineDashboard } from "react-icons/md";
import { FlaskConical, FileText, Receipt, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from "next/navigation";
import { useSession, signOut } from 'next-auth/react';

function LabTechnicianSidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [billingEnabled, setBillingEnabled] = useState(true);

    useEffect(() => {
        let isMounted = true;
        fetch('/api/admin/billing-rules')
            .then((r) => r.json())
            .then((d) => {
                if (isMounted && d.success && d.settings?.enabledBillingDepartments) {
                    setBillingEnabled(Boolean(d.settings.enabledBillingDepartments.laboratory));
                }
            })
            .catch(() => {});
        return () => { isMounted = false; };
    }, []);

    const userName = session?.user?.name || "Felix Vance";
    const userRole = session?.user?.role || "lab-technician";

    const mainLinks = [
        { icon: <MdOutlineDashboard size={22} />, label: 'Dashboard', link: "/dashboard/lab-technician" },
        { icon: <FlaskConical size={22} />, label: 'Test Requests', link: "/dashboard/lab-technician/test-requests" },
        { icon: <FileText size={22} />, label: 'Completed Reports', link: "/dashboard/lab-technician/reports" },
        ...(billingEnabled ? [{ icon: <Receipt size={22} />, label: 'Lab Billing', link: "/dashboard/lab-technician/billing" }] : []),
    ];

    const isLinkActive = (link) => {
        if (link === "/dashboard/lab-technician") {
            return pathname === "/dashboard/lab-technician";
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
                <div className="p-margin border-b border-outline-variant/20 flex items-center justify-between">
                    <div>
                        <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">RB-HMS</h1>
                        <p className="text-[10px] font-label-caps text-outline uppercase mt-1">Laboratory Portal</p>
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
                </nav>

                <div className="p-margin border-t border-outline-variant/20 space-y-3">
                    <Link 
                        href="/dashboard/lab-technician/profile"
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

export default LabTechnicianSidebar;
