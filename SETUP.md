# Penfix HR Portal — Setup Guide

## 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the SQL Editor and run the contents of `supabase/schema.sql`
3. Copy your project URL and anon key from **Project Settings → API**

## 2. Environment Variables

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
ADMIN_PASSWORD=your_secure_password_here
```

## 3. GitHub Setup

```bash
git init
git add .
git commit -m "Initial commit: Penfix HR Portal"
git remote add origin https://github.com/penfixads/hr-portal.git
git push -u origin main
```

## 4. Vercel Deployment

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub → select `penfixads/hr-portal`
2. Add these **Environment Variables** in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_PASSWORD`
3. Deploy

## 5. Custom Domain

In Vercel project → Settings → Domains → Add `hr.penfixads.com`

Then add a CNAME record in your DNS:
```
Type: CNAME
Name: hr
Value: cname.vercel-dns.com
```

## 6. Logo

Place your Penfix logo at `public/penfix-logo.png` — it will appear in the header automatically.

## Pages

| URL | Description |
|-----|-------------|
| `hr.penfixads.com` | Home — team selection |
| `hr.penfixads.com/creative` | Creative Team form |
| `hr.penfixads.com/production` | Production Team form |
| `hr.penfixads.com/admin` | Admin dashboard (Boss Allen) |
