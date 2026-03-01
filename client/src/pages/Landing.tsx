/*
 * Landing Page — Marketing site for AI CreatorOS
 * Design: Dark hero with electric blue glow, character showcase, feature grid, pricing, CTA
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
// Auth is handled by Clerk — sign-in/sign-up routes
import {
  Zap, Users, Clapperboard, BarChart3, DollarSign, MessageCircle,
  ArrowRight, Play, Sun, Moon, Sparkles, Globe, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663355511618/VYneUcnZvTL9FVkbHuDg6r/hero-bg-dark-7qbLFDrqWWpWfLJ5GTBnnj.png";
const LANDING_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663355511618/VYneUcnZvTL9FVkbHuDg6r/landing-hero-b96dgTWhgkCtQy6qaSUD9k.webp";
const CHAR1 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663355511618/VYneUcnZvTL9FVkbHuDg6r/ai-character-1-6dhCsgGqumtaZH6c7azPzf.webp";
const CHAR2 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663355511618/VYneUcnZvTL9FVkbHuDg6r/ai-character-2-24x8c4CYv6kSDiNcWZCSor.webp";
const CHAR3 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663355511618/VYneUcnZvTL9FVkbHuDg6r/ai-character-3-DryEzWBDVzwnVw7HcPDear.webp";

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.12 } } };
const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

const features = [
  { icon: Users, title: "Character Studio", desc: "Create photorealistic AI characters with consistent faces, unique voices, and distinct personalities." },
  { icon: Clapperboard, title: "Content Pipeline", desc: "Automated end-to-end content creation — from script to voice to video to publication." },
  { icon: Globe, title: "Multi-Platform Distribution", desc: "Publish simultaneously to YouTube, TikTok, Instagram, and more with one click." },
  { icon: BarChart3, title: "Deep Analytics", desc: "Track views, engagement, revenue, and audience demographics across all characters." },
  { icon: DollarSign, title: "5 Revenue Streams", desc: "Ad revenue, fan memberships, brand deals, merchandise, and IP licensing — all built in." },
  { icon: MessageCircle, title: "AI Fan Engagement", desc: "AI-powered DMs and comments that respond to fans 24/7 in your character's voice." },
];

const characterShowcase = [
  { name: "Nova", role: "Tech Reviewer", img: CHAR1, subs: "245K", platform: "YouTube" },
  { name: "Kai", role: "Gen-Z Entertainer", img: CHAR2, subs: "1.2M", platform: "TikTok" },
  { name: "Aura", role: "Wellness Guide", img: CHAR3, subs: "89K", platform: "Instagram" },
];

const stats = [
  { value: "2.4M+", label: "Monthly Views" },
  { value: "$48K+", label: "Monthly Revenue" },
  { value: "94%", label: "AI Automation" },
  { value: "< 30s", label: "Fan Response Time" },
];

const pricingPlans = [
  {
    key: "free",
    name: "Free",
    price: "₹0",
    interval: "forever",
    description: "Get started with AI content creation",
    features: [
      "1 AI Character",
      "10 content pieces/month",
      "Basic analytics",
      "Community support",
      "Watermarked exports",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "₹2,499",
    interval: "/month",
    description: "Scale your AI content empire",
    features: [
      "10 AI Characters",
      "Unlimited content",
      "Advanced analytics",
      "Priority support",
      "No watermarks",
      "Multi-platform distribution",
      "Fan membership tools",
      "Brand deal marketplace",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "₹7,999",
    interval: "/month",
    description: "For agencies and studios",
    features: [
      "Unlimited AI Characters",
      "Unlimited content",
      "White-label exports",
      "Dedicated support",
      "Custom AI model training",
      "API access",
      "Team collaboration",
      "IP licensing tools",
      "Revenue analytics suite",
    ],
    cta: "Go Enterprise",
    popular: false,
  },
];

export default function Landing() {
  const [email, setEmail] = useState("");
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();

  const joinWaitlist = trpc.waitlist.join.useMutation({
    onSuccess: () => {
      toast.success("You're on the waitlist! We'll be in touch soon.");
      setEmail("");
    },
    onError: (err) => {
      if (err.message.includes("Duplicate")) {
        toast.info("You're already on the waitlist!");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      setEmail("");
    },
  });

  const createOrder = trpc.billing.createOrder.useMutation({
    onSuccess: (data) => {
      // Open Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "AI CreatorOS",
        description: `Upgrade to ${pendingPlan} plan`,
        order_id: data.orderId,
        handler: function (response: any) {
          // Verify payment on server
          verifyPayment.mutate({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            plan: pendingPlan as "pro" | "enterprise",
          });
        },
        theme: { color: "#6366f1" },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    },
    onError: () => {
      toast.error("Failed to create order. Please try again.");
    },
  });

  const verifyPayment = trpc.billing.verifyPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment successful! Your plan has been upgraded.");
      navigate("/dashboard");
    },
    onError: () => {
      toast.error("Payment verification failed. Please contact support.");
    },
  });

  const [pendingPlan, setPendingPlan] = useState("");

  const handleWaitlist = () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    joinWaitlist.mutate({ email, source: "landing" });
  };

  const handlePricingCta = (planKey: string) => {
    if (!isAuthenticated) {
      navigate("/sign-in");
      return;
    }
    if (planKey === "free") {
      navigate("/dashboard");
    } else {
      setPendingPlan(planKey);
      createOrder.mutate({
        plan: planKey as "pro" | "enterprise",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">AI CreatorOS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#characters" className="hover:text-foreground transition-colors">Characters</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-8 h-8">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {isAuthenticated ? (
              <Button size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
                Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate("/sign-in")}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => navigate("/sign-up")} className="gap-1.5">
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-20 dark:opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>

        <div className="container relative z-10">
          <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-3xl mx-auto text-center">
            <motion.div variants={fadeUp}>
              <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm gap-2 border-primary/30 bg-primary/5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                The Future of Content Creation
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              Build an AI Content Empire.{" "}
              <span className="text-primary">Automatically.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Create AI characters, generate unlimited content, distribute across every platform,
              and monetize with 5 revenue streams — all from one command center.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className="flex w-full sm:w-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleWaitlist()}
                  className="flex-1 sm:w-72 h-11 px-4 rounded-l-xl border border-r-0 border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button
                  onClick={handleWaitlist}
                  disabled={joinWaitlist.isPending}
                  className="h-11 rounded-l-none rounded-r-xl px-6"
                >
                  {joinWaitlist.isPending ? "Joining..." : "Join Waitlist"}
                </Button>
              </div>
              <Button variant="outline" size="lg" className="gap-2 h-11" onClick={() => navigate("/dashboard")}>
                <Play className="w-4 h-4" />
                Live Demo
              </Button>
            </motion.div>

            <motion.p variants={fadeUp} className="mt-4 text-xs text-muted-foreground">
              Free to start. No credit card required.
            </motion.p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-16 max-w-5xl mx-auto rounded-2xl overflow-hidden border border-border/50 shadow-2xl dark:glow-blue"
          >
            <img src={LANDING_HERO} alt="AI CreatorOS Dashboard" className="w-full" />
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 border-y border-border/50 bg-accent/30">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold font-mono text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs border-primary/30 bg-primary/5">Features</Badge>
            <h2 className="text-3xl font-bold tracking-tight">Everything You Need to Run an AI Content Empire</h2>
            <p className="text-muted-foreground mt-4">From character creation to revenue collection — one platform, fully automated.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="border-border/50 hover:border-primary/30 transition-all duration-300 dark:hover:glow-blue-sm group">
                  <CardContent className="p-6">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Character Showcase */}
      <section id="characters" className="py-24 bg-accent/20">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs border-primary/30 bg-primary/5">Meet the Cast</Badge>
            <h2 className="text-3xl font-bold tracking-tight">AI Characters That Feel Real</h2>
            <p className="text-muted-foreground mt-4">Each character has a unique personality, voice, and visual style — indistinguishable from human creators.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {characterShowcase.map((char) => (
              <motion.div
                key={char.name}
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Card className="overflow-hidden border-border/50 hover:border-primary/30 transition-all dark:hover:glow-blue-sm">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img src={char.img} alt={char.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-bold text-white">{char.name}</h3>
                      <p className="text-sm text-white/70">{char.role}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-white/20 text-white border-white/20 text-xs backdrop-blur-sm">
                          {char.platform}
                        </Badge>
                        <Badge className="bg-white/20 text-white border-white/20 text-xs backdrop-blur-sm">
                          {char.subs} subs
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs border-primary/30 bg-primary/5">How It Works</Badge>
            <h2 className="text-3xl font-bold tracking-tight">From Zero to Content Empire in 4 Steps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { step: "01", title: "Create a Character", desc: "Design your AI persona — face, voice, personality, and style.", icon: Users },
              { step: "02", title: "Generate Content", desc: "AI writes scripts, generates voice, creates visuals, and edits video.", icon: Sparkles },
              { step: "03", title: "Distribute Everywhere", desc: "Auto-publish to YouTube, TikTok, Instagram, and more.", icon: Globe },
              { step: "04", title: "Monetize & Scale", desc: "Earn from ads, memberships, brand deals, and merch.", icon: DollarSign },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-primary font-bold">STEP {s.step}</span>
                    <h3 className="text-lg font-semibold mt-1">{s.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-accent/20">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs border-primary/30 bg-primary/5">Pricing</Badge>
            <h2 className="text-3xl font-bold tracking-tight">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground mt-4">
              Start free. Upgrade when you're ready to scale. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <motion.div
                key={plan.key}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Card
                  className={`relative overflow-hidden h-full ${
                    plan.popular
                      ? "border-primary dark:glow-blue-border"
                      : "border-border/50"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0">
                      <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground text-xs px-3 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-8 flex flex-col h-full">
                    <div>
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                      <div className="mt-6 flex items-baseline gap-1">
                        <span className="text-4xl font-bold font-mono">{plan.price}</span>
                        <span className="text-muted-foreground text-sm">{plan.interval}</span>
                      </div>
                    </div>

                    <ul className="mt-8 space-y-3 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handlePricingCta(plan.key)}
                      disabled={createOrder.isPending || verifyPayment.isPending}
                      className={`mt-8 w-full ${
                        plan.popular ? "" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                      variant={plan.popular ? "default" : "secondary"}
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Ready to Build Your AI Content Empire?</h2>
            <p className="text-muted-foreground text-lg">
              Join the waitlist and be among the first to create AI characters that earn revenue 24/7.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {isAuthenticated ? (
                <Button size="lg" onClick={() => navigate("/dashboard")} className="gap-2">
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button size="lg" onClick={() => navigate("/sign-up")} className="gap-2">
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-bold">AI CreatorOS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 AI CreatorOS. The future of content creation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
