/*
 * Dashboard — Command Center Overview
 * Design: Stat cards with glow, character roster, pipeline status, revenue chart
 */
import { motion } from "framer-motion";
import {
  Users,
  Eye,
  DollarSign,
  TrendingUp,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CHAR1 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663355511618/VYneUcnZvTL9FVkbHuDg6r/ai-character-1-6dhCsgGqumtaZH6c7azPzf.webp";
const CHAR2 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663355511618/VYneUcnZvTL9FVkbHuDg6r/ai-character-2-24x8c4CYv6kSDiNcWZCSor.webp";
const CHAR3 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663355511618/VYneUcnZvTL9FVkbHuDg6r/ai-character-3-DryEzWBDVzwnVw7HcPDear.webp";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stats = [
  { label: "Total Characters", value: "12", change: "+3 this month", icon: Users, color: "text-primary" },
  { label: "Total Views", value: "2.4M", change: "+18.2%", icon: Eye, color: "text-primary" },
  { label: "Revenue (MTD)", value: "$48,290", change: "+24.5%", icon: DollarSign, color: "text-success" },
  { label: "Engagement Rate", value: "8.7%", change: "+2.1%", icon: TrendingUp, color: "text-primary" },
];

const revenueData = [
  { month: "Sep", revenue: 12400 },
  { month: "Oct", revenue: 18900 },
  { month: "Nov", revenue: 24300 },
  { month: "Dec", revenue: 31200 },
  { month: "Jan", revenue: 38700 },
  { month: "Feb", revenue: 48290 },
];

const characters = [
  { name: "Nova", avatar: CHAR1, platform: "YouTube", subscribers: "245K", status: "active", videos: 142 },
  { name: "Kai", avatar: CHAR2, platform: "TikTok", subscribers: "1.2M", status: "active", videos: 387 },
  { name: "Aura", avatar: CHAR3, platform: "Instagram", subscribers: "89K", status: "active", videos: 96 },
];

const pipelineItems = [
  { title: "Nova — Tech Review: iPhone 18", status: "rendering", progress: 72, platform: "YouTube" },
  { title: "Kai — Dance Challenge #47", status: "scripting", progress: 25, platform: "TikTok" },
  { title: "Aura — Morning Routine ASMR", status: "complete", progress: 100, platform: "Instagram" },
  { title: "Nova — AI News Weekly #23", status: "voice", progress: 50, platform: "YouTube" },
  { title: "Kai — Street Food Reaction", status: "queued", progress: 0, platform: "TikTok" },
];

const statusConfig: Record<string, { label: string; icon: typeof Play; className: string }> = {
  rendering: { label: "Rendering", icon: Play, className: "bg-primary/10 text-primary border-primary/20" },
  scripting: { label: "Scripting", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  complete: { label: "Complete", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  voice: { label: "Voice Gen", icon: Play, className: "bg-primary/10 text-primary border-primary/20" },
  queued: { label: "Queued", icon: AlertCircle, className: "bg-muted text-muted-foreground border-border" },
};

export default function Dashboard() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your AI creator empire. All systems operational.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="relative overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 dark:hover:glow-blue-sm"
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold font-mono tracking-tight">{stat.value}</p>
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-xs text-success mt-2 font-medium">{stat.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Main Grid: Revenue Chart + Characters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Revenue Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${v / 1000}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3B82F6"
                      strokeWidth={2.5}
                      fill="url(#blueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Character Roster */}
        <motion.div variants={fadeUp}>
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Active Characters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {characters.map((char) => (
                <div
                  key={char.name}
                  className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors"
                >
                  <img
                    src={char.avatar}
                    alt={char.name}
                    className="w-11 h-11 rounded-lg object-cover ring-1 ring-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{char.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {char.platform} · {char.subscribers}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                    Live
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Content Pipeline */}
      <motion.div variants={fadeUp}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Content Pipeline</CardTitle>
              <Badge variant="outline" className="text-xs">
                {pipelineItems.filter((i) => i.status !== "complete").length} in progress
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pipelineItems.map((item) => {
                const config = statusConfig[item.status];
                const StatusIcon = config.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-center gap-4 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress value={item.progress} className="h-1.5 flex-1" />
                        <span className="text-xs font-mono text-muted-foreground w-9 text-right">
                          {item.progress}%
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${config.className}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {item.platform}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
