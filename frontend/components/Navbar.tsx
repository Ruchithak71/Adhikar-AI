"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, LayoutDashboard, FileSearch, Bell } from "lucide-react";
import clsx from "clsx";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/review/WP-1234-2024", label: "Review Portal", icon: FileSearch },
  ];

  return (
    <nav className="h-14 border-b border-bg-border bg-bg-secondary/80 backdrop-blur-md sticky top-0 z-50 flex items-center px-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mr-10 group">
        <div className="relative">
          <Scale
            size={18}
            className="text-amber-glow transition-transform group-hover:rotate-6"
          />
          <div className="absolute inset-0 blur-md bg-amber-glow opacity-30 group-hover:opacity-50 transition-opacity" />
        </div>
        <span className="font-display text-ink-primary text-[15px] font-medium tracking-tight">
          Adhikar<span className="text-amber-glow font-semibold">AI</span>
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href.split("/").slice(0, 2).join("/"));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-amber-subtle text-amber-glow border border-amber-muted/30"
                  : "text-ink-secondary hover:text-ink-primary hover:bg-bg-elevated"
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        <button className="relative p-2 rounded-md hover:bg-bg-elevated transition-colors text-ink-secondary hover:text-ink-primary">
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-glow" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-bg-border">
          <div className="w-7 h-7 rounded-full bg-bg-elevated border border-bg-border-light flex items-center justify-center">
            <span className="text-[11px] font-mono text-amber-glow font-medium">SR</span>
          </div>
          <span className="text-[12px] text-ink-secondary font-mono">Senior Reviewer</span>
        </div>
      </div>
    </nav>
  );
}
