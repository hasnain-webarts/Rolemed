"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Menu, X, Activity } from 'lucide-react';

const Navbar = () => {
    const { data: session, status } = useSession();
    const isLoggedIn = status === "authenticated";
    const userRole = session?.user?.role || "doctor";
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 shadow-xs">
            <div className="flex justify-between items-center px-6 md:px-12 py-3.5 max-w-7xl mx-auto">
                <Link href="/" className="flex items-center gap-2">
                    <Activity className="text-primary w-6 h-6 animate-pulse" />
                    <span className="font-bold text-2xl text-primary tracking-tight">RoleMed</span>
                </Link>

                <div className="hidden md:flex items-center gap-8 font-medium text-body-sm">
                    <Link className="text-on-surface-variant hover:text-primary transition-colors" href="/#features">Features</Link>
                    <Link className="text-on-surface-variant hover:text-primary transition-colors" href="/#doctors">Doctors</Link>
                    <Link className="text-on-surface-variant hover:text-primary transition-colors" href="/#benefits">Benefits</Link>
                </div>

                <div className="hidden md:flex items-center gap-4">
                    {isLoggedIn ? (
                        <>
                            <Link href={`/dashboard/${userRole}`}>
                                <button className="px-5 py-2 text-primary font-bold hover:bg-surface-container rounded-xl transition-all cursor-pointer text-body-sm">
                                    Dashboard
                                </button>
                            </Link>
                            <button 
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="px-5 py-2 bg-primary text-on-primary font-bold rounded-xl shadow-sm hover:opacity-90 transition-all cursor-pointer text-body-sm clinical-shadow"
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login">
                                <button className="px-5 py-2 bg-primary text-on-primary font-bold rounded-xl shadow-sm hover:opacity-90 transition-all cursor-pointer text-body-sm clinical-shadow">
                                    Staff Portal Login
                                </button>
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2 text-on-surface-variant hover:text-primary cursor-pointer"
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-surface-container-lowest border-b border-outline-variant/30 px-6 py-4 space-y-3">
                    <Link 
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-on-surface-variant font-semibold py-1.5" 
                        href="/#features"
                    >
                        Features
                    </Link>
                    <Link 
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-on-surface-variant font-semibold py-1.5" 
                        href="/#doctors"
                    >
                        Doctors
                    </Link>
                    <Link 
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-on-surface-variant font-semibold py-1.5" 
                        href="/#benefits"
                    >
                        Benefits
                    </Link>
                    <div className="pt-3 border-t border-outline-variant/20 flex flex-col gap-2">
                        {isLoggedIn ? (
                            <>
                                <Link 
                                    onClick={() => setMobileMenuOpen(false)}
                                    href={`/dashboard/${userRole}`}
                                    className="w-full text-center py-2 text-primary font-bold bg-surface-container rounded-xl"
                                >
                                    Dashboard
                                </Link>
                                <button 
                                    onClick={() => signOut({ callbackUrl: '/login' })}
                                    className="w-full py-2 bg-primary text-on-primary font-bold rounded-xl shadow-sm"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link 
                                    onClick={() => setMobileMenuOpen(false)}
                                    href="/login"
                                    className="w-full text-center py-2 bg-primary text-on-primary font-bold rounded-xl shadow-sm"
                                >
                                    Staff Portal Login
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
