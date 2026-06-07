import React, { useState, useEffect, useCallback } from "react";

interface PlatformStats {
  indexed_files: number;
  total_chunks: number;
  mcp_servers: number;
  uptime: string;
  workspace: string;
}

interface CarouselStatsProps {
  refreshKey?: number;
}

export const CarouselStats: React.FC<CarouselStatsProps> = ({ refreshKey = 0 }) => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Backend not running — show zeros gracefully
      setStats({
        indexed_files: 0,
        total_chunks: 0,
        mcp_servers: 0,
        uptime: "offline",
        workspace: "—",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const metrics = stats
    ? [
        {
          title: "Indexed Files",
          value: stats.indexed_files.toLocaleString(),
          sub: stats.indexed_files === 0 ? "No files indexed yet" : "Source files parsed",
        },
        {
          title: "AST Chunks",
          value: stats.total_chunks.toLocaleString(),
          sub: stats.total_chunks === 0 ? "Index a workspace to begin" : "Stored in ChromaDB",
        },
        {
          title: "MCP Servers",
          value: `${stats.mcp_servers} Connected`,
          sub: stats.mcp_servers === 0 ? "Starting on first query" : "Tool servers active",
        },
        {
          title: "Backend Uptime",
          value: stats.uptime,
          sub: stats.uptime === "offline" ? "Start the backend server" : "Since last restart",
        },
        {
          title: "Workspace",
          value: stats.workspace.length > 30
            ? "..." + stats.workspace.slice(-28)
            : stats.workspace,
          sub: "Active sandbox path",
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="w-full flex gap-6 overflow-x-auto pb-4 scrollbar-thin select-none">
        {[...Array(4)].map((_, idx) => (
          <div
            key={idx}
            className="min-w-[280px] bg-[var(--color-surface)] p-5 rounded-2xl border border-black/10 flex flex-col gap-3 animate-pulse"
          >
            <div className="h-3 bg-black/10 rounded w-24" />
            <div className="h-7 bg-black/10 rounded w-36" />
            <div className="h-2 bg-black/5 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full flex gap-6 overflow-x-auto pb-4 scrollbar-thin select-none">
      {metrics.map((stat, idx) => (
        <div
          key={idx}
          className="min-w-[250px] bg-[var(--color-surface)] p-5 rounded-2xl border border-black/10 flex flex-col gap-2 hover:shadow-sm transition-shadow cursor-default"
        >
          <span className="text-[13px] tracking-widest uppercase opacity-60 font-semibold">
            {stat.title}
          </span>
          <span
            className="text-[26px] font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {stat.value}
          </span>
          <span className="text-[12px] italic opacity-50">{stat.sub}</span>
        </div>
      ))}
    </div>
  );
};
