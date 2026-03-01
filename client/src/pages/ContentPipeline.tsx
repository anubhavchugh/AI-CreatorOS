/*
 * Content Pipeline — End-to-end content creation workflow
 * Design: Kanban-style columns showing pipeline stages
 */
import { motion } from "framer-motion";
import { Plus, Play, Pause, RotateCcw, CheckCircle2, Clock, Wand2, Mic, Film, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

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

const columns = [
  {
    id: "scripting",
    title: "Scripting",
    icon: Wand2,
    color: "text-warning",
    bgColor: "bg-warning/10",
    items: [
      { id: 1, title: "AI News Weekly #24", character: "Nova", avatar: CHAR1, platform: "YouTube", duration: "8:00", progress: 60 },
      { id: 2, title: "Street Food Reaction", character: "Kai", avatar: CHAR2, platform: "TikTok", duration: "0:45", progress: 20 },
    ],
  },
  {
    id: "voice",
    title: "Voice Generation",
    icon: Mic,
    color: "text-primary",
    bgColor: "bg-primary/10",
    items: [
      { id: 3, title: "Morning Meditation #12", character: "Aura", avatar: CHAR3, platform: "YouTube", duration: "15:00", progress: 45 },
    ],
  },
  {
    id: "rendering",
    title: "Video Rendering",
    icon: Film,
    color: "text-primary",
    bgColor: "bg-primary/10",
    items: [
      { id: 4, title: "Tech Review: iPhone 18", character: "Nova", avatar: CHAR1, platform: "YouTube", duration: "12:30", progress: 72 },
      { id: 5, title: "Dance Challenge #47", character: "Kai", avatar: CHAR2, platform: "TikTok", duration: "0:30", progress: 88 },
    ],
  },
  {
    id: "review",
    title: "Ready for Review",
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10",
    items: [
      { id: 6, title: "Morning Routine ASMR", character: "Aura", avatar: CHAR3, platform: "Instagram", duration: "1:00", progress: 100 },
      { id: 7, title: "Unboxing Galaxy S30", character: "Nova", avatar: CHAR1, platform: "YouTube", duration: "10:15", progress: 100 },
    ],
  },
];

const recentPublished = [
  { title: "AI Explained in 60s", character: "Nova", platform: "TikTok", views: "1.2M", published: "2h ago" },
  { title: "Chill Beats Live", character: "Aura", platform: "YouTube", views: "45K", published: "5h ago" },
  { title: "Prank Compilation #8", character: "Kai", platform: "YouTube", views: "890K", published: "1d ago" },
];

export default function ContentPipeline() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Pipeline</h1>
          <p className="text-muted-foreground mt-1">Track content from idea to publication.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast("Batch generation coming soon!")}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Regenerate All
          </Button>
          <Button onClick={() => toast("New content wizard coming soon!")} className="gap-2">
            <Plus className="w-4 h-4" />
            New Content
          </Button>
        </div>
      </motion.div>

      {/* Pipeline Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "In Pipeline", value: "7", icon: Clock, color: "text-primary" },
          { label: "Rendering", value: "2", icon: Film, color: "text-warning" },
          { label: "Ready", value: "2", icon: CheckCircle2, color: "text-success" },
          { label: "Published Today", value: "3", icon: Upload, color: "text-primary" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold font-mono">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Kanban Columns */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => {
          const ColIcon = col.icon;
          return (
            <div key={col.id} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <ColIcon className={`w-4 h-4 ${col.color}`} />
                <h3 className="text-sm font-semibold">{col.title}</h3>
                <Badge variant="secondary" className="text-xs ml-auto">
                  {col.items.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {col.items.map((item) => (
                  <Card
                    key={item.id}
                    className="border-border/50 hover:border-primary/30 transition-all duration-200 dark:hover:glow-blue-sm cursor-pointer"
                    onClick={() => toast("Content detail view coming soon!")}
                  >
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-start gap-2">
                        <img src={item.avatar} alt={item.character} className="w-8 h-8 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.character} · {item.platform}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={item.progress} className="h-1.5 flex-1" />
                        <span className="text-xs font-mono text-muted-foreground">{item.progress}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.duration}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={(e) => { e.stopPropagation(); toast("Playback coming soon!"); }}>
                            <Play className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={(e) => { e.stopPropagation(); toast("Pause coming soon!"); }}>
                            <Pause className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Recently Published */}
      <motion.div variants={fadeUp}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recently Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPublished.map((item) => (
                <div key={item.title} className="flex items-center justify-between p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.character} · {item.platform}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold">{item.views}</p>
                    <p className="text-xs text-muted-foreground">{item.published}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
