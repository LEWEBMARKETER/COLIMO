import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
