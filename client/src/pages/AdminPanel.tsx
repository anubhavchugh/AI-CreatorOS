/*
 * Admin Panel — Waitlist management, user management, revenue dashboard
 * Only accessible to admin users
 */
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  Users, Mail, DollarSign, TrendingUp, UserCheck, Clock,
  Send, Shield, BarChart3, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function StatCard({ title, value, icon: Icon, subtitle, trend }: {
  title: string; value: string | number; icon: any; subtitle?: string; trend?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold font-mono mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            {trend && (
              <Badge variant="outline" className="text-xs gap-1 text-green-500 border-green-500/30">
                <ArrowUpRight className="w-3 h-3" /> {trend}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: waitlistStats } = trpc.admin.waitlistStats.useQuery(undefined, {
    retry: false,
  });
  const { data: userStats } = trpc.admin.userStats.useQuery(undefined, {
    retry: false,
  });
  const { data: revenueStats } = trpc.admin.revenueStats.useQuery(undefined, {
    retry: false,
  });
  const { data: waitlistEntries } = trpc.admin.waitlist.useQuery(undefined, {
    retry: false,
  });
  const { data: allUsers } = trpc.admin.users.useQuery(undefined, {
    retry: false,
  });
  const { data: recentPayments } = trpc.admin.recentPayments.useQuery(undefined, {
    retry: false,
  });

  const updateStatus = trpc.admin.updateWaitlistStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated!");
    },
  });

  const utils = trpc.useUtils();

  const handleStatusChange = (id: number, status: "pending" | "invited" | "joined") => {
    updateStatus.mutate({ id, status }, {
      onSuccess: () => {
        utils.admin.waitlist.invalidate();
        utils.admin.waitlistStats.invalidate();
      },
    });
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="border-border/50 max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold">Admin Access Required</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You need admin privileges to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage waitlist, users, and revenue
            </p>
          </div>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-accent/50">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="gap-2">
            <Mail className="w-4 h-4" /> Waitlist
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2">
            <DollarSign className="w-4 h-4" /> Revenue
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Waitlist"
              value={waitlistStats?.total || 0}
              icon={Mail}
              subtitle={`${waitlistStats?.pending || 0} pending`}
            />
            <StatCard
              title="Total Users"
              value={userStats?.total || 0}
              icon={Users}
              subtitle={`${userStats?.pro || 0} pro, ${userStats?.enterprise || 0} enterprise`}
            />
            <StatCard
              title="Total Revenue"
              value={`$${((revenueStats?.totalRevenue || 0) / 100).toFixed(2)}`}
              icon={DollarSign}
              subtitle={`${revenueStats?.totalPayments || 0} payments`}
            />
            <StatCard
              title="Monthly Revenue"
              value={`$${((revenueStats?.monthlyRevenue || 0) / 100).toFixed(2)}`}
              icon={TrendingUp}
              subtitle="This month"
            />
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Waitlist Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Pending
                    </span>
                    <span className="font-mono font-bold">{waitlistStats?.pending || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Send className="w-4 h-4" /> Invited
                    </span>
                    <span className="font-mono font-bold">{waitlistStats?.invited || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <UserCheck className="w-4 h-4" /> Joined
                    </span>
                    <span className="font-mono font-bold">{waitlistStats?.joined || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">User Plan Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Free</span>
                    <span className="font-mono font-bold">{userStats?.free || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pro ($29/mo)</span>
                    <span className="font-mono font-bold text-primary">{userStats?.pro || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Enterprise ($99/mo)</span>
                    <span className="font-mono font-bold text-primary">{userStats?.enterprise || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Waitlist Tab */}
        <TabsContent value="waitlist" className="mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Waitlist Entries ({waitlistEntries?.length || 0})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {!waitlistEntries || waitlistEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No waitlist entries yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Source</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitlistEntries.map((entry) => (
                        <tr key={entry.id} className="border-b border-border/30 hover:bg-accent/30">
                          <td className="py-3 px-4 font-mono text-xs">{entry.email}</td>
                          <td className="py-3 px-4">{entry.name || "—"}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-xs">{entry.source || "landing"}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={entry.status === "joined" ? "default" : "outline"}
                              className={`text-xs ${
                                entry.status === "pending"
                                  ? "text-yellow-500 border-yellow-500/30"
                                  : entry.status === "invited"
                                  ? "text-blue-500 border-blue-500/30"
                                  : "text-green-500 border-green-500/30"
                              }`}
                            >
                              {entry.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              {entry.status === "pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => handleStatusChange(entry.id, "invited")}
                                >
                                  <Send className="w-3 h-3 mr-1" /> Invite
                                </Button>
                              )}
                              {entry.status === "invited" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => handleStatusChange(entry.id, "joined")}
                                >
                                  <UserCheck className="w-3 h-3 mr-1" /> Mark Joined
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Registered Users ({allUsers?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {!allUsers || allUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No users registered yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Plan</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((u) => (
                        <tr key={u.id} className="border-b border-border/30 hover:bg-accent/30">
                          <td className="py-3 px-4 font-medium">{u.name || "—"}</td>
                          <td className="py-3 px-4 font-mono text-xs">{u.email || "—"}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={u.plan === "free" ? "outline" : "default"}
                              className={`text-xs ${
                                u.plan === "pro" ? "bg-primary" : u.plan === "enterprise" ? "bg-purple-600" : ""
                              }`}
                            >
                              {u.plan || "free"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={`text-xs ${u.role === "admin" ? "text-red-500 border-red-500/30" : ""}`}>
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {new Date(u.lastSignedIn).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Total Revenue"
              value={`$${((revenueStats?.totalRevenue || 0) / 100).toFixed(2)}`}
              icon={DollarSign}
            />
            <StatCard
              title="This Month"
              value={`$${((revenueStats?.monthlyRevenue || 0) / 100).toFixed(2)}`}
              icon={TrendingUp}
            />
            <StatCard
              title="Total Transactions"
              value={revenueStats?.totalPayments || 0}
              icon={BarChart3}
            />
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {!recentPayments || recentPayments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No payments yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Plan</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPayments.map((p) => (
                        <tr key={p.id} className="border-b border-border/30 hover:bg-accent/30">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{p.userName || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{p.userEmail || ""}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            ${((p.amount || 0) / 100).toFixed(2)} {(p.currency || "usd").toUpperCase()}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-xs">{p.plan}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                p.status === "succeeded" ? "text-green-500 border-green-500/30" : "text-yellow-500 border-yellow-500/30"
                              }`}
                            >
                              {p.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
