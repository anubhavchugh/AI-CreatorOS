/*
 * DashboardLayout — Neon Command Center
 * Design: Collapsible sidebar, dark-first, electric blue accents, glass-morphism cards
 * Font: DM Sans (body) + JetBrains Mono (metrics)
 */
import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Clapperboard,
  CalendarDays,
  BarChart3,
  DollarSign,
  MessageCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Zap,
  Shield,
  Sparkles,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/characters", label: "Characters", icon: Users },
  { path: "/pipeline", label: "Content Pipeline", icon: Clapperboard },
  { path: "/generate", label: "Generate Content", icon: Sparkles },
  { path: "/library", label: "Content Library", icon: FolderOpen },
  { path: "/calendar", label: "Calendar", icon: CalendarDays },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/monetization", label: "Monetization", icon: DollarSign },
  { path: "/fans", label: "Fan Interactions", icon: MessageCircle },
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "/admin", label: "Admin Panel", icon: Shield, adminOnly: true },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="relative flex flex-col border-r border-sidebar-border bg-sidebar shrink-0"
      >
        {/* Logo Area */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="text-base font-bold tracking-tight text-foreground">
                  AI CreatorOS
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.filter((item) => !(item as any).adminOnly || user?.role === "admin").map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;

            const button = (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  relative flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-all duration-200 group
                  ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }
                `}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-lg bg-primary/10 dark:glow-blue-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={`relative z-10 w-5 h-5 shrink-0 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="relative z-10 overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </nav>

        {/* Bottom Controls */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          {/* Theme Toggle */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className={`w-full ${collapsed ? "justify-center px-0" : "justify-start"} text-muted-foreground hover:text-foreground`}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 shrink-0" />
                ) : (
                  <Moon className="w-4 h-4 shrink-0" />
                )}
                {!collapsed && (
                  <span className="ml-3 text-sm">
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={8}>
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </TooltipContent>
            )}
          </Tooltip>

          {/* Collapse Toggle */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed(!collapsed)}
                className={`w-full ${collapsed ? "justify-center px-0" : "justify-start"} text-muted-foreground hover:text-foreground`}
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4 shrink-0" />
                ) : (
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                )}
                {!collapsed && <span className="ml-3 text-sm">Collapse</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={8}>
                Expand
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
