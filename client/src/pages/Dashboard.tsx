/*
 * Dashboard — Command Center Overview
 * Shows real data from the database via tRPC
 */
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Users,
  Eye,
  FileText,
  TrendingUp,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const statusConfig: Record<string, { label: string; icon: typeof Play; className: string; progress: number }> = {
  idea: { label: "Idea", icon: AlertCircle, className: "bg-muted text-muted-foreground border-border", progress: 0 },
  scripting: { label: "Scripting", icon: Clock, className: "bg-warning/10 text-warning border-warning/20", progress: 25 },
  generating: { label: "Generating", icon: Play, className: "bg-primary/10 text-primary border-primary/20", progress: 50 },
  review: { label: "Review", icon: Eye, className: "bg-primary/10 text-primary border-primary/20", progress: 75 },
  scheduled: { label: "Scheduled", icon: Clock, className: "bg-warning/10 text-warning border-warning/20", progress: 90 },
  published: { label: "Published", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20", progress: 100 },
  failed: { label: "Failed", icon: AlertCircle, className: "bg-destructive/10 text-destructive border-destructive/20", progress: 0 },
};

const statusBadge: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  active: { label: "Active", className: "bg-success/10 text-success border-success/20" },
  paused: { label: "Paused", className: "bg-warning/10 text-warning border-warning/20" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: characters, isLoading: charsLoading } = trpc.dashboard.characters.useQuery();
  const { data: pipeline, isLoading: pipeLoading } = trpc.dashboard.pipeline.useQuery();

  const isLoading = statsLoading || charsLoading || pipeLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Characters",
      value: stats?.totalCharacters?.toString() || "0",
      sub: `${stats?.activeCharacters || 0} active`,
      icon: Users,
      color: "text-primary",
    },
    {
      label: "Total Content",
      value: stats?.totalContent?.toString() || "0",
      sub: `${stats?.publishedContent || 0} published`,
      icon: FileText,
      color: "text-primary",
    },
    {
      label: "Active Characters",
      value: stats?.activeCharacters?.toString() || "0",
      sub: "Currently live",
      icon: TrendingUp,
      color: "text-success",
    },
    {
      label: "Published",
      value: stats?.publishedContent?.toString() || "0",
      sub: "Content pieces",
      icon: CheckCircle2,
      color: "text-primary",
    },
  ];

  const hasCharacters = characters && characters.length > 0;
  const hasPipeline = pipeline && pipeline.length > 0;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your AI creator empire.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
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
                <p className="text-xs text-muted-foreground mt-2">{stat.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Main Grid: Characters + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Character Roster or Empty State */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Your Characters</CardTitle>
                <Button size="sm" variant="outline" onClick={() => navigate("/characters/new")} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!hasCharacters ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No characters yet</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                    Create your first AI character to start generating content. Each character has a unique personality, voice, and visual style.
                  </p>
                  <Button onClick={() => navigate("/characters/new")} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Your First Character
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {characters.map((char: any) => {
                    const status = statusBadge[char.status] || statusBadge.draft;
                    return (
                      <div
                        key={char.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors cursor-pointer"
                        onClick={() => navigate("/characters")}
                      >
                        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary/50 to-primary/20 flex items-center justify-center text-lg font-bold ring-1 ring-border shrink-0">
                          {char.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{char.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {char.niche || "General"} · {char.visualStyle || "photorealistic"}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-xs ${status.className}`}>
                          {status.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp}>
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={() => navigate("/characters/new")}
              >
                <Plus className="w-5 h-5 text-primary" />
                <span>Create New Character</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={() => navigate("/generate")}
              >
                <Sparkles className="w-5 h-5 text-primary" />
                <span>Generate Content</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={() => navigate("/library")}
              >
                <FileText className="w-5 h-5 text-primary" />
                <span>Content Library</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12"
                onClick={() => navigate("/settings")}
              >
                <TrendingUp className="w-5 h-5 text-primary" />
                <span>Settings</span>
              </Button>
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
              {hasPipeline && (
                <Badge variant="outline" className="text-xs">
                  {pipeline.filter((i: any) => i.status !== "published").length} in progress
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!hasPipeline ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  No content in the pipeline yet. Create a character and start generating content!
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={() => navigate("/generate")}
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Content
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {pipeline.map((item: any) => {
                  const config = statusConfig[item.status] || statusConfig.idea;
                  const StatusIcon = config.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.characterName ? `${item.characterName} — ` : ""}{item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Progress value={config.progress} className="h-1.5 flex-1" />
                          <span className="text-xs font-mono text-muted-foreground w-9 text-right">
                            {config.progress}%
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${config.className}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                      {item.platform && (
                        <Badge variant="secondary" className="text-xs shrink-0 capitalize">
                          {item.platform}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
