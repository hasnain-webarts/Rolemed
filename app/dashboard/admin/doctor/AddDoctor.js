"use client";

import React, { useState } from "react";
import { FaRegUser } from "react-icons/fa6";
import { MdOutlineAddAPhoto, MdOutlineSchedule, MdOutlineSecurity, MdOutlineVisibility } from "react-icons/md";
import { CgNotes } from "react-icons/cg";
import { X } from "lucide-react";

export default function AddDoctorPage({ onAddDoctor, onCancel }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [specialization, setSpecialization] = useState("Cardiology");
    const [department, setDepartment] = useState("Cardiology Ward");
    const [room, setRoom] = useState("Room 301, Block B");
    const [role, setRole] = useState("Attending Physician");
    const [license, setLicense] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !email) return;

        const newDoc = {
            id: `DOC-${Math.floor(100 + Math.random() * 900)}`,
            name: name.startsWith("Dr.") ? name : `Dr. ${name}`,
            role: role === "Department Head" ? "HOD" : "Staff",
            roleClass: role === "Department Head" ? "bg-primary-fixed text-on-primary-fixed-variant" : "bg-surface-variant text-on-surface-variant",
            department: `${specialization} • ${room}`,
            schedule: "Mon, Wed, Fri (09:00 - 17:00)",
            statusColor: "bg-secondary",
            img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBtZDZ50_7mbUAunWgG5wv27gcQnAx1WXclAcGWY-MyUNnJSy2o888KxeCtlKSMNykpc0d7RYpSTLw7uFLAYLvEgvvkrrflFG7D6untiKRdi4d9El4xKPEN6hVyc8htETwm_8hTzDNzQhy0xkYuJXcx6n0gq0A96vd1NBBjCA2xiwbY-ADg0hmV7YL9wdoJYalQxcmuQVKslrNlhK37oQxC6-7rHUyaEeFNfGjyepSYDmtt-fRAinecd6p-bOqaJfuHsR5R1Vo98G0G"
        };

        if (onAddDoctor) {
            onAddDoctor(newDoc);
        }
    };

    return (
        <div className="flex flex-col no-scrollbar">
            <div className="flex justify-between items-center mb-lg border-b border-outline-variant/30 pb-sm">
                <h1 className="font-headline-md text-headline-md text-on-surface">
                    Register New Practitioner
                </h1>
                {onCancel && (
                    <button onClick={onCancel} className="p-1.5 rounded-lg text-outline hover:text-on-surface cursor-pointer">
                        <X size={22} />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
                {/* Section 1: Personal Information */}
                <div className="bg-surface-container-lowest p-md md:p-lg rounded-xl border border-outline-variant/30 shadow-sm">
                    <div className="flex items-center gap-sm mb-md border-b border-surface-variant pb-sm">
                        <span className="text-primary"><FaRegUser size={20} /></span>
                        <h2 className="font-title-sm text-title-sm text-on-surface">Personal Information</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-md items-start">
                        <div className="col-span-1 flex flex-col items-center gap-sm">
                            <div className="w-28 h-28 rounded-full border-2 border-dashed border-primary/30 bg-surface-container flex flex-col items-center justify-center text-on-surface-variant relative group overflow-hidden cursor-pointer">
                                <span className="text-primary"><MdOutlineAddAPhoto size={26} /></span>
                                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">Photo</span>
                            </div>
                            <p className="text-[10px] text-center text-outline">JPG, PNG up to 2MB</p>
                        </div>

                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-md">
                            <div className="flex flex-col gap-xs">
                                <label className="text-[12px] font-bold text-on-surface-variant ml-1">Full Practitioner Name *</label>
                                <input
                                    required
                                    className="w-full px-md py-2 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface-bright"
                                    placeholder="Dr. John Doe"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-xs">
                                <label className="text-[12px] font-bold text-on-surface-variant ml-1">Email Address *</label>
                                <input
                                    required
                                    className="w-full px-md py-2 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface-bright"
                                    placeholder="doctor@rolemed.org"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-xs">
                                <label className="text-[12px] font-bold text-on-surface-variant ml-1">Phone Number</label>
                                <input
                                    className="w-full px-md py-2 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface-bright"
                                    placeholder="+1 (555) 000-0000"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-xs">
                                <label className="text-[12px] font-bold text-on-surface-variant ml-1">Medical License Number</label>
                                <input
                                    className="w-full px-md py-2 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface-bright"
                                    placeholder="LIC-9988-2026"
                                    type="text"
                                    value={license}
                                    onChange={(e) => setLicense(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Professional Details */}
                <div className="bg-surface-container-lowest p-md md:p-lg rounded-xl border border-outline-variant/30 shadow-sm">
                    <div className="flex items-center gap-sm mb-md border-b border-surface-variant pb-sm">
                        <span className="text-primary"><CgNotes size={20} /></span>
                        <h2 className="font-title-sm text-title-sm text-on-surface">Professional Details</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                        <div className="flex flex-col gap-xs">
                            <label className="text-[12px] font-bold text-on-surface-variant ml-1">Specialization</label>
                            <select 
                                value={specialization}
                                onChange={(e) => setSpecialization(e.target.value)}
                                className="w-full px-md py-2 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface-bright cursor-pointer"
                            >
                                <option>Cardiology</option>
                                <option>Neurology</option>
                                <option>General Surgery</option>
                                <option>Pediatrics</option>
                                <option>ENT</option>
                                <option>Orthopedics</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-xs">
                            <label className="text-[12px] font-bold text-on-surface-variant ml-1">Department Wing</label>
                            <input
                                className="w-full px-md py-2 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface-bright"
                                placeholder="In-patient Cardiology Ward"
                                type="text"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-xs">
                            <label className="text-[12px] font-bold text-on-surface-variant ml-1">Consulting Room Number</label>
                            <input
                                className="w-full px-md py-2 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface-bright"
                                placeholder="Room 402, Block B"
                                type="text"
                                value={room}
                                onChange={(e) => setRoom(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-xs">
                            <label className="text-[12px] font-bold text-on-surface-variant ml-1">Role Assignment</label>
                            <select 
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-md py-2 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-surface-bright cursor-pointer"
                            >
                                <option>Attending Physician</option>
                                <option>Senior Consultant</option>
                                <option>Department Head</option>
                                <option>Resident Doctor</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* CTAs */}
                <div className="flex items-center justify-end gap-md pt-lg border-t border-outline-variant/20 mb-xl">
                    <button
                        className="cursor-pointer px-lg py-2.5 text-on-surface-variant font-bold hover:text-primary transition-all"
                        type="button"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="cursor-pointer px-xl py-2.5 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 active:scale-95 transition-all text-body-sm"
                        type="submit"
                    >
                        Register Practitioner
                    </button>
                </div>
            </form>
        </div>
    );
}
