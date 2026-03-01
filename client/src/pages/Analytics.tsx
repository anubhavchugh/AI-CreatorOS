/*
 * Analytics — Deep performance metrics across characters and platforms
 */
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const viewsData = [
  { date: "Feb 1", views: 45000 }, { date: "Feb 5", views: 62000 }, { date: "Feb 10", views: 78000 },
  { date: "Feb 15", views: 95000 }, { date: "Feb 20", views: 120000 }, { date: "Feb 25", views: 145000 },
  { date: "Mar 1", views: 168000 },
];

const platformData = [
  { platform: "YouTube", views: 1200000, revenue: 28400, growth: "+22%" },
  { platform: "TikTok", views: 850000, revenue: 12300, growth: "+45%" },
  { platform: "Instagram", views: 350000, revenue: 7590, growth: "+18%" },
];

const characterPerformance = [
  { name: "Nova", views: 980000, engagement: 8.2, revenue: 18400 },
  { name: "Kai", views: 1100000, engagement: 12.5, revenue: 24100 },
  { name: "Aura", views: 320000, engagement: 6.8, revenue: 5790 },
];

const audienceData = [
  { name: "18-24", value: 35 }, { name: "25-34", value: 40 },
  { name: "35-44", value: 15 }, { name: "45+", value: 10 },
];

const COLORS = ["#3B82F6", "#6366F1", "#22C55E", "#F59E0B"];

const contentTypeData = [
  { type: "Short-form", count: 245, avgViews: "89K" },
  { type: "Long-form", count: 87, avgViews: "156K" },
  { type: "Live/Stream", count: 12, avgViews: "23K" },
  { type: "Stories", count: 320, avgViews: "45K" },
];

export default function Analytics() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Deep-dive into performance across all characters and platforms.</p>
      </motion.div>

      {/* Top-level Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Views (30d)", value: "2.4M", change: "+18.2%" },
          { label: "Watch Time", value: "48.2K hrs", change: "+12.5%" },
          { label: "New Subscribers", value: "+32.4K", change: "+28.1%" },
          { label: "Avg. Engagement", value: "8.7%", change: "+2.1%" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold font-mono mt-1">{s.value}</p>
              <p className="text-xs text-success mt-1 font-medium">{s.change}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Views Over Time */}
      <motion.div variants={fadeUp}>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={viewsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} formatter={(v: number) => [`${(v / 1000).toFixed(0)}K`, "Views"]} />
                  <Area type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={2.5} fill="url(#viewsGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Platform + Audience */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Breakdown */}
        <motion.div variants={fadeUp}>
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Platform Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {platformData.map((p) => (
                <div key={p.platform} className="flex items-center justify-between p-3 rounded-xl bg-accent/30">
                  <div>
                    <p className="text-sm font-semibold">{p.platform}</p>
                    <p className="text-xs text-muted-foreground">{(p.views / 1000000).toFixed(1)}M views</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold text-success">${p.revenue.toLocaleString()}</p>
                    <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">{p.growth}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Audience Demographics */}
        <motion.div variants={fadeUp}>
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Audience Age Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={audienceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                      {audienceData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Character Performance Table */}
      <motion.div variants={fadeUp}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Character Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Character</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Views</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Engagement</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {characterPerformance.map((c) => (
                    <tr key={c.name} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="py-3 px-4 font-semibold">{c.name}</td>
                      <td className="py-3 px-4 text-right font-mono">{(c.views / 1000000).toFixed(1)}M</td>
                      <td className="py-3 px-4 text-right font-mono">{c.engagement}%</td>
                      <td className="py-3 px-4 text-right font-mono text-success">${c.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Content Type Breakdown */}
      <motion.div variants={fadeUp}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Content Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {contentTypeData.map((ct) => (
                <div key={ct.type} className="p-4 rounded-xl bg-accent/30 text-center">
                  <p className="text-2xl font-bold font-mono">{ct.count}</p>
                  <p className="text-sm font-medium mt-1">{ct.type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Avg. {ct.avgViews} views</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
