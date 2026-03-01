/*
 * Settings — Account, API keys, platform connections, preferences
 */
import { motion } from "framer-motion";
import { Key, Link2, Bell, Shield, Palette, Globe, Check, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const platforms = [
  { name: "YouTube", connected: true, account: "@AICreatorOS", icon: "🎬" },
  { name: "TikTok", connected: true, account: "@aicreator", icon: "🎵" },
  { name: "Instagram", connected: true, account: "@ai.creatoros", icon: "📸" },
  { name: "Twitter / X", connected: false, account: null, icon: "🐦" },
  { name: "Twitch", connected: false, account: null, icon: "🟣" },
];

const apiKeys = [
  { name: "OpenAI", status: "active", lastUsed: "2 min ago", key: "sk-...4f2a" },
  { name: "ElevenLabs", status: "active", lastUsed: "15 min ago", key: "el-...8b3c" },
  { name: "Replicate", status: "active", lastUsed: "1 hr ago", key: "r8-...2d1e" },
  { name: "Runway", status: "inactive", lastUsed: "Never", key: "Not configured" },
];

export default function Settings() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-4xl">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your platform, API keys, and preferences.</p>
      </motion.div>

      {/* Platform Connections */}
      <motion.div variants={fadeUp}>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Platform Connections
            </CardTitle>
            <CardDescription>Connect your social media accounts for automated publishing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {platforms.map((p) => (
              <div key={p.name} className="flex items-center justify-between p-3 rounded-xl bg-accent/30">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    {p.connected && <p className="text-xs text-muted-foreground">{p.account}</p>}
                  </div>
                </div>
                {p.connected ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20 gap-1">
                      <Check className="w-3 h-3" />
                      Connected
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => toast("Disconnect coming soon!")}>
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => toast("Platform connection coming soon!")}>
                    Connect
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* API Keys */}
      <motion.div variants={fadeUp}>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              API Keys
            </CardTitle>
            <CardDescription>Manage your AI service API keys for content generation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {apiKeys.map((api) => (
              <div key={api.name} className="flex items-center justify-between p-3 rounded-xl bg-accent/30">
                <div>
                  <p className="text-sm font-semibold">{api.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{api.key}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className={`text-xs ${api.status === "active" ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground border-border"}`}
                    >
                      {api.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">Last: {api.lastUsed}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toast("API key management coming soon!")}>
                    Edit
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-2" onClick={() => toast("Add API key coming soon!")}>
              + Add API Key
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div variants={fadeUp}>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Notifications
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
    </motion.div>
  );
}
