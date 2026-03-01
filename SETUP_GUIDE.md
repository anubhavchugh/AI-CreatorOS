# AI CreatorOS — Complete Setup Guide

This guide walks you through setting up all external services for AI CreatorOS.

---

## 1. Clerk Authentication Setup

Clerk handles all user authentication (sign-up, sign-in, session management, user profiles).

### Step 1: Create a Clerk Application

1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com) and sign up / log in
2. Click **"Create application"**
3. Name it **"AI CreatorOS"** (or your preferred name)
4. Under **Sign-in options**, enable:
   - **Email address** (required)
   - **Google** (recommended for social login)
   - Optionally: GitHub, Apple, etc.
5. Click **"Create application"**

### Step 2: Get Your API Keys

1. In the Clerk dashboard, go to **API Keys** (left sidebar)
2. Copy these two values:
   - **Publishable key** → starts with `pk_test_...`
   - **Secret key** → starts with `sk_test_...`
3. Add them to your Railway environment variables:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
   CLERK_SECRET_KEY=sk_test_xxxxx
   ```

### Step 3: Configure Appearance (Optional)

1. Go to **Customization → Branding** in Clerk dashboard
2. Set your brand color to match AI CreatorOS (recommended: `#6366f1` — indigo)
3. Upload your logo
4. Under **Customization → Theme**, choose Dark mode to match the app's dark theme

### Step 4: Configure Redirect URLs

1. Go to **Paths** in Clerk dashboard
2. Set:
   - **Sign-in URL**: `/sign-in`
   - **Sign-up URL**: `/sign-up`
   - **After sign-in URL**: `/dashboard`
   - **After sign-up URL**: `/dashboard`

### Step 5: Production Keys

When you're ready to go live:
1. Switch to **Production** instance in Clerk dashboard
2. Copy the production keys (they start with `pk_live_...` and `sk_live_...`)
3. Update your Railway env vars with the production keys

---

## 2. Cloudflare R2 Storage Setup

R2 stores file uploads (thumbnails, audio files, generated content).

### Step 1: Create a Cloudflare Account

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com) and sign up / log in
2. In the left sidebar, click **R2 Object Storage**
3. If prompted, add a payment method (R2 has a generous free tier: 10 GB storage, 10 million reads/month)

### Step 2: Create a Bucket

1. Click **"Create bucket"**
2. Name it: `ai-creatoros` (or your preferred name)
3. Choose **Automatic** for location (or pick a region close to your users)
4. Click **"Create bucket"**

### Step 3: Enable Public Access

1. Open your bucket → **Settings** tab
2. Under **Public access**, click **"Allow Access"**
3. Copy the **Public bucket URL** — it looks like: `https://pub-xxxxx.r2.dev`
4. This is your `R2_PUBLIC_URL`

### Step 4: Create API Tokens

1. Go back to **R2 Overview** → **Manage R2 API Tokens**
2. Click **"Create API token"**
3. Set permissions: **Object Read & Write**
4. Scope it to your `ai-creatoros` bucket
5. Click **"Create API Token"**
6. Copy:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`

### Step 5: Get Your Account ID and Endpoint

1. Your **Account ID** is in the Cloudflare dashboard URL: `https://dash.cloudflare.com/<account-id>/...`
2. Your R2 endpoint is: `https://<account-id>.r2.cloudflarestorage.com`

### Step 6: Add to Railway

```
S3_BUCKET=ai-creatoros
S3_REGION=auto
S3_ACCESS_KEY_ID=your_access_key_id
S3_SECRET_ACCESS_KEY=your_secret_access_key
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
S3_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

---

## 3. Razorpay Payments Setup

Razorpay handles subscription payments (Pro ₹2,499/mo, Enterprise ₹7,999/mo).

### Step 1: Create a Razorpay Account

1. Go to [https://dashboard.razorpay.com](https://dashboard.razorpay.com) and sign up
2. Complete KYC verification (required for live payments)
3. In the meantime, you can use **Test Mode** for development

### Step 2: Get API Keys

1. Go to **Settings → API Keys**
2. Click **"Generate Key"** (or use existing test keys)
3. Copy:
   - **Key ID** → starts with `rzp_test_...`
   - **Key Secret** → the secret shown once
4. Add to Railway:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=your_key_secret
   ```

### Step 3: Set Up Webhooks

1. Go to **Settings → Webhooks**
2. Click **"Add New Webhook"**
3. Set the URL to: `https://your-domain.up.railway.app/api/razorpay/webhook`
4. Select these events:
   - `payment.captured`
   - `payment.failed`
   - `subscription.activated`
   - `subscription.cancelled`
   - `refund.processed`
5. Copy the **Webhook Secret** and add to Railway:
   ```
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   ```

### Step 4: Test Payments

Use these test card details:
- **Card Number**: `4111 1111 1111 1111`
- **Expiry**: Any future date
- **CVV**: Any 3 digits
- **OTP**: `1234` (for 3D Secure)

### Step 5: Go Live

1. Complete KYC verification on Razorpay dashboard
2. Switch to **Live Mode** in Razorpay dashboard
3. Generate live API keys
4. Update Railway env vars with live keys (they start with `rzp_live_...`)

---

## 4. Railway Deployment

### Step 1: Create Railway Project

1. Go to [https://railway.app](https://railway.app) and sign up / log in
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select `anubhavchugh/AI-CreatorOS`
4. Railway will auto-detect the Dockerfile

### Step 2: Add MySQL Database

1. In your Railway project, click **"New"** → **"Database"** → **"MySQL"**
2. Once created, go to the MySQL service → **Variables** tab
3. Copy the `DATABASE_URL` (it looks like `mysql://root:password@host:port/railway`)

### Step 3: Set Environment Variables

In your Railway web service, go to **Variables** and add all of these:

```
# Database
DATABASE_URL=mysql://root:password@host:port/railway

# Clerk Auth
CLERK_SECRET_KEY=sk_test_xxxxx
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Cloudflare R2
S3_BUCKET=ai-creatoros
S3_REGION=auto
S3_ACCESS_KEY_ID=your_r2_access_key
S3_SECRET_ACCESS_KEY=your_r2_secret_key
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
S3_PUBLIC_URL=https://pub-xxxxx.r2.dev

# JWT (generate a random 32+ char string)
JWT_SECRET=your-random-secret-at-least-32-characters

# Admin
ADMIN_EMAIL=your@email.com

# Server
NODE_ENV=production
PORT=3000
```

### Step 4: Deploy

1. Railway will automatically build and deploy when you push to the `main` branch
2. Once deployed, go to **Settings → Networking** to get your public URL
3. Use this URL for Razorpay webhook configuration

### Step 5: Run Database Migrations

After the first deploy, you may need to run migrations. Railway supports one-off commands:
1. Go to your service → **Settings** → **Deploy** section
2. Or use Railway CLI: `railway run pnpm db:push`

---

## 5. Custom Domain (Optional)

1. In Railway, go to your service → **Settings → Networking**
2. Click **"Generate Domain"** for a free `*.up.railway.app` domain
3. Or click **"Custom Domain"** to add your own domain
4. Update DNS records as instructed by Railway

---

## Quick Reference: All Environment Variables

| Variable | Source | Required |
|---|---|---|
| `DATABASE_URL` | Railway MySQL | Yes |
| `CLERK_SECRET_KEY` | Clerk Dashboard | Yes |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard | Yes |
| `RAZORPAY_KEY_ID` | Razorpay Dashboard | Yes |
| `RAZORPAY_KEY_SECRET` | Razorpay Dashboard | Yes |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhooks | Yes |
| `S3_BUCKET` | Cloudflare R2 | Yes |
| `S3_REGION` | `auto` for R2 | Yes |
| `S3_ACCESS_KEY_ID` | Cloudflare R2 API Token | Yes |
| `S3_SECRET_ACCESS_KEY` | Cloudflare R2 API Token | Yes |
| `S3_ENDPOINT` | Cloudflare R2 | Yes |
| `S3_PUBLIC_URL` | Cloudflare R2 Public URL | Yes |
| `JWT_SECRET` | Self-generated | Yes |
| `ADMIN_EMAIL` | Your email | Yes |
| `NODE_ENV` | `production` | Yes |
| `PORT` | `3000` | Yes |
