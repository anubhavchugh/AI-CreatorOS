# AI CreatorOS — Environment Variables Setup

Copy these variables into your Railway project settings or a local `.env` file.

## Required Variables

### Database (MySQL / PlanetScale / TiDB)
```
DATABASE_URL=mysql://user:password@host:3306/database_name
```

### Clerk Authentication
Get these from https://dashboard.clerk.com → API Keys
```
CLERK_SECRET_KEY=sk_test_xxxxx
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
```

### Razorpay Payments
Get these from https://dashboard.razorpay.com → Settings → API Keys
```
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Cloudflare R2 Storage
Get these from https://dash.cloudflare.com → R2 → Manage R2 API Tokens
```
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=ai-creatoros
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

### JWT Secret
```
JWT_SECRET=your-random-secret-at-least-32-chars
```

### Admin Email (first user with this email gets admin role)
```
ADMIN_EMAIL=your@email.com
```

### Server
```
PORT=3000
NODE_ENV=production
```

## Railway Deployment

1. Create a new project on Railway
2. Add a MySQL database service
3. Copy the `DATABASE_URL` from the MySQL service
4. Add all environment variables above to your Railway service
5. Set build command: `pnpm build`
6. Set start command: `pnpm start`
7. Deploy!

## Razorpay Webhook Setup

After deploying to Railway:
1. Go to https://dashboard.razorpay.com → Settings → Webhooks
2. Add a new webhook URL: `https://your-domain.up.railway.app/api/razorpay/webhook`
3. Select events: `payment.captured`, `payment.failed`, `subscription.activated`, `subscription.cancelled`, `refund.processed`
4. Copy the webhook secret and add it as `RAZORPAY_WEBHOOK_SECRET` in Railway

## Clerk Webhook Setup (Optional)

If you want to sync user data from Clerk:
1. Go to https://dashboard.clerk.com → Webhooks
2. Add endpoint: `https://your-domain.up.railway.app/api/clerk/webhook`
3. Select events: `user.created`, `user.updated`
