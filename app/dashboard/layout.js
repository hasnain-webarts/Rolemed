import SessionTimeoutModal from "@/components/SessionTimeoutModal";

export default function DashboardLayout({ children }) {
  return (
    <>
      <SessionTimeoutModal />
      {children}
    </>
  );
}

