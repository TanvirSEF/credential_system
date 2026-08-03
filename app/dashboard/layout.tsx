"use client"

import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardMobileNavigation } from "@/components/dashboard-mobile-navigation"
import { GlobalVaultSearch } from "@/components/global-vault-search"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <DashboardSidebar />
      <GlobalVaultSearch />
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <DashboardMobileNavigation />
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">{children}</main>
      </div>
    </div>
  )
}
