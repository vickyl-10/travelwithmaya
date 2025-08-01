# Vercel Environment Setup Guide

## To fix the logging issue on Vercel, you need to configure environment variables:

### 1. Go to your Vercel Dashboard
- Visit https://vercel.com/dashboard
- Select your project (travelwithnate)

### 2. Configure Environment Variables
- Go to **Settings** → **Environment Variables**
- Add the following environment variable:

**Name:** `DATABASE_URL`
**Value:** `postgres://neondb_owner:npg_0qomcTlHvr2K@ep-green-waterfall-adgd4miw-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require`
**Environment:** Production, Preview, Development

### 3. Redeploy your project
- After adding the environment variable, redeploy your project
- Go to **Deployments** and click **Redeploy** on your latest deployment

### 4. Test the logging
- Visit your deployed site
- Check the `/api/health` endpoint to verify database connection
- Check the `/api/stats` endpoint to see if visits are being logged

### 5. Troubleshooting
If logging still doesn't work:
1. Check the Vercel function logs in the dashboard
2. Verify the DATABASE_URL is correctly set
3. Test the `/api/health` endpoint to see database status 