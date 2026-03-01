# AI CreatorOS - Full Build TODO

## Phase 1: Upgrade to Full-Stack
- [x] Run webdev_add_feature for web-db-user
- [x] Design database schema (users, waitlist, characters, subscriptions, api_keys)
- [x] Create migration scripts

## Phase 2: Stripe Integration
- [x] Run webdev_add_feature for stripe
- [x] Create pricing plans (Free, Pro, Enterprise)
- [x] Build subscription management
- [x] Stripe checkout integration for Pro and Enterprise
- [x] Webhook handler for payment events

## Phase 3: Auth + Pricing + Waitlist
- [x] Build auth system (Manus OAuth integrated)
- [x] Add pricing section to landing page (Free $0, Pro $29, Enterprise $99)
- [x] Build waitlist API endpoint + database storage
- [x] Connect waitlist form on landing page to backend

## Phase 4: Character Wizard + AI Model Settings
- [x] Build step-by-step character creation wizard (name, niche, personality, backstory, visual style, voice, platforms)
- [x] Build AI model selection in Settings (Script/Voice/Image/Video engines)
- [x] Build creator API key management in Settings (encrypted, masked display)
- [x] Build platform connection settings (YouTube, TikTok, Instagram)

## Phase 5: Admin Panel
- [x] Build admin layout with tabs (Overview, Waitlist, Users, Revenue)
- [x] Waitlist dashboard (total signups, breakdown by status)
- [x] User management (all users, plans, roles)
- [x] Revenue dashboard (MRR, total revenue, plan breakdown)
- [x] Admin-only access control (role-based)

## Phase 6: Test & Deliver
- [x] Write vitest tests for all tRPC procedures (33 tests passing)
- [x] Test all pages render correctly (verified via browser)
- [x] Save checkpoint and deliver

## Phase 7: Content Generation Pipeline (End-to-End)
- [x] Build server-side pipeline orchestrator (script → voice → image → video)
- [x] Integrate OpenAI/Claude/Gemini API for script generation (using creator's API key)
- [x] Integrate ElevenLabs/PlayHT API for voice generation (using creator's API key)
- [x] Integrate Replicate/fal.ai/DALL-E for thumbnails (using creator's API key)
- [x] Build content generation UI with step-by-step progress tracking
- [x] Connect pipeline to Content Pipeline page with real-time status updates
- [x] Add "Generate Content" action from Character cards + sidebar nav
- [x] Update content items in database with generated assets
- [x] Write vitest tests for pipeline procedures (14 tests, 47 total)
- [x] Save checkpoint and deliver

## Phase 8: Content Library
- [x] Content Library page with gallery/list view toggle
- [x] Filter by character, platform, status, content type
- [x] Search by title/topic
- [x] Content detail view (script preview, audio player, thumbnail)
- [x] Delete/archive content actions
- [x] Add Content Library to sidebar navigation
- [x] Backend tRPC procedures for listing/filtering content

## Phase 9: YouTube/TikTok Publishing Flow
- [x] Server-side YouTube upload using creator's API key
- [x] Server-side TikTok upload using creator's API key
- [x] Instagram publishing placeholder
- [x] "Publish" button on content items in Content Library
- [x] Publish modal with platform selection and metadata (title, description, tags)
- [x] Publishing status tracking (draft → publishing → published → failed)
- [x] Published URL stored in database
- [x] Write vitest tests for publishing and content library procedures (59 tests total)
- [x] Save checkpoint and deliver

## Phase 10: Remove Manus Dependencies — Migrate to Phase 1 Stack
- [x] Install Clerk SDK (@clerk/express + @clerk/clerk-react)
- [x] Replace Manus OAuth with Clerk auth middleware (server)
- [x] Replace useAuth hook with Clerk's useUser/useAuth
- [x] Replace Manus login/register flow with Clerk's SignIn/SignUp components
- [x] Replace Manus storage proxy with Cloudflare R2 (S3-compatible)
- [x] Stub out unused Manus services (LLM, maps, image gen, voice transcription)
- [x] Clean env.ts — remove all Manus env vars, add Clerk/R2/Resend vars
- [x] Clean vite.config.ts — remove vite-plugin-manus-runtime
- [x] Update server entry point — remove Manus OAuth routes
- [x] Update main.tsx — remove Manus auth redirect logic
- [x] Update Landing.tsx — use Clerk sign-in instead of getLoginUrl
- [x] Update DashboardLayout — use Clerk user info
- [x] Add Dockerfile for Railway deployment
- [x] Add railway.toml configuration
- [x] Add ENV_SETUP.md with all required env vars
- [x] Fix all TypeScript errors (0 errors)
- [x] Update vitest tests (59 tests passing)
- [x] Verify build succeeds
- [x] Export to GitHub (anubhavchugh/AI-CreatorOS)

## Phase 11: Razorpay Migration, UAT Branch, Clerk & R2 Setup Guides
- [x] Create UAT branch in GitHub
- [x] Replace Stripe SDK with Razorpay SDK (backend)
- [x] Razorpay order creation endpoint
- [x] Razorpay webhook handler (payment.captured, subscription.activated, etc.)
- [x] Razorpay subscription plans (Free ₹0 / Pro ₹2,499 / Enterprise ₹7,999)
- [x] Replace Stripe frontend checkout with Razorpay checkout.js
- [x] Update billing/pricing page for Razorpay (INR)
- [x] Update admin revenue dashboard for Razorpay (INR)
- [x] Remove Stripe dependencies and env vars
- [x] Update env config for Razorpay (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET)
- [x] Update vitest tests for Razorpay (60 tests passing)
- [x] Verify build succeeds
- [x] Provide Clerk setup guide
- [x] Provide Cloudflare R2 setup guide
- [x] Push to GitHub (main + uat branches)

## Phase 12: Fix Railway Deployment Healthcheck Failure
- [x] Ensure server binds to 0.0.0.0:PORT from env (Railway injects dynamically)
- [x] Add /health endpoint for Railway healthcheck
- [x] Make Clerk middleware graceful when keys are missing
- [x] Ensure server starts even if DATABASE_URL is not yet set
- [x] Clerk keys validated (66 tests passing)
- [x] Razorpay live keys validated
- [x] Push fix to GitHub

## Phase 13: Fix Clerk Auth on Railway
- [x] Fix Clerk sign-in/sign-up sub-route 404 (e.g. /sign-up/verify-email-address)
- [x] Push fix to GitHub and verify on Railway

## Phase 14: Dashboard Polish & Launch Readiness
- [x] Replace dummy/hardcoded data on Dashboard with real data from DB
- [x] Add logout button to sidebar
- [x] Fix admin panel visibility in sidebar (already works via useAuth role check)
- [x] Review character creation flow for launch readiness

## Phase 15: Fix API Key Save Error
- [x] Fix 'Failed to save some settings' error — rewrote Settings page with better error handling
- [x] Map user's keys: OpenAI (script), ElevenLabs (voice), Venice.ai (image), BFL/Runway (video)
- [x] Update content pipeline — Venice.ai for images, BFL/Runway for video (future)
- [ ] Test full flow: character creation → content generation → pipeline
- [ ] Push to Railway and verify
