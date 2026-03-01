/*
 * Characters — Character Studio
 * Design: Grid of character cards with avatars, stats, platform badges
 */
import { motion } from "framer-motion";
import { Plus, MoreHorizontal, Youtube, Instagram, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const CHAR1 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663355511618/VYneUcnZvTL9FVkbHuDg6r/ai-character-1-6dhCsgGqumtaZH6c7azPzf.webp";
const CHAR2 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663355511618/VYneUcnZvTL9FVkbHuDg6r/ai-character-2-24x8c4CYv6kSDiNcWZCSor.webp";
const CHAR3 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663355511618/VYneUcnZvTL9FVkbHuDg6r/ai-character-3-DryEzWBDVzwnVw7HcPDear.webp";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const characters = [
  {
    id: 1, name: "Nova", tagline: "Tech reviewer & futurist",
    avatar: CHAR1, cover: CHAR1,
    platforms: [{ name: "YouTube", icon: Youtube, subs: "245K" }, { name: "Instagram", icon: Instagram, subs: "120K" }],
    totalViews: "4.2M", totalRevenue: "$18,400", videosCreated: 142, status: "active",
    personality: "Confident, articulate, slightly sarcastic. Deep knowledge of consumer tech.",
    voice: "ElevenLabs — Aria", style: "Photorealistic",
  },
  {
    id: 2, name: "Kai", tagline: "Gen-Z entertainer & trend chaser",
    avatar: CHAR2, cover: CHAR2,
    platforms: [{ name: "TikTok", icon: ExternalLink, subs: "1.2M" }, { name: "YouTube", icon: Youtube, subs: "380K" }],
    totalViews: "18.7M", totalRevenue: "$24,100", videosCreated: 387, status: "active",
    personality: "Energetic, funny, relatable. Speaks in internet slang. Loves challenges.",
    voice: "ElevenLabs — Marcus", style: "3D Animated",
  },
  {
    id: 3, name: "Aura", tagline: "Ethereal ASMR & wellness guide",
    avatar: CHAR3, cover: CHAR3,
    platforms: [{ name: "Instagram", icon: Instagram, subs: "89K" }, { name: "YouTube", icon: Youtube, subs: "56K" }],
    totalViews: "1.8M", totalRevenue: "$5,790", videosCreated: 96, status: "active",
    personality: "Calm, mysterious, soothing. Speaks slowly and deliberately.",
    voice: "ElevenLabs — Sage", style: "Ethereal 3D",
  },
];

export default function Characters() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Character Studio</h1>
          <p className="text-muted-foreground mt-1">Create, manage, and evolve your AI characters.</p>
        </div>
        <Button onClick={() => toast("Character creation wizard coming soon!")} className="gap-2">
          <Plus className="w-4 h-4" />
          New Character
        </Button>
      </motion.div>

      {/* Character Grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {characters.map((char) => (
          <Card
            key={char.id}
            className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 dark:hover:glow-blue-sm"
          >
            {/* Avatar Header */}
            <div className="relative h-40 overflow-hidden bg-accent">
              <img
                src={char.cover}
                alt={char.name}
                className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-end gap-3">
                <img
                  src={char.avatar}
                  alt={char.name}
                  className="w-16 h-16 rounded-xl object-cover ring-2 ring-background shadow-lg"
                />
                <div>
                  <h3 className="text-lg font-bold">{char.name}</h3>
                  <p className="text-sm text-muted-foreground">{char.tagline}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 w-8 h-8 bg-background/50 backdrop-blur-sm"
                onClick={() => toast("Character settings coming soon!")}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            <CardContent className="p-4 space-y-4">
              {/* Platforms */}
              <div className="flex flex-wrap gap-2">
                {char.platforms.map((p) => {
                  const PIcon = p.icon;
                  return (
                    <Badge key={p.name} variant="secondary" className="gap-1.5 text-xs">
                      <PIcon className="w-3 h-3" />
                      {p.name} · {p.subs}
                    </Badge>
                  );
                })}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-accent/50">
                  <p className="text-lg font-bold font-mono">{char.totalViews}</p>
                  <p className="text-xs text-muted-foreground">Views</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-accent/50">
                  <p className="text-lg font-bold font-mono text-success">{char.totalRevenue}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-accent/50">
                  <p className="text-lg font-bold font-mono">{char.videosCreated}</p>
                  <p className="text-xs text-muted-foreground">Videos</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Personality</span>
                  <span className="text-right max-w-[60%] truncate">{char.personality.split(".")[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voice</span>
                  <span>{char.voice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Style</span>
                  <span>{char.style}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Create New Card */}
        <Card
          className="flex items-center justify-center min-h-[380px] border-dashed border-2 border-border/50 hover:border-primary/40 transition-all cursor-pointer group"
          onClick={() => toast("Character creation wizard coming soon!")}
        >
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
              <Plus className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Create New Character</p>
              <p className="text-sm text-muted-foreground">Design a new AI persona</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
