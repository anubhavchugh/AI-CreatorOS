/**
 * Content Library — Gallery/List view of all generated content
 *
 * Features:
 * - Gallery (grid) and List (table) view toggle
 * - Filter by character, platform, status, content type
 * - Search by title
 * - Content detail slide-over with script preview, audio player, thumbnail
 * - Delete / Publish actions
 * - Links to Settings when platform keys are missing
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Upload,
  Sparkles,
  FileText,
  Wand2,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Loader2,
  Play,
  Volume2,
  Video,
  ImageIcon,
  MoreHorizontal,
  X,
  Send,
  ChevronDown,
  Copy,
  Download,
  Settings,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: any }
> = {
  idea: {
    label: "Idea",
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    icon: FileText,
  },
  scripting: {
    label: "Scripting",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    icon: Wand2,
  },
  generating: {
    label: "Generating",
    color: "text-primary",
    bgColor: "bg-primary/10",
    icon: Loader2,
  },
  review: {
    label: "Review",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    icon: Eye,
  },
  scheduled: {
    label: "Scheduled",
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    icon: Clock,
  },
  published: {
    label: "Published",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    icon: AlertCircle,
  },
};

const typeLabels: Record<string, string> = {
  short: "Short",
  long_form: "Long Form",
  image: "Image",
  story: "Story",
  reel: "Reel",
};

const platformIcons: Record<string, string> = {
  youtube: "🎬",
  tiktok: "🎵",
  instagram: "📸",
};

type ContentWithChar = {
  id: number;
  characterId: number;
  userId: number;
  title: string;
  type: string;
  platform: string | null;
  status: string;
  script: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  tags: string[] | null;
  publishedUrl: string | null;
  publishError: string | null;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  createdAt: Date;
  updatedAt: Date;
  characterName: string | null;
  characterAvatarUrl: string | null;
};

// ==================== PUBLISH MODAL ====================

function PublishModal({
  open,
  onOpenChange,
  content,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ContentWithChar | null;
}) {
  const [, navigate] = useLocation();
  const [publishPlatform, setPublishPlatform] = useState("youtube");
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishTags, setPublishTags] = useState("");

  const { data: connections } = trpc.settings.getPlatformConnections.useQuery();
  const utils = trpc.useUtils();

  const publishMutation = trpc.library.publish.useMutation({
    onSuccess: (data) => {
      toast.success("Content published successfully!");
      onOpenChange(false);
      utils.library.list.invalidate();
    },
    onError: (error) => {
      const msg = error.message || "Publishing failed";
      if (msg.startsWith("NO_PLATFORM_KEY:")) {
        toast.error(
          `No ${publishPlatform} connection found. Connect your account in Settings → Platforms.`
        );
      } else {
        toast.error(msg);
      }
    },
  });

  const hasConnection = (platform: string) =>
    connections?.some(
      (c: any) => c.platform === platform && c.isConnected
    ) || false;

  // Pre-fill when content changes
  useState(() => {
    if (content) {
      setPublishTitle(content.title || "");
      setPublishDescription(content.description || "");
      setPublishTags(content.tags?.join(", ") || "");
      setPublishPlatform(content.platform || "youtube");
    }
  });

  const handlePublish = () => {
    if (!content) return;
    publishMutation.mutate({
      id: content.id,
      platform: publishPlatform,
      title: publishTitle.trim() || content.title,
      description: publishDescription.trim() || undefined,
      tags: publishTags
        ? publishTags.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Publish Content
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Platform Selection */}
          <div>
            <Label className="text-sm font-medium">Platform</Label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {[
                { key: "youtube", label: "YouTube", icon: "🎬" },
                { key: "tiktok", label: "TikTok", icon: "🎵" },
                { key: "instagram", label: "Instagram", icon: "📸", disabled: true },
              ].map((p) => (
                <button
                  key={p.key}
                  disabled={(p as any).disabled}
                  onClick={() => setPublishPlatform(p.key)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    publishPlatform === p.key
                      ? "border-primary bg-primary/10"
                      : (p as any).disabled
                      ? "border-border/30 opacity-40 cursor-not-allowed"
                      : "border-border/50 hover:border-primary/30"
                  }`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <p className="text-xs font-medium mt-1">{p.label}</p>
                  {!hasConnection(p.key) && !(p as any).disabled && (
                    <p className="text-[10px] text-amber-500 mt-0.5">Not connected</p>
                  )}
                  {(p as any).disabled && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Coming soon</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Connection Warning */}
          {!hasConnection(publishPlatform) && (
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-500">
                    {publishPlatform.charAt(0).toUpperCase() + publishPlatform.slice(1)} not connected
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Connect your account in Settings to publish.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1.5 h-7 text-xs border-amber-500/30 text-amber-500"
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/settings");
                    }}
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Go to Settings
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <Label className="text-sm font-medium">Title</Label>
            <Input
              value={publishTitle}
              onChange={(e) => setPublishTitle(e.target.value)}
              placeholder="Video title..."
              className="mt-1.5"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              value={publishDescription}
              onChange={(e) => setPublishDescription(e.target.value)}
              placeholder="Video description..."
              className="mt-1.5 min-h-[80px]"
            />
          </div>

          {/* Tags */}
          <div>
            <Label className="text-sm font-medium">Tags (comma-separated)</Label>
            <Input
              value={publishTags}
              onChange={(e) => setPublishTags(e.target.value)}
              placeholder="ai, content, creator"
              className="mt-1.5"
            />
          </div>

          {/* No Media Warning */}
          {content && !content.mediaUrl && (
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-500">
                  No media file attached. Publishing requires a video/audio file.
                  Generate content first using the pipeline.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handlePublish}
              disabled={publishMutation.isPending || !hasConnection(publishPlatform)}
              className="flex-1 gap-2"
            >
              {publishMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {publishMutation.isPending ? "Publishing..." : "Publish Now"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== CONTENT DETAIL MODAL ====================

function ContentDetailModal({
  open,
  onOpenChange,
  content,
  onPublish,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ContentWithChar | null;
  onPublish: () => void;
}) {
  if (!content) return null;

  const config = statusConfig[content.status] || statusConfig.idea;
  const StatusIcon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-sm font-bold shrink-0">
              {content.characterName?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg">{content.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant="outline"
                  className={`text-xs ${config.color}`}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
                {content.platform && (
                  <Badge variant="secondary" className="text-xs">
                    {platformIcons[content.platform] || "📱"}{" "}
                    {content.platform.charAt(0).toUpperCase() +
                      content.platform.slice(1)}
                  </Badge>
                )}
                {content.type && (
                  <Badge variant="secondary" className="text-xs">
                    {typeLabels[content.type] || content.type}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  by {content.characterName || "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Video Preview Player — shown when mediaUrl is a video */}
          {content.mediaUrl && (content.mediaUrl.includes(".mp4") || content.mediaUrl.includes("video")) ? (
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-primary" />
                Video Preview
                <Badge variant="outline" className="text-xs border-primary text-primary">Main Output</Badge>
              </h4>
              <div className="rounded-xl overflow-hidden border border-border/50 bg-black">
                <video
                  controls
                  className="w-full h-auto max-h-[400px]"
                  src={content.mediaUrl}
                  poster={content.thumbnailUrl || undefined}
                  preload="metadata"
                >
                  Your browser does not support the video element.
                </video>
              </div>
            </div>
          ) : (
            <>
              {/* Thumbnail (only show separately if no video) */}
              {content.thumbnailUrl && (
                <div className="rounded-xl overflow-hidden border border-border/50">
                  <img
                    src={content.thumbnailUrl}
                    alt="Content thumbnail"
                    className="w-full h-auto max-h-[300px] object-cover"
                  />
                </div>
              )}

              {/* Audio Player (only show if mediaUrl is audio, not video) */}
              {content.mediaUrl && (
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    Audio
                  </h4>
                  <audio controls className="w-full" src={content.mediaUrl}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </>
          )}

          {/* Script Preview */}
          {content.script && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Script
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(content.script || "");
                    toast.success("Script copied!");
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="bg-accent/30 rounded-xl p-4 max-h-[250px] overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                  {content.script}
                </pre>
              </div>
            </div>
          )}

          {/* Published URL */}
          {content.publishedUrl && (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-500">Published</span>
              </div>
              <a
                href={content.publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
              >
                {content.publishedUrl}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Publish Error */}
          {content.publishError && (
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-500">Publish Error</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {content.publishError}
              </p>
            </div>
          )}

          {/* Stats */}
          {(content.views || content.likes || content.comments) && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-accent/30 text-center">
                <p className="text-lg font-bold font-mono">
                  {(content.views || 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
              <div className="p-3 rounded-xl bg-accent/30 text-center">
                <p className="text-lg font-bold font-mono">
                  {(content.likes || 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Likes</p>
              </div>
              <div className="p-3 rounded-xl bg-accent/30 text-center">
                <p className="text-lg font-bold font-mono">
                  {(content.comments || 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Comments</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
            <p>
              Created:{" "}
              {new Date(content.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {content.publishedAt && (
              <p>
                Published:{" "}
                {new Date(content.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {content.status === "review" && (
              <Button onClick={onPublish} className="gap-2">
                <Upload className="w-4 h-4" />
                Publish
              </Button>
            )}
            {content.mediaUrl && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={content.mediaUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="w-3 h-3 mr-1" />
                  {content.mediaUrl.includes(".mp4") || content.mediaUrl.includes("video")
                    ? "Download Video"
                    : "Download Audio"}
                </a>
              </Button>
            )}
            {content.thumbnailUrl && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={content.thumbnailUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Download Thumbnail
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ==================== MAIN CONTENT LIBRARY ====================

export default function ContentLibrary() {
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<"gallery" | "list">("gallery");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCharacter, setFilterCharacter] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // Modals
  const [selectedContent, setSelectedContent] = useState<ContentWithChar | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContentWithChar | null>(null);

  // Data
  const { data: contentItems, isLoading } = trpc.library.list.useQuery();
  const { data: myCharacters } = trpc.characters.list.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.library.delete.useMutation({
    onSuccess: () => {
      toast.success("Content deleted");
      utils.library.list.invalidate();
      setDeleteOpen(false);
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete content"),
  });

  // Filtered content
  const filteredContent = useMemo(() => {
    if (!contentItems) return [];
    return (contentItems as ContentWithChar[]).filter((item) => {
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterCharacter !== "all" && String(item.characterId) !== filterCharacter) return false;
      if (filterPlatform !== "all" && item.platform !== filterPlatform) return false;
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterType !== "all" && item.type !== filterType) return false;
      return true;
    });
  }, [contentItems, searchQuery, filterCharacter, filterPlatform, filterStatus, filterType]);

  // Unique characters for filter
  const uniqueCharacters = useMemo(() => {
    if (!myCharacters) return [];
    return myCharacters as { id: number; name: string }[];
  }, [myCharacters]);

  const totalCount = contentItems?.length || 0;
  const filteredCount = filteredContent.length;

  const handleOpenDetail = (item: ContentWithChar) => {
    setSelectedContent(item);
    setDetailOpen(true);
  };

  const handleOpenPublish = (item: ContentWithChar) => {
    setSelectedContent(item);
    setPublishOpen(true);
  };

  const handleConfirmDelete = (item: ContentWithChar) => {
    setDeleteTarget(item);
    setDeleteOpen(true);
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Library</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} content piece{totalCount !== 1 ? "s" : ""} generated
            {filteredCount !== totalCount && ` · ${filteredCount} shown`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/generate")}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate New
          </Button>
        </div>
      </motion.div>

      {/* Filters Bar */}
      <motion.div variants={fadeUp}>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Select value={filterCharacter} onValueChange={setFilterCharacter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Character" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Characters</SelectItem>
                    {uniqueCharacters.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="scripting">Scripting</SelectItem>
                    <SelectItem value="generating">Generating</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                    <SelectItem value="long_form">Long Form</SelectItem>
                    <SelectItem value="reel">Reel</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="flex border border-border/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("gallery")}
                    className={`p-2 transition-colors ${
                      viewMode === "gallery"
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 transition-colors ${
                      viewMode === "list"
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <motion.div
          variants={fadeUp}
          className="flex items-center justify-center py-16"
        >
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">
            Loading content library...
          </span>
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && totalCount === 0 && (
        <motion.div variants={fadeUp}>
          <Card className="border-border/50 border-dashed">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Your content library is empty
              </h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                Start generating content for your AI characters. Scripts, audio,
                and thumbnails will appear here for you to manage and publish.
              </p>
              <Button onClick={() => navigate("/generate")} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Generate Your First Content
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* No Results */}
      {!isLoading && totalCount > 0 && filteredCount === 0 && (
        <motion.div variants={fadeUp}>
          <Card className="border-border/50 border-dashed">
            <CardContent className="p-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-semibold mb-1">No matching content</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your filters or search query.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSearchQuery("");
                  setFilterCharacter("all");
                  setFilterPlatform("all");
                  setFilterStatus("all");
                  setFilterType("all");
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Gallery View */}
      {!isLoading && filteredCount > 0 && viewMode === "gallery" && (
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredContent.map((item) => {
            const config = statusConfig[item.status] || statusConfig.idea;
            const StatusIcon = config.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  className="border-border/50 hover:border-primary/30 transition-all duration-200 cursor-pointer group overflow-hidden"
                  onClick={() => handleOpenDetail(item)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-accent/20 overflow-hidden">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Status Badge Overlay */}
                    <div className="absolute top-2 left-2">
                      <Badge
                        className={`text-[10px] ${config.bgColor} ${config.color} border-0`}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                    {/* Platform Badge */}
                    {item.platform && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {platformIcons[item.platform] || "📱"}
                        </Badge>
                      </div>
                    )}
                    {/* Video play button overlay */}
                    {item.mediaUrl && (item.mediaUrl.includes(".mp4") || item.mediaUrl.includes("video")) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary/80 transition-all duration-300 group-hover:scale-110">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                      </div>
                    )}
                    {/* Media indicators */}
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      {item.mediaUrl && (item.mediaUrl.includes(".mp4") || item.mediaUrl.includes("video")) ? (
                        <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                          <Video className="w-3 h-3 text-white" />
                        </div>
                      ) : item.mediaUrl ? (
                        <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                          <Volume2 className="w-3 h-3 text-white" />
                        </div>
                      ) : null}
                      {item.script && (
                        <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                          <FileText className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold shrink-0">
                        {item.characterName?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.characterName || "Unknown"} ·{" "}
                          {typeLabels[item.type] || item.type}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(item);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {item.status === "review" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPublish(item);
                              }}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {item.publishedUrl && (
                            <DropdownMenuItem asChild>
                              <a
                                href={item.publishedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Published
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmDelete(item);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* List View */}
      {!isLoading && filteredCount > 0 && viewMode === "list" && (
        <motion.div variants={fadeUp}>
          <Card className="border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-accent/20">
                    <th className="text-left p-3 font-medium text-muted-foreground">
                      Content
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground">
                      Character
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground">
                      Platform
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left p-3 font-medium text-muted-foreground">
                      Created
                    </th>
                    <th className="text-right p-3 font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContent.map((item) => {
                    const config =
                      statusConfig[item.status] || statusConfig.idea;
                    const StatusIcon = config.icon;
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-border/30 hover:bg-accent/10 cursor-pointer transition-colors"
                        onClick={() => handleOpenDetail(item)}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent/30 overflow-hidden shrink-0">
                              {item.thumbnailUrl ? (
                                <img
                                  src={item.thumbnailUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-muted-foreground/30" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[200px]">
                                {item.title}
                              </p>
                              <div className="flex gap-1 mt-0.5">
                                {item.script && (
                                  <FileText className="w-3 h-3 text-muted-foreground/50" />
                                )}
                                {item.mediaUrl && (item.mediaUrl.includes(".mp4") || item.mediaUrl.includes("video")) ? (
                                  <Video className="w-3 h-3 text-primary/60" />
                                ) : item.mediaUrl ? (
                                  <Volume2 className="w-3 h-3 text-muted-foreground/50" />
                                ) : null}
                                {item.thumbnailUrl && (
                                  <ImageIcon className="w-3 h-3 text-muted-foreground/50" />
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm">
                            {item.characterName || "Unknown"}
                          </span>
                        </td>
                        <td className="p-3">
                          {item.platform ? (
                            <span className="text-sm">
                              {platformIcons[item.platform] || ""}{" "}
                              {item.platform.charAt(0).toUpperCase() +
                                item.platform.slice(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-sm">
                            {typeLabels[item.type] || item.type}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-xs ${config.color}`}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {new Date(item.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.status === "review" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPublish(item);
                                }}
                              >
                                <Upload className="w-3 h-3" />
                                Publish
                              </Button>
                            )}
                            {item.publishedUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                asChild
                              >
                                <a
                                  href={item.publishedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDetail(item);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmDelete(item);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Content Detail Modal */}
      <ContentDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        content={selectedContent}
        onPublish={() => {
          setDetailOpen(false);
          if (selectedContent) handleOpenPublish(selectedContent);
        }}
      />

      {/* Publish Modal */}
      <PublishModal
        open={publishOpen}
        onOpenChange={setPublishOpen}
        content={selectedContent}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This
              action cannot be undone. The script, audio, and thumbnail will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate({ id: deleteTarget.id });
                }
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
