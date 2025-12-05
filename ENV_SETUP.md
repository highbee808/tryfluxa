# Environment Variables Setup

## Local Development (.env file)

Create a `.env` file in the project root with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Vercel Deployment

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

1. **VITE_SUPABASE_URL**
   - Value: `https://vzjyclgrqoyxbbzplkgw.supabase.co` (or your project URL)
   - Environments: Production, Preview, Development

2. **VITE_SUPABASE_ANON_KEY**
   - Value: Your Supabase anon/public key
   - Environments: Production, Preview, Development

3. **VITE_SUPABASE_SERVICE_ROLE_KEY**
   - Value: Your Supabase service role key (from Supabase Dashboard → Settings → API)
   - Environments: Production, Preview, Development
   - ⚠️ **CRITICAL**: This is required for admin functions to work

## Finding Your Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `VITE_SUPABASE_SERVICE_ROLE_KEY`

## Security Note

⚠️ The service role key has admin privileges. In production:
- Only use it for admin-authenticated routes
- Never expose it in client-side code for public users
- Consider moving admin functions to server-side API routes

## Verification

After setting up, test with:
```bash
npm run dev
```

Then visit `/admin` and run the Pipeline Test. You should see successful results without `FunctionsHttpError`.

