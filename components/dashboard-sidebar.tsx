"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useVaultSessionStore } from "@/stores/vault-session-store";
import { signOutAction } from "@/lib/actions/auth";
import { getProfileAction } from "@/lib/actions/profile";
import { Avatar } from "@/components/avatar";
import { BrandLogo } from "@/components/brand-logo";
import {
  Key,
  FileText,
  Folder,
  Lock,
  LogOut,
  Trash2,
  LayoutDashboard,
  ChevronRight,
  Settings as SettingsIcon,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/credentials", label: "Credentials", icon: Key },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/types", label: "Categories", icon: Folder },
  { href: "/dashboard/trash", label: "Trash Bin", icon: Trash2 },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const lockVault = useVaultSessionStore((s) => s.lockVault);
  const [profile, setProfile] = useState<{ fullName: string; avatarUrl: string | null } | null>(null);

  useEffect(() => {
    getProfileAction().then((p) => {
      if (p) setProfile({ fullName: p.fullName, avatarUrl: p.avatarUrl });
    });
  }, [pathname]);

  function handleLock() {
    lockVault();
    router.push("/unlock");
  }

  async function handleSignOut() {
    lockVault();
    await signOutAction();
  }

  return (
    <aside className="hidden md:flex md:w-[260px] lg:w-[280px] flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-border/40">
        <Link href="/dashboard" aria-label="Secure Personal Vault dashboard">
          <BrandLogo preload className="w-full" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Menu</p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/15 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-blue-400" : "text-muted-foreground/70 group-hover:text-foreground"}`} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-400/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Account / profile shortcut */}
      <Link
        href="/dashboard/settings"
        className="mx-3 mb-2 flex items-center gap-3 rounded-lg border-t border-border/40 pt-3 hover:bg-muted/50 transition-colors"
      >
        <Avatar
          avatarUrl={profile?.avatarUrl}
          name={profile?.fullName}
          className="h-9 w-9 text-xs"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {profile?.fullName || "Account"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            Profile & settings
          </p>
        </div>
      </Link>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-border/40 space-y-1.5">
        <button
          onClick={handleLock}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400/80 hover:bg-amber-500/10 hover:text-amber-400 transition-all duration-200"
        >
          <Lock className="h-4 w-4" />
          <span>Lock Vault</span>
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

