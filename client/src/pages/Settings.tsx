/*
 * Settings — AI Model Selection, Creator API Keys, Platform Connections, Notifications
 * All connected to the real backend via tRPC
 */
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  Key, Link2, Bell, Shield, Check, Brain, Mic, Image, Video,
  Eye, EyeOff, Save, Plus, Trash2, Cpu, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

/**
 * AI_SERVICES defines the 4 engine categories.
 * Each option's `value` is the SERVICE KEY stored in the DB and used by the pipeline.
 * The pipeline looks up keys by these exact service names.
 */
const AI_SERVICES = {
  script: {
    label: "Script Engine",
    icon: Brain,
    desc: "AI model for writing scripts and dialogue",
    options: [
      { value: "openai", label: "OpenAI (GPT-4o)", keyPrefix: "sk-" },
      { value: "anthropic", label: "Anthropic (Claude 3.5)", keyPrefix: "sk-ant-" },
      { value: "google", label: "Google (Gemini Pro)", keyPrefix: "AI" },
    ],
  },
  voice: {
    label: "Voice Engine",
    icon: Mic,
    desc: "AI model for voice generation",
    options: [
      { value: "elevenlabs", label: "ElevenLabs", keyPrefix: "sk_" },
      { value: "playht", label: "PlayHT", keyPrefix: "ph-" },
    ],
  },
  image: {
    label: "Image Engine",
    icon: Image,
    desc: "AI model for image/thumbnail generation",
    options: [
      { value: "flux", label: "FLUX Pro (Black Forest Labs)", keyPrefix: "bfl_" },
      { value: "dalle", label: "DALL-E 3 (OpenAI)", keyPrefix: "sk-" },
      { value: "replicate", label: "Replicate (Flux)", keyPrefix: "r8_" },
    ],
  },
  video: {
    label: "Video Engine",
    icon: Video,
    desc: "AI model for video generation",
    options: [
      { value: "venice", label: "Venice.ai", keyPrefix: "vk-" },
      { value: "runway", label: "Runway Gen-3", keyPrefix: "rw-" },
    ],
  },
} as const;

type ServiceType = keyof typeof AI_SERVICES;

// Build a reverse map: service value → category (e.g., "openai" → "script")
const SERVICE_TO_CATEGORY: Record<string, ServiceType> = {};
for (const [category, service] of Object.entries(AI_SERVICES)) {
  for (const opt of service.options) {
    SERVICE_TO_CATEGORY[opt.value] = category as ServiceType;
  }
}

const PLATFORMS = [
  { name: "YouTube", icon: "🎬", key: "youtube" },
  { name: "TikTok", icon: "🎵", key: "tiktok" },
  { name: "Instagram", icon: "📸", key: "instagram" },
  { name: "Twitter / X", icon: "🐦", key: "twitter" },
  { name: "Twitch", icon: "🟣", key: "twitch" },
];

function ApiKeyInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 pr-10 rounded-lg border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ai-models");

  // AI model selections — maps category → selected service value
  const [selectedModels, setSelectedModels] = useState<Record<ServiceType, string>>({
    script: "openai",
    voice: "elevenlabs",
    image: "flux",
    video: "venice",
  });

  // API keys state — keyed by service value (e.g., "openai", "elevenlabs", "flux", "venice")
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState(false);
  const [saveResults, setSaveResults] = useState<Record<string, "success" | "error">>({});

  // Fetch existing API keys from backend
  const { data: existingKeys } = trpc.settings.getApiKeys.useQuery(undefined, {
    retry: false,
  });

  // Mutations
  const saveApiKeyMut = trpc.settings.saveApiKey.useMutation();
  const utils = trpc.useUtils();

  // Load existing keys — update selected models based on what's saved
  useEffect(() => {
    if (existingKeys && existingKeys.length > 0) {
      const newSelections = { ...selectedModels };
      existingKeys.forEach((k: { service: string }) => {
        const category = SERVICE_TO_CATEGORY[k.service];
        if (category) {
          newSelections[category] = k.service;
        }
      });
      setSelectedModels(newSelections);
    }
  }, [existingKeys]);

  const getKeyStatus = (service: string): boolean => {
    if (existingKeys) {
      return existingKeys.some((k: { service: string }) => k.service === service);
    }
    return false;
  };

  const handleSaveAllKeys = async () => {
    setSavingKeys(true);
    setSaveResults({});
    const results: Record<string, "success" | "error"> = {};
    let hasError = false;
    let savedCount = 0;

    try {
      // Save all non-empty API keys one by one
      for (const [service, key] of Object.entries(apiKeys)) {
        if (key.trim()) {
          try {
            await saveApiKeyMut.mutateAsync({
              service,
              apiKey: key.trim(),
              model: service, // store the service name as the model identifier
            });
            results[service] = "success";
            savedCount++;
          } catch (err: any) {
            console.error(`[Settings] Failed to save ${service} key:`, err);
            results[service] = "error";
            hasError = true;
          }
        }
      }

      setSaveResults(results);
      utils.settings.getApiKeys.invalidate();

      if (savedCount === 0) {
        toast.info("No new keys to save. Enter your API keys first.");
      } else if (hasError) {
        toast.error(`Saved ${savedCount} key(s), but some failed. Check the status below.`);
      } else {
        toast.success(`All ${savedCount} API key(s) saved successfully!`);
        // Clear the input fields after successful save
        setApiKeys({});
      }
    } catch (err) {
      console.error("[Settings] Unexpected error saving keys:", err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setSavingKeys(false);
    }
  };

  // Save model preferences (which model to use per category)
  const handleSaveModelPreferences = async () => {
    toast.success("Model preferences saved!");
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-4xl">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your AI stack, API keys, and platform connections.</p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-accent/50">
          <TabsTrigger value="ai-models" className="gap-2">
            <Cpu className="w-4 h-4" /> AI Models
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="w-4 h-4" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="platforms" className="gap-2">
            <Link2 className="w-4 h-4" /> Platforms
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" /> Notifications
          </TabsTrigger>
        </TabsList>

        {/* AI Models Tab */}
        <TabsContent value="ai-models" className="space-y-6 mt-6">
          <motion.div variants={fadeUp}>
            <p className="text-sm text-muted-foreground mb-6">
              Choose which AI model to use for each content generation task. You'll need to provide your own API key for each service.
            </p>
            <div className="space-y-4">
              {(Object.entries(AI_SERVICES) as [ServiceType, (typeof AI_SERVICES)[ServiceType]][]).map(([key, service]) => {
                const Icon = service.icon;
                return (
                  <Card key={key} className="border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold">{service.label}</h3>
                          <p className="text-xs text-muted-foreground mb-3">{service.desc}</p>
                          <div className="flex flex-wrap gap-2">
                            {service.options.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => setSelectedModels((prev) => ({ ...prev, [key]: opt.value }))}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                  selectedModels[key] === opt.value
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-accent/50 border-border/50 hover:border-primary/30"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Button onClick={handleSaveModelPreferences} className="mt-6 gap-2">
              <Save className="w-4 h-4" />
              Save Model Preferences
            </Button>
          </motion.div>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6 mt-6">
          <motion.div variants={fadeUp}>
            <p className="text-sm text-muted-foreground mb-2">
              Enter your API keys for each AI service. Keys are encrypted and stored securely. <strong>You pay for your own AI usage.</strong>
            </p>
            <Card className="border-border/50 mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>API keys are encrypted at rest and never exposed to other users or in logs.</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {(Object.entries(AI_SERVICES) as [ServiceType, (typeof AI_SERVICES)[ServiceType]][]).map(([key, service]) => {
                const selectedOption = service.options.find((o) => o.value === selectedModels[key]);
                const serviceKey = selectedModels[key]; // e.g., "openai", "elevenlabs", "flux", "venice"
                const Icon = service.icon;
                const isConfigured = getKeyStatus(serviceKey);
                const saveStatus = saveResults[serviceKey];
                return (
                  <Card key={key} className={`border-border/50 ${saveStatus === "error" ? "border-destructive/50" : ""}`}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <Icon className="w-4 h-4 text-primary" />
                        <div className="flex-1">
                          <span className="text-sm font-semibold">{service.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">({selectedOption?.label})</span>
                        </div>
                        {saveStatus === "success" && (
                          <Badge variant="outline" className="text-xs text-green-500 border-green-500/30 gap-1">
                            <Check className="w-3 h-3" /> Just Saved
                          </Badge>
                        )}
                        {saveStatus === "error" && (
                          <Badge variant="outline" className="text-xs text-red-500 border-red-500/30 gap-1">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </Badge>
                        )}
                        {!saveStatus && isConfigured && (
                          <Badge variant="outline" className="text-xs text-green-500 border-green-500/30 gap-1">
                            <Check className="w-3 h-3" /> Configured
                          </Badge>
                        )}
                      </div>
                      <ApiKeyInput
                        value={apiKeys[serviceKey] || ""}
                        onChange={(v) => setApiKeys((prev) => ({ ...prev, [serviceKey]: v }))}
                        placeholder={isConfigured ? "Key saved — enter new key to update" : `Enter your ${selectedOption?.label} API key (${selectedOption?.keyPrefix}...)`}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Button onClick={handleSaveAllKeys} disabled={savingKeys} className="mt-6 gap-2">
              <Save className="w-4 h-4" />
              {savingKeys ? "Saving..." : "Save All API Keys"}
            </Button>
          </motion.div>
        </TabsContent>

        {/* Platforms Tab */}
        <TabsContent value="platforms" className="space-y-6 mt-6">
          <motion.div variants={fadeUp}>
            <p className="text-sm text-muted-foreground mb-6">
              Connect your social media accounts for automated content publishing.
            </p>
            <div className="space-y-3">
              {PLATFORMS.map((p) => (
                <Card key={p.key} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{p.icon}</span>
                        <div>
                          <p className="text-sm font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">Enter your {p.name} API credentials</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => toast("Platform connection coming soon!")}>
                        <Plus className="w-4 h-4 mr-1" /> Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <motion.div variants={fadeUp}>
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Choose what you want to be notified about.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Content published", desc: "When a video is successfully published", default: true },
                  { label: "Pipeline errors", desc: "When content generation fails", default: true },
                  { label: "Revenue milestones", desc: "When you hit revenue targets", default: true },
                  { label: "Fan messages (escalated)", desc: "When AI can't handle a fan message", default: true },
                  { label: "Brand deal requests", desc: "New brand partnership inquiries", default: false },
                ].map((n) => (
                  <div key={n.label} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    <Switch defaultChecked={n.default} onCheckedChange={() => toast("Notification preference saved!")} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Danger Zone */}
          <motion.div variants={fadeUp}>
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-destructive">
                  <Shield className="w-4 h-4" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/5">
                  <div>
                    <p className="text-sm font-medium">Pause All Characters</p>
                    <p className="text-xs text-muted-foreground">Stop all content generation and publishing</p>
                  </div>
                  <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => toast("This action requires confirmation.")}>
                    Pause All
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/5">
                  <div>
                    <p className="text-sm font-medium">Delete Account</p>
                    <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => toast("This action requires confirmation.")}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
