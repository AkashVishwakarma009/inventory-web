# Deployment Guide - Render + Supabase

This guide will help you deploy your Sudhamrit Inventory Management System on Render with Supabase database.

## Prerequisites

1. **Supabase Account**: Create a project at [supabase.com](https://supabase.com)
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **GitHub Repository**: Push your code to GitHub

## Step 1: Supabase Setup

1. Create a new Supabase project
2. Go to Settings → Database
3. Copy your connection string (it looks like: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`)
4. Enable Row Level Security if needed (Settings → Database → RLS)

## Step 2: Fix SSL Certificate Issue

The SSL certificate error you're encountering is common with Supabase. Here's the solution:

### Environment Variables for Render

In your Render dashboard, add these environment variables:

```
DATABASE_URL=your_supabase_connection_string
NODE_ENV=production
SESSION_SECRET=your_secure_random_string_here
NODE_TLS_REJECT_UNAUTHORIZED=0
PGSSLMODE=require
```

### Build Command for Render

Use this build command in Render:
```bash
npm install && npm run build
```

### Start Command for Render

Use this start command in Render:
```bash
npm run start
```

## Step 3: Database Migration

After deployment, you'll need to set up the database tables. 

### Option A: Manual Migration (Recommended)

1. In Render dashboard, go to your service
2. Open the "Shell" tab
3. Run the migration command:
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run db:push
```

### Option B: Automatic Migration on Deploy

Add this to your package.json scripts (if you prefer automatic migration):
```json
{
  "scripts": {
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "deploy": "NODE_TLS_REJECT_UNAUTHORIZED=0 npm run db:push && npm run start"
  }
}
```

Then use `npm run deploy` as your start command.

## Step 4: Super Admin Account

The system will automatically create a super admin account on first run:
- **Username**: Sudhamrit
- **Password**: Sudhamrit@1234

⚠️ **Important**: Change this password immediately after first login!

## Step 5: Troubleshooting

### SSL Certificate Error
If you still get SSL errors, ensure these environment variables are set:
- `NODE_TLS_REJECT_UNAUTHORIZED=0`
- `PGSSLMODE=require`

### Database Connection Issues
- Verify your Supabase connection string is correct
- Check that your Supabase project is not paused
- Ensure the database user has proper permissions

### Build Failures
- Make sure all environment variables are set in Render
- Check the build logs for specific error messages
- Verify your Node.js version is compatible (we use Node 20+)

## Security Notes

1. **Change Default Password**: Immediately change the super admin password
2. **Session Secret**: Use a strong, random session secret
3. **Database Security**: Enable RLS (Row Level Security) in Supabase if needed
4. **Environment Variables**: Never commit sensitive data to your repository

## Performance Optimization

1. **Connection Pooling**: The app is configured for optimal connection pooling
2. **Static Assets**: All frontend assets are served efficiently by Express
3. **Database Queries**: Uses optimized Drizzle ORM queries with proper indexing

Your inventory management system should now be successfully deployed on Render with Supabase!