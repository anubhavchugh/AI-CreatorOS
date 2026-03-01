/*
 * Fan Interactions — AI-powered DMs, comments, and fan engagement
 */
import { motion } from "framer-motion";
import { MessageCircle, Heart, Send, Bot, User, Star, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const conversations = [
  {
    id: 1, fan: "Alex M.", avatar: "A", tier: "Ultra", character: "Nova", platform: "Membership",
    lastMessage: "Can you do a deep dive on the new M5 chip?", time: "2m ago", unread: true, aiHandled: true,
  },
  {
    id: 2, fan: "Sarah K.", avatar: "S", tier: "Pro", character: "Kai", platform: "YouTube",
    lastMessage: "That dance was insane! Can you teach it step by step?", time: "15m ago", unread: true, aiHandled: true,
  },
  {
    id: 3, fan: "James L.", avatar: "J", tier: "Pro", character: "Aura", platform: "Instagram",
    lastMessage: "Your meditation sessions have changed my life.", time: "1h ago", unread: false, aiHandled: true,
  },
  {
    id: 4, fan: "Mia R.", avatar: "M", tier: "Basic", character: "Nova", platform: "TikTok",
    lastMessage: "When is the next live stream?", time: "3h ago", unread: false, aiHandled: true,
  },
  {
    id: 5, fan: "Chris P.", avatar: "C", tier: "Free", character: "Kai", platform: "YouTube",
    lastMessage: "Collab request — I have 500K subs on gaming", time: "5h ago", unread: false, aiHandled: false,
  },
];

const recentComments = [
  { fan: "TechNerd42", comment: "Best tech review channel on YouTube!", character: "Nova", platform: "YouTube", likes: 342, time: "10m ago" },
  { fan: "DancerGirl", comment: "I've watched this 50 times already 😂", character: "Kai", platform: "TikTok", likes: 1200, time: "25m ago" },
  { fan: "ZenMaster", comment: "This is so calming, I fell asleep instantly", character: "Aura", platform: "Instagram", likes: 89, time: "1h ago" },
  { fan: "GadgetGuru", comment: "Your predictions about AI were spot on!", character: "Nova", platform: "YouTube", likes: 567, time: "2h ago" },
];

const aiStats = [
  { label: "Messages Handled by AI", value: "94%", description: "Auto-responded" },
  { label: "Avg. Response Time", value: "< 30s", description: "AI response" },
  { label: "Fan Satisfaction", value: "4.8/5", description: "Based on reactions" },
  { label: "Escalated to Human", value: "6%", description: "Needs review" },
];

const tierColors: Record<string, string> = {
  Ultra: "bg-primary/10 text-primary border-primary/20",
  Pro: "bg-success/10 text-success border-success/20",
  Basic: "bg-warning/10 text-warning border-warning/20",
  Free: "bg-muted text-muted-foreground border-border",
};

export default function FanInteractions() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fan Interactions</h1>
          <p className="text-muted-foreground mt-1">AI-powered fan engagement across all platforms and characters.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast("Filter options coming soon!")}>
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </motion.div>

      {/* AI Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {aiStats.map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold font-mono mt-1">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Conversations + Comments */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* DM Conversations */}
        <motion.div variants={fadeUp} className="lg:col-span-3">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  Direct Messages
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {conversations.filter((c) => c.unread).length} unread
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                    conv.unread ? "bg-primary/5 hover:bg-primary/10" : "bg-accent/30 hover:bg-accent/50"
                  }`}
                  onClick={() => toast("Conversation detail view coming soon!")}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {conv.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{conv.fan}</span>
                      <Badge variant="outline" className={`text-[10px] ${tierColors[conv.tier]}`}>
                        {conv.tier}
                      </Badge>
                      {conv.aiHandled && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Bot className="w-2.5 h-2.5" />
                          AI
                        </Badge>
                      )}
                      {conv.unread && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{conv.character}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{conv.platform}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{conv.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Comments */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Heart className="w-4 h-4 text-destructive" />
                Recent Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentComments.map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-accent/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{c.fan}</span>
                    <span className="text-xs text-muted-foreground">{c.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.comment}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{c.character} · {c.platform}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart className="w-3 h-3" />
                      {c.likes.toLocaleString()}
                    </div>
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
