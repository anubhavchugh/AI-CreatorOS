/*
 * Content Pipeline — End-to-end content creation workflow
 * Shows real content items from DB + link to Generate Content page
 */
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Plus, Play, Pause, RotateCcw, CheckCircle2, Clock, Wand2, Mic,
  Film, Upload, Sparkles, ArrowRight, Loader2, FileText, Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  idea: { label: "Idea", color: "text-muted-foreground", bgColor: "bg-muted/30", icon: FileText },
  scripting: { label: "Scripting", color: "text-amber-500", bgColor: "bg-amber-500/10", icon: Wand2 },
  generating: { label: "Generating", color: "text-primary", bgColor: "bg-primary/10", icon: Loader2 },
  review: { label: "Review", color: "text-blue-400", bgColor: "bg-blue-400/10", icon: Eye },
  scheduled: { label: "Scheduled", color: "text-purple-400", bgColor: "bg-purple-400/10", icon: Clock },
  published: { label: "Published", color: "text-emerald-500", bgColor: "bg-emerald-500/10", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-red-500", bgColor: "bg-red-500/10", icon: RotateCcw },
};

export default function ContentPipeline() {
  const [, navigate] = useLocation();
  const { data: contentItems, isLoading } = trpc.content.list.useQuery();
  const { data: characters } = trpc.characters.list.useQuery();

  // Group content by status for kanban view
  const grouped = {
    scripting: contentItems?.filter((c: any) => c.status === "scripting" || c.status === "idea") || [],
    generating: contentItems?.filter((c: any) => c.status === "generating") || [],
    review: contentItems?.filter((c: any) => c.status === "review") || [],
    published: contentItems?.filter((c: any) => c.status === "published" || c.status === "scheduled") || [],
  };

  const getCharacterName = (charId: number) => {
    const char = characters?.find((c: any) => c.id === charId);
    return char?.name || "Unknown";
  };

  const totalInPipeline = contentItems?.filter((c: any) => !["published", "failed"].includes(c.status)).length || 0;
  const totalPublished = contentItems?.filter((c: any) => c.status === "published").length || 0;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Pipeline</h1>
          <p className="text-muted-foreground mt-1">Track content from idea to publication.</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/generate")}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate Content
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Pipeline Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "In Pipeline", value: String(totalInPipeline), icon: Clock, color: "text-primary" },
          { label: "Generating", value: String(grouped.generating.length), icon: Film, color: "text-amber-500" },
          { label: "Ready for Review", value: String(grouped.review.length), icon: CheckCircle2, color: "text-blue-400" },
          { label: "Published", value: String(totalPublished), icon: Upload, color: "text-emerald-500" },
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

      {/* Empty State / CTA */}
      {!isLoading && (!contentItems || contentItems.length === 0) && (
        <motion.div variants={fadeUp}>
          <Card className="border-border/50 border-dashed">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No content yet</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                Start generating content for your AI characters. The pipeline will show your content
                moving through each stage — from script to voice to final output.
              </p>
              <Button onClick={() => navigate("/generate")} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Generate Your First Content
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <motion.div variants={fadeUp} className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading pipeline...</span>
        </motion.div>
      )}

      {/* Kanban Columns */}
      {contentItems && contentItems.length > 0 && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { id: "scripting", title: "Scripting / Ideas", icon: Wand2, color: "text-amber-500", items: grouped.scripting },
            { id: "generating", title: "Generating", icon: Mic, color: "text-primary", items: grouped.generating },
            { id: "review", title: "Ready for Review", icon: Eye, color: "text-blue-400", items: grouped.review },
            { id: "published", title: "Published / Scheduled", icon: CheckCircle2, color: "text-emerald-500", items: grouped.published },
          ].map((col) => {
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
                <div className="space-y-2 min-h-[100px]">
                  {col.items.length === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-border/50 text-center">
                      <p className="text-xs text-muted-foreground">No items</p>
                    </div>
                  )}
                  {col.items.map((item: any) => {
                    const config = statusConfig[item.status] || statusConfig.idea;
                    return (
                      <Card
                        key={item.id}
                        className="border-border/50 hover:border-primary/30 transition-all duration-200 cursor-pointer"
                        onClick={() => toast("Content detail view coming soon!")}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                              {getCharacterName(item.characterId).charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {getCharacterName(item.characterId)} · {item.platform || "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                              {config.label}
                            </Badge>
                            {item.type && (
                              <span className="text-[10px] text-muted-foreground capitalize">{item.type.replace("_", " ")}</span>
                            )}
                          </div>
                          {item.script && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                              {item.script.substring(0, 100)}...
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
