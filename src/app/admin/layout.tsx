import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AWH Roaster – Admin",
  description: "Admin scheduling interface – Albury Base Hospital Medicine",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
