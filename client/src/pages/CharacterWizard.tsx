/*
 * Character Creation Wizard — Step-by-step flow to create an AI character
 * Steps: Basic Info → Personality → Voice & Style → Platforms → Review
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, ArrowRight, Check, User, Brain, Mic, Globe, Sparkles,
  Palette, Bot, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const STEPS = [
  { id: 0, title: "Basic Info", icon: User, desc: "Name, niche, and avatar" },
  { id: 1, title: "Personality", icon: Brain, desc: "Backstory and traits" },
  { id: 2, title: "Voice & Style", icon: Mic, desc: "Voice and visual style" },
  { id: 3, title: "Platforms", icon: Globe, desc: "Where to publish" },
  { id: 4, title: "Review", icon: Check, desc: "Confirm and create" },
];

const NICHES = [
  "Tech", "Gaming", "Finance", "Fitness", "Cooking", "Travel",
  "Education", "Comedy", "Music", "Fashion", "Wellness", "News",
  "Science", "Art", "Lifestyle", "Business",
];

const VISUAL_STYLES = [
  { key: "photorealistic", label: "Photorealistic", desc: "Hyper-realistic human appearance", icon: "📸" },
  { key: "anime", label: "Anime", desc: "Japanese animation style", icon: "🎨" },
  { key: "cartoon", label: "Cartoon", desc: "Stylized cartoon look", icon: "🎭" },
  { key: "3d", label: "3D Rendered", desc: "Pixar-like 3D character", icon: "💎" },
];

const VOICE_STYLES = [
  "Warm & Friendly", "Professional & Authoritative", "Energetic & Upbeat",
  "Calm & Soothing", "Witty & Sarcastic", "Mysterious & Deep",
];

const PLATFORMS = [
  { key: "youtube", label: "YouTube", icon: "📺" },
  { key: "tiktok", label: "TikTok", icon: "🎵" },
  { key: "instagram", label: "Instagram", icon: "📷" },
  { key: "twitter", label: "X / Twitter", icon: "🐦" },
  { key: "twitch", label: "Twitch", icon: "🎮" },
  { key: "podcast", label: "Podcast", icon: "🎙️" },
];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
};

export default function CharacterWizard() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  // Form state
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("");
  const [personality, setPersonality] = useState("");
  const [backstory, setBackstory] = useState("");
  const [voiceStyle, setVoiceStyle] = useState("");
  const [visualStyle, setVisualStyle] = useState<"photorealistic" | "anime" | "cartoon" | "3d">("photorealistic");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const createCharacter = trpc.characters.create.useMutation({
    onSuccess: () => {
      toast.success("Character created! You can now start generating content.");
      navigate("/characters");
    },
    onError: () => {
      toast.error("Failed to create character. Please try again.");
    },
  });

  const nextStep = () => {
    if (step === 0 && !name.trim()) {
      toast.error("Please enter a character name.");
      return;
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleCreate = () => {
    createCharacter.mutate({
      name,
      niche: niche || undefined,
      personality: personality || undefined,
      backstory: backstory || undefined,
      voiceStyle: voiceStyle || undefined,
      visualStyle: visualStyle || undefined,
      platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
    });
  };

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate("/characters")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-primary" />
            Create New Character
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Step {step + 1} of {STEPS.length}: {STEPS[step].desc}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isCompleted = i < step;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => { setDirection(i > step ? 1 : -1); setStep(i); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                    ? "bg-primary/10 text-primary"
                    : "bg-accent text-muted-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{s.title}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${isCompleted ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          {/* Step 0: Basic Info */}
          {step === 0 && (
            <Card className="border-border/50">
              <CardContent className="p-8 space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Character Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Nova, Kai, Aura..."
                    className="w-full h-12 px-4 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-3 block">Content Niche</label>
                  <div className="flex flex-wrap gap-2">
                    {NICHES.map((n) => (
                      <Badge
                        key={n}
                        variant={niche === n ? "default" : "outline"}
                        className={`cursor-pointer px-3 py-1.5 text-sm transition-all ${
                          niche === n ? "bg-primary text-primary-foreground" : "hover:border-primary/50"
                        }`}
                        onClick={() => setNiche(niche === n ? "" : n)}
                      >
                        {n}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Personality */}
          {step === 1 && (
            <Card className="border-border/50">
              <CardContent className="p-8 space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Personality Traits</label>
                  <p className="text-xs text-muted-foreground mb-3">Describe how your character talks and behaves</p>
                  <textarea
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    placeholder="e.g., Witty and sarcastic with a heart of gold. Loves making tech jokes and explaining complex topics in simple terms..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Backstory</label>
                  <p className="text-xs text-muted-foreground mb-3">Give your character depth and relatability</p>
                  <textarea
                    value={backstory}
                    onChange={(e) => setBackstory(e.target.value)}
                    placeholder="e.g., A former Silicon Valley engineer who left the corporate world to share honest tech reviews. Known for their brutally honest takes..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Voice & Style */}
          {step === 2 && (
            <Card className="border-border/50">
              <CardContent className="p-8 space-y-8">
                <div>
                  <label className="text-sm font-medium mb-3 block">Visual Style</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {VISUAL_STYLES.map((vs) => (
                      <button
                        key={vs.key}
                        onClick={() => setVisualStyle(vs.key as any)}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          visualStyle === vs.key
                            ? "border-primary bg-primary/10"
                            : "border-border/50 hover:border-primary/30"
                        }`}
                      >
                        <span className="text-3xl block mb-2">{vs.icon}</span>
                        <span className="text-sm font-medium block">{vs.label}</span>
                        <span className="text-xs text-muted-foreground">{vs.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-3 block">Voice Style</label>
                  <div className="flex flex-wrap gap-2">
                    {VOICE_STYLES.map((vs) => (
                      <Badge
                        key={vs}
                        variant={voiceStyle === vs ? "default" : "outline"}
                        className={`cursor-pointer px-3 py-1.5 text-sm transition-all ${
                          voiceStyle === vs ? "bg-primary text-primary-foreground" : "hover:border-primary/50"
                        }`}
                        onClick={() => setVoiceStyle(voiceStyle === vs ? "" : vs)}
                      >
                        <Mic className="w-3 h-3 mr-1" />
                        {vs}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Platforms */}
          {step === 3 && (
            <Card className="border-border/50">
              <CardContent className="p-8">
                <label className="text-sm font-medium mb-3 block">Select Platforms to Publish On</label>
                <p className="text-xs text-muted-foreground mb-6">You can add more platforms later in Settings</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => togglePlatform(p.key)}
                      className={`p-6 rounded-xl border text-center transition-all ${
                        selectedPlatforms.includes(p.key)
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <span className="text-4xl block mb-3">{p.icon}</span>
                      <span className="text-sm font-medium">{p.label}</span>
                      {selectedPlatforms.includes(p.key) && (
                        <Check className="w-4 h-4 text-primary mx-auto mt-2" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <Card className="border-border/50">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{name || "Unnamed Character"}</h2>
                    <p className="text-sm text-muted-foreground">{niche || "No niche selected"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-accent/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Personality</span>
                    <p className="text-sm mt-1">{personality || "Not specified"}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-accent/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Backstory</span>
                    <p className="text-sm mt-1">{backstory || "Not specified"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-accent/50">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Visual Style</span>
                      <p className="text-sm mt-1 flex items-center gap-2">
                        <Palette className="w-4 h-4 text-primary" />
                        {VISUAL_STYLES.find((v) => v.key === visualStyle)?.label || "Photorealistic"}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-accent/50">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voice Style</span>
                      <p className="text-sm mt-1 flex items-center gap-2">
                        <Mic className="w-4 h-4 text-primary" />
                        {voiceStyle || "Not selected"}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-accent/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Platforms</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedPlatforms.length > 0 ? (
                        selectedPlatforms.map((p) => (
                          <Badge key={p} variant="outline" className="px-3 py-1">
                            {PLATFORMS.find((pl) => pl.key === p)?.icon}{" "}
                            {PLATFORMS.find((pl) => pl.key === p)?.label}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No platforms selected</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={step === 0}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={nextStep} className="gap-2">
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleCreate}
            disabled={createCharacter.isPending || !name.trim()}
            className="gap-2"
          >
            {createCharacter.isPending ? (
              <>Creating...</>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Create Character
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
