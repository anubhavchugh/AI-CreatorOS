/*
 * Monetization — Revenue streams, subscriptions, brand deals
 */
import { motion } from "framer-motion";
import { DollarSign, Users, CreditCard, TrendingUp, ArrowUpRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const revenueByStream = [
  { stream: "Ad Revenue", amount: 28400, pct: 59 },
  { stream: "Fan Memberships", amount: 12300, pct: 25 },
  { stream: "Brand Deals", amount: 5200, pct: 11 },
  { stream: "Merch", amount: 2390, pct: 5 },
];

const monthlyRevenue = [
  { month: "Sep", ads: 8200, memberships: 2400, brands: 1200, merch: 600 },
  { month: "Oct", ads: 12400, memberships: 3800, brands: 2100, merch: 600 },
  { month: "Nov", ads: 16800, memberships: 5200, brands: 1500, merch: 800 },
  { month: "Dec", ads: 21200, memberships: 6800, brands: 2200, merch: 1000 },
  { month: "Jan", ads: 25600, memberships: 9200, brands: 2800, merch: 1100 },
  { month: "Feb", ads: 28400, memberships: 12300, brands: 5200, merch: 2390 },
];

const brandDeals = [
  { brand: "TechFlow Pro", character: "Nova", value: "$3,200", status: "active", type: "Sponsored Review" },
  { brand: "FitLife App", character: "Kai", value: "$1,500", status: "pending", type: "Integration" },
  { brand: "ZenSpace", character: "Aura", value: "$800", status: "completed", type: "Sponsored ASMR" },
];

const topFans = [
  { name: "Alex M.", tier: "Ultra", monthly: "$49.99", since: "Oct 2025" },
  { name: "Sarah K.", tier: "Pro", monthly: "$19.99", since: "Nov 2025" },
  { name: "James L.", tier: "Pro", monthly: "$19.99", since: "Dec 2025" },
  { name: "Mia R.", tier: "Basic", monthly: "$9.99", since: "Jan 2026" },
];

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-muted text-muted-foreground border-border",
};

export default function Monetization() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold tracking-tight">Monetization Hub</h1>
        <p className="text-muted-foreground mt-1">Track revenue streams and manage monetization across all channels.</p>
      </motion.div>

      {/* Revenue Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue (MTD)", value: "$48,290", change: "+24.5%", icon: DollarSign },
          { label: "Active Subscribers", value: "2,847", change: "+312 this month", icon: Users },
          { label: "Avg. Revenue / Char", value: "$16,097", change: "+18%", icon: TrendingUp },
          { label: "Pending Payouts", value: "$12,450", change: "Next: Mar 15", icon: CreditCard },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border/50 hover:border-primary/30 transition-all dark:hover:glow-blue-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold font-mono">{s.value}</p>
                <p className="text-xs text-success mt-1 font-medium">{s.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Revenue Chart + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Revenue by Stream</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                    <Bar dataKey="ads" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} name="Ad Revenue" />
                    <Bar dataKey="memberships" stackId="a" fill="#6366F1" name="Memberships" />
                    <Bar dataKey="brands" stackId="a" fill="#22C55E" name="Brand Deals" />
                    <Bar dataKey="merch" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Merch" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {revenueByStream.map((r) => (
                <div key={r.stream} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span>{r.stream}</span>
                    <span className="font-mono font-semibold">${r.amount.toLocaleString()}</span>
                  </div>
                  <Progress value={r.pct} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Brand Deals + Top Fans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={fadeUp}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Brand Deals</CardTitle>
                <Button variant="outline" size="sm" onClick={() => toast("Brand marketplace coming soon!")}>
                  Find Brands
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {brandDeals.map((deal) => (
                <div key={deal.brand} className="flex items-center justify-between p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold">{deal.brand}</p>
                    <p className="text-xs text-muted-foreground">{deal.character} · {deal.type}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-semibold">{deal.value}</span>
                    <Badge variant="outline" className={`text-xs ${statusColors[deal.status]}`}>
                      {deal.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Top Subscribers</CardTitle>
                <Badge variant="secondary" className="text-xs">2,847 total</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {topFans.map((fan) => (
                <div key={fan.name} className="flex items-center justify-between p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {fan.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{fan.name}</p>
                      <p className="text-xs text-muted-foreground">Since {fan.since}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs mb-1">{fan.tier}</Badge>
                    <p className="text-xs font-mono text-muted-foreground">{fan.monthly}/mo</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
