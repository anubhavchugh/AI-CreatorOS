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
- [x] Fix image pipeline: BFL FLUX primary, Venice.ai fallback
- [x] Add video generation step (compose images + audio into video via ffmpeg)
- [x] Update pipeline UI to show video step progress
- [ ] Verify YouTube upload integration works end-to-end
- [ ] Test full flow: character → script → voice → image → video → YouTube
- [x] Push to Railway and verify

## Phase 16: Runway ML Video Generation Integration
- [x] Integrate Runway ML Gen-4 Turbo API for real AI image-to-video generation
- [x] Update Settings page: Runway ML Gen-4 Turbo as Video Engine provider (key_ prefix)
- [x] Update content pipeline: Runway ML as primary video, ffmpeg as fallback
- [x] Correct key mapping: BFL FLUX (image), Venice.ai (image fallback), Runway ML (video)
- [x] Merge Runway video with voiceover audio using ffmpeg
- [x] Update vitest tests for video step (69 tests passing)
- [x] Build, push to GitHub and Railway

## Phase 17: Pipeline Polish — Duration Control, Video Preview, E2E Test
- [x] Add video duration control (5s for reels/shorts, 10s for long-form) to pipeline
- [x] Add duration selector UI in GenerateContent page
- [x] Pass duration to Runway Gen-4 Turbo API
- [x] Add video preview player in Content Library (watch before publishing)
- [x] Test full pipeline end-to-end (script → voice → image → video)
- [ ] Write vitest tests for new features
- [ ] Build, push to GitHub

## Phase 18: Bug Fixes & Browser Testing
- [ ] Fix character creation bug (not working at the end of flow)
- [ ] Test character creation flow end-to-end in browser
- [ ] Test content generation flow in browser
- [ ] Test content library (video preview player) in browser
- [ ] Test settings page (API key saving) in browser
- [ ] Update vitest tests for any fixes

## Phase 19: Full Pipeline E2E Test & Bug Fixes
- [x] Fix remaining TS errors (videoDuration type mismatch, updateUserOpenId)
- [x] Run full end-to-end content generation pipeline test in browser
- [x] Verify script generation step works
- [x] Verify voice generation step works
- [x] Verify thumbnail generation step works
- [x] Verify video generation step works (Runway Gen-4 Turbo)
- [x] Fix Runway BAD_OUTPUT error (use thumbnail instead of avatar as base image)
- [ ] Update vitest tests
- [ ] Build, checkpoint, push to GitHub

## Phase 20: Pipeline Error Handling & Key Update
- [ ] Update ElevenLabs API key to new one
- [ ] Rewrite pipeline: ALL steps mandatory, no skipping. Stop immediately on any failure (no key OR API error)
- [ ] Clear error messages: tell creator exactly what went wrong and how to fix it
- [ ] Fix 2 TS errors (updateUserOpenId, videoDuration type)
- [ ] Update frontend: remove skip UI, show stop/error state properly
- [ ] Re-test full pipeline end-to-end
- [ ] Update vitest tests for new error behavior

## Phase 21: Character Avatar & Video Duration Expansion
- [x] Add avatarUrl column to characters table in schema
- [x] Add avatar generation step to CharacterWizard (Step 3: Design Your Character's Look)
- [x] Generate character face/avatar using creator's image API key during creation
- [x] Store avatar as character's visual identity, reuse in all content generation
- [x] Update pipeline to use thumbnail as Runway input image (better quality than avatar)
- [x] Expand video duration options: 5s, 10s, 20s, 30s, 60s
- [x] Implement clip chaining for durations > 10s (chain multiple Runway generations + ffmpeg concat)
- [x] Update ElevenLabs API key to new one (sk_46649a...)
- [x] Full end-to-end pipeline test (character creation with avatar → content generation → library)
- [x] Display character avatars in Characters page and Generate Content page
- [ ] Update vitest tests

## Phase 22: Logout Button & Redirect Fix
- [x] Ensure logout button is visible and working in sidebar
- [x] After logout, redirect to landing page (/) or login page
- [x] Add auth guard to DashboardLayout (redirect to /sign-in if not authenticated)
- [ ] Push changes to GitHub (main + uat branches)
- [ ] Guide Railway deployment
