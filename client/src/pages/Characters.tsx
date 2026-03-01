/*
 * Characters — Character Studio
 * Shows real characters from DB + actions (edit, generate content, delete)
 */
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Plus, MoreHorizontal, Youtube, Instagram, ExternalLink, Sparkles,
  Trash2, Edit, Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const platformIcons: Record<string, any> = {
  youtube: Youtube,
  instagram: Instagram,
  tiktok: ExternalLink,
};

const styleColors: Record<string, string> = {
  photorealistic: "from-blue-500/30 to-cyan-500/10",
  anime: "from-pink-500/30 to-purple-500/10",
  cartoon: "from-yellow-500/30 to-orange-500/10",
  "3d": "from-emerald-500/30 to-teal-500/10",
};

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "secondary" },
  active: { label: "Active", variant: "default" },
  paused: { label: "Paused", variant: "outline" },
  archived: { label: "Archived", variant: "destructive" },
};

export default function Characters() {
  const [, navigate] = useLocation();
  const { data: characters, isLoading } = trpc.characters.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.characters.delete.useMutation({
    onSuccess: () => {
      utils.characters.list.invalidate();
      toast.success("Character deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Character Studio</h1>
          <p className="text-muted-foreground mt-1">Create, manage, and evolve your AI characters.</p>
        </div>
        <Button onClick={() => navigate("/characters/new")} className="gap-2">
          <Plus className="w-4 h-4" />
          New Character
        </Button>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <motion.div variants={fadeUp} className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading characters...</span>
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && (!characters || characters.length === 0) && (
        <motion.div variants={fadeUp}>
          <Card className="border-border/50 border-dashed">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No characters yet</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                Create your first AI character to start generating content. Each character has a unique
                personality, voice, and visual style.
              </p>
              <Button onClick={() => navigate("/characters/new")} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Character
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Character Grid */}
      {characters && characters.length > 0 && (
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {characters.map((char: any) => {
            const gradient = styleColors[char.visualStyle] || "from-primary/30 to-primary/10";
            const status = statusBadge[char.status] || statusBadge.draft;
            const platforms = char.platforms || [];

            return (
              <Card
                key={char.id}
                className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300"
              >
                {/* Avatar Header */}
                <div className={`relative h-36 overflow-hidden bg-gradient-to-br ${gradient}`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-end gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/50 to-primary/20 flex items-center justify-center text-2xl font-bold ring-2 ring-background shadow-lg overflow-hidden">
                      {char.avatarUrl ? (
                        <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        char.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{char.name}</h3>
                      <p className="text-sm text-muted-foreground">{char.niche || "General"}</p>
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 bg-background/50 backdrop-blur-sm"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate("/generate")}>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Content
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast("Edit coming soon!")}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Character
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-500"
                          onClick={() => {
                            if (confirm(`Delete ${char.name}?`)) {
                              deleteMutation.mutate({ id: char.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <CardContent className="p-4 space-y-4">
                  {/* Platforms */}
                  <div className="flex flex-wrap gap-2">
                    {platforms.length > 0 ? (
                      platforms.map((p: string) => {
                        const PIcon = platformIcons[p.toLowerCase()] || ExternalLink;
                        return (
                          <Badge key={p} variant="secondary" className="gap-1.5 text-xs capitalize">
                            <PIcon className="w-3 h-3" />
                            {p}
                          </Badge>
                        );
                      })
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        No platforms set
                      </Badge>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    {char.personality && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Personality</span>
                        <span className="text-right max-w-[60%] truncate">{char.personality.split(".")[0]}</span>
                      </div>
                    )}
                    {char.voiceStyle && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Voice</span>
                        <span>{char.voiceStyle}</span>
                      </div>
                    )}
                    {char.visualStyle && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Style</span>
                        <span className="capitalize">{char.visualStyle}</span>
                      </div>
                    )}
                  </div>

                  {/* Generate CTA */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => navigate("/generate")}
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Content
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {/* Create New Card */}
          <Card
            className="flex items-center justify-center min-h-[380px] border-dashed border-2 border-border/50 hover:border-primary/40 transition-all cursor-pointer group"
            onClick={() => navigate("/characters/new")}
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
      )}
    </motion.div>
  );
}
