"use client";

import BillingDesk from "@/components/BillingDesk";
import ReceptionistSidebar from "@/components/Receptionist_Sidebar";

export default function ReceptionistBillingPage() {
  return (
    <BillingDesk
      department="Reception"
      SidebarComponent={ReceptionistSidebar}
      portalTitle="Receptionist Cashier & Hospital Billing Desk"
    />
  );
}
