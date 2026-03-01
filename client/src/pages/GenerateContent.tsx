/**
 * GenerateContent — End-to-end content generation pipeline UI
 * 
 * Flow:
 * 1. Select character → Enter topic & settings
 * 2. Hit "Generate" → Watch pipeline progress step by step
 * 3. Review results (script, audio, thumbnail, video)
 * 4. Publish to YouTube or download assets
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Wand2, Mic, ImageIcon, CheckCircle2, AlertCircle, Loader2,
  ArrowLeft, ArrowRight, Sparkles, Play, Download, RotateCcw,
  Settings, Volume2, Video, XCircle,
  FolderOpen, Upload
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type PipelineStepStatus = "pending" | "running" | "complete" | "failed";

type PipelineState = {
  phase: "setup" | "generating" | "results";
  steps: {
    scripting: { status: PipelineStepStatus; result?: string; error?: string };
    voice: { status: PipelineStepStatus; result?: string; error?: string };
    thumbnail: { status: PipelineStepStatus; result?: string; error?: string };
    video: { status: PipelineStepStatus; result?: string; error?: string };
  };
};

const CONTENT_TYPES = [
  { value: "short", label: "Short (30-60s)", desc: "TikTok, Reels, Shorts" },
  { value: "long_form", label: "Long Form (5-15min)", desc: "YouTube videos" },
  { value: "reel", label: "Reel (15-30s)", desc: "Instagram Reels" },
  { value: "story", label: "Story/Narrative", desc: "Storytelling content" },
];

const PLATFORMS = [
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
];

const TONES = [
  { value: "energetic", label: "Energetic & Upbeat" },
  { value: "calm", label: "Calm & Informative" },
  { value: "funny", label: "Funny & Entertaining" },
  { value: "dramatic", label: "Dramatic & Cinematic" },
  { value: "professional", label: "Professional & Polished" },
  { value: "casual", label: "Casual & Conversational" },
];

function StepIndicator({
  step,
  label,
  icon: Icon,
  status,
  result,
  error,
}: {
  step: number;
  label: string;
  icon: any;
  status: PipelineStepStatus;
  result?: string;
  error?: string;
}) {
  const statusColors: Record<PipelineStepStatus, string> = {
    pending: "border-muted-foreground/30 text-muted-foreground",
    running: "border-primary text-primary animate-pulse",
    complete: "border-emerald-500 text-emerald-500",
    failed: "border-red-500 text-red-500",
  };

  const statusIcons: Record<PipelineStepStatus, React.ReactNode> = {
    pending: <span className="text-sm font-mono">{step}</span>,
    running: <Loader2 className="w-4 h-4 animate-spin" />,
    complete: <CheckCircle2 className="w-4 h-4" />,
    failed: <XCircle className="w-4 h-4" />,
  };

  const bgColors: Record<PipelineStepStatus, string> = {
    pending: "bg-muted/30",
    running: "bg-primary/10",
    complete: "bg-emerald-500/10",
    failed: "bg-red-500/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: step * 0.1 }}
      className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-500 ${statusColors[status]} ${bgColors[status]}`}
    >
      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${statusColors[status]}`}>
        {statusIcons[status]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="font-semibold text-sm">{label}</span>
          {status === "running" && (
            <Badge variant="outline" className="text-xs animate-pulse border-primary text-primary">
              Processing...
            </Badge>
          )}
          {status === "failed" && (
            <Badge variant="outline" className="text-xs border-red-500 text-red-500">
              Failed
            </Badge>
          )}
        </div>
        {result && status === "complete" && (
          <p className="text-xs text-emerald-400 mt-1">{result}</p>
        )}
        {error && (
          <p className="text-xs text-red-400 mt-1">{error}</p>
        )}
      </div>
    </motion.div>
  );
}

export default function GenerateContent() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Form state
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState("short");
  const [platform, setPlatform] = useState("youtube");
  const [tone, setTone] = useState("energetic");
  const [duration, setDuration] = useState("");
  const [videoDuration, setVideoDuration] = useState<5 | 10 | 20 | 30 | 60>(5);
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // Pipeline state
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    phase: "setup",
    steps: {
      scripting: { status: "pending" },
      voice: { status: "pending" },
      thumbnail: { status: "pending" },
      video: { status: "pending" },
    },
  });

  // Results
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedThumbnailUrl, setGeneratedThumbnailUrl] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const [contentId, setContentId] = useState<number | null>(null);

  // Fetch user's characters
  const { data: myCharacters, isLoading: charsLoading } = trpc.characters.list.useQuery();

  // API keys check
  const { data: apiKeys } = trpc.settings.getApiKeys.useQuery();

  // Pipeline mutation
  const generateMutation = trpc.pipeline.generate.useMutation({
    onMutate: () => {
      setPipelineState({
        phase: "generating",
        steps: {
          scripting: { status: "running" },
          voice: { status: "pending" },
          thumbnail: { status: "pending" },
          video: { status: "pending" },
        },
      });
    },
    onSuccess: (data) => {
      setContentId(data.contentId);
      setGeneratedScript(data.script);
      setGeneratedAudioUrl(data.audioUrl);
      setGeneratedThumbnailUrl(data.thumbnailUrl);
      setGeneratedVideoUrl(data.videoUrl);

      setPipelineState({
        phase: "results",
        steps: {
          scripting: { status: "complete", result: `Generated with ${data.scriptModel}` },
          voice: { status: "complete", result: `Generated with ${data.voiceModel}` },
          thumbnail: { status: "complete", result: `Generated with ${data.imageModel}` },
          video: { status: "complete", result: data.videoModel?.includes("runway")
              ? `AI video generated with Runway Gen-4 Turbo (${videoDuration}s)`
              : `Video composed with ${data.videoModel || "ffmpeg"}` },
        },
      });

      toast.success("Content generated successfully!");
    },
    onError: (error) => {
      const errorMsg = error.message || "Pipeline failed";

      setPipelineState((prev) => ({
        phase: "generating",
        steps: {
          ...prev.steps,
          scripting: prev.steps.scripting.status === "running"
            ? { status: "failed", error: errorMsg }
            : prev.steps.scripting,
          voice: prev.steps.voice.status === "running"
            ? { status: "failed", error: errorMsg }
            : prev.steps.voice,
          thumbnail: prev.steps.thumbnail.status === "running"
            ? { status: "failed", error: errorMsg }
            : prev.steps.thumbnail,
          video: prev.steps.video.status === "running"
            ? { status: "failed", error: errorMsg }
            : prev.steps.video,
        },
      }));

      toast.error(errorMsg);
    },
  });

  // Simulate step progression for UX (since the actual pipeline runs server-side)
  useEffect(() => {
    if (generateMutation.isPending && pipelineState.phase === "generating") {
      const timer1 = setTimeout(() => {
        setPipelineState((prev) => {
          if (prev.steps.scripting.status !== "running") return prev;
          return {
            ...prev,
            steps: {
              ...prev.steps,
              scripting: { status: "complete", result: "Script generated" },
              voice: { status: "running" },
            },
          };
        });
      }, 8000);

      const timer2 = setTimeout(() => {
        setPipelineState((prev) => {
          if (prev.steps.voice.status !== "running") return prev;
          return {
            ...prev,
            steps: {
              ...prev.steps,
              voice: { status: "complete", result: "Voice generated" },
              thumbnail: { status: "running" },
            },
          };
        });
      }, 18000);

      const timer3 = setTimeout(() => {
        setPipelineState((prev) => {
          if (prev.steps.thumbnail.status !== "running") return prev;
          return {
            ...prev,
            steps: {
              ...prev.steps,
              thumbnail: { status: "complete", result: "Thumbnail generated" },
              video: { status: "running" },
            },
          };
        });
      }, 30000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [generateMutation.isPending, pipelineState.phase]);

  const handleGenerate = () => {
    if (!selectedCharacterId) {
      toast.error("Please select a character first");
      return;
    }
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    generateMutation.mutate({
      characterId: selectedCharacterId,
      contentType: contentType as any,
      platform,
      tone,
      topic,
      duration: duration || undefined,
      videoDuration,
      additionalInstructions: additionalInstructions || undefined,
    });
  };

  const handleReset = () => {
    setPipelineState({
      phase: "setup",
      steps: {
        scripting: { status: "pending" },
        voice: { status: "pending" },
        thumbnail: { status: "pending" },
        video: { status: "pending" },
      },
    });
    setGeneratedScript(null);
    setGeneratedAudioUrl(null);
    setGeneratedThumbnailUrl(null);
    setGeneratedVideoUrl(null);
    setContentId(null);
  };

  const hasScriptKey = apiKeys?.some(
    (k: any) => ["openai", "anthropic", "google"].includes(k.service) && k.isActive
  );

  const selectedCharacter = myCharacters?.find((c: any) => c.id === selectedCharacterId);

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pipeline")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Generate Content
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create content end-to-end: Script → Voice → Image → Video
          </p>
        </div>
      </div>

      {/* API Key Warning */}
      {!hasScriptKey && pipelineState.phase === "setup" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border-2 border-amber-500/50 bg-amber-500/10"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-500 text-sm">No Script API Key Configured</p>
              <p className="text-xs text-muted-foreground mt-1">
                You need at least an OpenAI, Anthropic, or Google API key to generate scripts.
                All four API keys (Script, Voice, Image, Video) are required for the full pipeline.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                onClick={() => navigate("/settings")}
              >
                <Settings className="w-3 h-3 mr-1" />
                Go to Settings
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* ==================== SETUP PHASE ==================== */}
        {pipelineState.phase === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Character Selection */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">1. Select Character</CardTitle>
              </CardHeader>
              <CardContent>
                {charsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading characters...
                  </div>
                ) : myCharacters && myCharacters.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {myCharacters.map((char: any) => (
                      <div
                        key={char.id}
                        onClick={() => setSelectedCharacterId(char.id)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          selectedCharacterId === char.id
                            ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                            : "border-border/50 hover:border-primary/30"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-lg font-bold mb-2 overflow-hidden">
                          {char.avatarUrl ? (
                            <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                          ) : (
                            char.name.charAt(0)
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">{char.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{char.niche || "General"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">No characters yet</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/characters/new")}>
                      Create Your First Character
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Content Settings */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">2. Content Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Topic / Idea *</Label>
                  <Textarea
                    placeholder="e.g., 'Top 5 AI tools that will change your life in 2026' or 'React to the latest iPhone unboxing'"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="mt-1.5 min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Content Type</Label>
                    <Select value={contentType} onValueChange={setContentType}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPES.map((ct) => (
                          <SelectItem key={ct.value} value={ct.value}>
                            <span>{ct.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Platform</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TONES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Script Duration (optional)</Label>
                    <Input
                      placeholder="e.g., 2 minutes, 45 seconds"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Video Duration</Label>
                    <div className="grid grid-cols-5 gap-2 mt-1.5">
                      {([
                        { val: 5 as const, label: "5s", desc: "Quick Clip" },
                        { val: 10 as const, label: "10s", desc: "Short" },
                        { val: 20 as const, label: "20s", desc: "Reel" },
                        { val: 30 as const, label: "30s", desc: "TikTok" },
                        { val: 60 as const, label: "60s", desc: "YT Short" },
                      ]).map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setVideoDuration(opt.val)}
                          className={`p-2 rounded-xl border-2 text-center transition-all duration-200 ${
                            videoDuration === opt.val
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/50 hover:border-primary/30 text-muted-foreground"
                          }`}
                        >
                          <span className="text-sm font-semibold">{opt.label}</span>
                          <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                    {videoDuration > 10 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {Math.ceil(videoDuration / 10)} Runway clips will be chained together
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Additional Instructions (optional)</Label>
                  <Textarea
                    placeholder="Any specific requirements, references, or style notes..."
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </CardContent>
            </Card>

            {/* AI Keys Status */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">3. Your AI Stack</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Script Engine",
                      icon: Wand2,
                      services: ["openai", "anthropic", "google"],
                      required: true,
                    },
                    {
                      label: "Voice Engine",
                      icon: Mic,
                      services: ["elevenlabs", "playht"],
                      required: false,
                    },
                    {
                      label: "Image Engine",
                      icon: ImageIcon,
                      services: ["flux", "venice", "dalle", "replicate", "openai"],
                      required: true,
                    },
                    {
                      label: "Video Engine",
                      icon: Video,
                      services: ["runway"],
                      required: true,
                      note: "Runway Gen-4 Turbo (image → video)",
                    },
                  ].map((engine) => {
                    const hasKey = apiKeys?.some(
                      (k: any) => engine.services.includes(k.service) && k.isActive
                    );
                    const activeKey = apiKeys?.find(
                      (k: any) => engine.services.includes(k.service) && k.isActive
                    );
                    return (
                      <div
                        key={engine.label}
                        className={`p-3 rounded-xl border-2 ${
                          hasKey
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-red-500/30 bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <engine.icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{engine.label}</span>
                        </div>
                        {hasKey ? (
                          <p className="text-xs text-emerald-400">
                            ✓ {activeKey?.service} connected
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            ⚠ Required —{" "}
                            <span
                              className="underline cursor-pointer hover:text-primary"
                              onClick={() => navigate("/settings")}
                            >
                              Add key
                            </span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={!selectedCharacterId || !topic.trim() || !hasScriptKey}
                className="gap-2 px-8"
              >
                <Sparkles className="w-5 h-5" />
                Generate Content
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ==================== GENERATING PHASE ==================== */}
        {pipelineState.phase === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  Generating Content for {selectedCharacter?.name || "Character"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Topic: "{topic}" · {platform} · {contentType}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <StepIndicator
                  step={1}
                  label="Script Generation"
                  icon={Wand2}
                  status={pipelineState.steps.scripting.status}
                  result={pipelineState.steps.scripting.result}
                  error={pipelineState.steps.scripting.error}
                />
                <StepIndicator
                  step={2}
                  label="Voice Generation"
                  icon={Mic}
                  status={pipelineState.steps.voice.status}
                  result={pipelineState.steps.voice.result}
                  error={pipelineState.steps.voice.error}
                />
                <StepIndicator
                  step={3}
                  label="Thumbnail / Image Generation"
                  icon={ImageIcon}
                  status={pipelineState.steps.thumbnail.status}
                  result={pipelineState.steps.thumbnail.result}
                  error={pipelineState.steps.thumbnail.error}
                />
                <StepIndicator
                  step={4}
                  label="Video Composition"
                  icon={Video}
                  status={pipelineState.steps.video.status}
                  result={pipelineState.steps.video.result}
                  error={pipelineState.steps.video.error}
                />
              </CardContent>
            </Card>

            {/* Show error retry */}
            {(pipelineState.steps.scripting.status === "failed" ||
              pipelineState.steps.voice.status === "failed" ||
              pipelineState.steps.thumbnail.status === "failed" ||
              pipelineState.steps.video.status === "failed") && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Start Over
                </Button>
                <Button variant="outline" onClick={() => navigate("/settings")} className="gap-2">
                  <Settings className="w-4 h-4" />
                  Check API Keys
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* ==================== RESULTS PHASE ==================== */}
        {pipelineState.phase === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Pipeline Summary */}
            <Card className="border-border/50 border-emerald-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                  Content Generated Successfully
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <StepIndicator
                  step={1}
                  label="Script Generation"
                  icon={Wand2}
                  status={pipelineState.steps.scripting.status}
                  result={pipelineState.steps.scripting.result}
                />
                <StepIndicator
                  step={2}
                  label="Voice Generation"
                  icon={Mic}
                  status={pipelineState.steps.voice.status}
                  result={pipelineState.steps.voice.result}
                />
                <StepIndicator
                  step={3}
                  label="Thumbnail / Image Generation"
                  icon={ImageIcon}
                  status={pipelineState.steps.thumbnail.status}
                  result={pipelineState.steps.thumbnail.result}
                />
                <StepIndicator
                  step={4}
                  label="Video Composition"
                  icon={Video}
                  status={pipelineState.steps.video.status}
                  result={pipelineState.steps.video.result}
                />
              </CardContent>
            </Card>



            {/* Generated Video (show first as the main output) */}
            {generatedVideoUrl && (
              <Card className="border-border/50 border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    Generated Video
                    <Badge variant="outline" className="text-xs border-primary text-primary">Main Output</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl overflow-hidden border border-border/50 bg-black">
                    <video
                      controls
                      className="w-full h-auto max-h-[500px]"
                      src={generatedVideoUrl}
                      poster={generatedThumbnailUrl || undefined}
                    >
                      Your browser does not support the video element.
                    </video>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={generatedVideoUrl} download target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3 mr-1" />
                        Download MP4
                      </a>
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        toast.info("YouTube upload coming soon! For now, download the video and upload manually.");
                      }}
                    >
                      <Upload className="w-3 h-3" />
                      Publish to YouTube
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Script */}
            {generatedScript && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-primary" />
                      Generated Script
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedScript);
                        toast.success("Script copied to clipboard!");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-accent/30 rounded-xl p-4 max-h-[400px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                      {generatedScript}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Audio */}
            {generatedAudioUrl && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    Generated Voice Audio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <audio controls className="w-full" src={generatedAudioUrl}>
                    Your browser does not support the audio element.
                  </audio>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={generatedAudioUrl} download target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3 mr-1" />
                        Download MP3
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Thumbnail */}
            {generatedThumbnailUrl && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    Generated Thumbnail
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl overflow-hidden border border-border/50">
                    <img
                      src={generatedThumbnailUrl}
                      alt="Generated thumbnail"
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={generatedThumbnailUrl} download target="_blank" rel="noopener noreferrer">
                        <Download className="w-3 h-3 mr-1" />
                        Download Image
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Generate Another
              </Button>
              <Button variant="outline" onClick={() => navigate("/library")} className="gap-2">
                <FolderOpen className="w-4 h-4" />
                View in Library
              </Button>
              <Button variant="outline" onClick={() => navigate("/pipeline")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Pipeline
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
