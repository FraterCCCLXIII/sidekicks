"use client";

import { Bot, Database, LayoutDashboard, PlaySquare, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useClusterSummary } from "@/hooks/use-sidekicks-data";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/templates", label: "Templates", icon: Sparkles },
  { href: "/runs", label: "Runs", icon: PlaySquare },
  { href: "/storage", label: "Storage", icon: Database },
  { href: "/settings", label: "Settings", icon: Settings2 }
];

function LogoMark() {
  return (
    <svg
      viewBox="0 0 8.55 8.52"
      aria-label="Sidekicks"
      className="h-9 w-9 text-foreground"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect y="4.53" width="3.99" height="3.99" fill="currentColor" />
      <path
        d="M4.57,4.53h1.99c1.1,0,1.99.89,1.99,1.99h0c0,1.1-.89,1.99-1.99,1.99h-1.99v-3.99h0Z"
        fill="currentColor"
      />
      <rect
        x="4.57"
        width="3.99"
        height="3.99"
        transform="translate(13.12 3.99) rotate(180)"
        fill="currentColor"
      />
      <path
        d="M0,0h1.99C3.09,0,3.99.89,3.99,1.99h0c0,1.1-.89,1.99-1.99,1.99H0V0H0Z"
        transform="translate(3.99 3.99) rotate(180)"
        fill="currentColor"
      />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: clusterSummary } = useClusterSummary();

  return (
    <>
      <aside className="hidden w-[280px] shrink-0 xl:block">
        <div className="sticky top-0 flex h-screen flex-col border-r border-white/[0.08] bg-card/[0.72] px-5 py-6 backdrop-blur-xl">
          <div className="flex items-center px-2">
            <LogoMark />
          </div>

          <nav className="mt-10 flex flex-1 flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition",
                    active
                      ? "border border-white/[0.12] bg-white/[0.05] text-foreground"
                      : "border border-transparent text-muted-foreground hover:border-white/[0.05] hover:bg-white/[0.025] hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

	          <div className="panel-muted p-4">
	            <div className="text-sm font-medium">Cluster</div>
	            <div className="mt-1 text-sm text-muted-foreground">
	              {clusterSummary ? (
	                <>
	                  {clusterSummary.nodesOnline} {clusterSummary.nodesOnline === 1 ? "node" : "nodes"} online,{" "}
	                  {clusterSummary.queuedJobs} {clusterSummary.queuedJobs === 1 ? "queued job" : "queued jobs"} across all regions.
	                </>
	              ) : (
	                "Fetching cluster status…"
	              )}
	            </div>
	          </div>
	        </div>
	      </aside>

      <div className="xl:hidden">
        <div className="sticky top-0 z-40 border-b border-white/[0.08] bg-card/[0.78] px-4 py-4 backdrop-blur-xl">
          <div className="mb-4 flex items-center">
            <LogoMark />
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-lg border px-4 py-2 text-sm transition",
                    active
                      ? "border-white/[0.12] bg-white/[0.05] text-foreground"
                      : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-white/[0.08] hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
