# Vite Environment Variable Prefix Fix

## ✅ Issue Verified and Fixed

### Problem
Vite only exposes environment variables prefixed with `VITE_` to the frontend. Accessing `import.meta.env.FRONTEND_URL` (without prefix) will always be `undefined`, making fallback logic unreachable and misleading.

### Files Fixed

#### 1. `src/lib/apiConfig.ts`

**Before:**
```typescript
const frontendUrl = import.meta.env.VITE_FRONTEND_URL || import.meta.env.FRONTEND_URL;
```

**After:**
```typescript
const frontendUrl = import.meta.env.VITE_FRONTEND_URL;
```

**Changes:**
- ✅ Removed unreachable fallback to `import.meta.env.FRONTEND_URL`
- ✅ Added documentation comment explaining Vite's `VITE_` prefix requirement
- ✅ Only uses `VITE_FRONTEND_URL` which will work correctly

#### 2. `src/lib/spotifyAuth.ts`

**Before:**
```typescript
const frontendUrl = import.meta.env.PROD
  ? (import.meta.env.VITE_FRONTEND_URL || import.meta.env.FRONTEND_URL || "https://tryfluxa.vercel.app")
  : window.location.origin;
```

**After:**
```typescript
import { getFrontendUrl } from "./apiConfig";

// ... in function:
const frontendUrl = getFrontendUrl();
```

**Changes:**
- ✅ Now imports and uses `getFrontendUrl()` helper from `apiConfig.ts`
- ✅ Removed unreachable fallback to `import.meta.env.FRONTEND_URL`
- ✅ Added documentation comment explaining Vite's `VITE_` prefix requirement
- ✅ Uses centralized logic that properly handles production/dev environments

## 📋 Environment Variable Requirements

### Required Variables (must be prefixed with `VITE_`)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY` - Authentication key
- `VITE_FRONTEND_URL` - Frontend URL (optional, falls back to `window.location.origin` in dev)

### Important Notes
- ❌ **DO NOT** use unprefixed variables like `FRONTEND_URL` - they will always be `undefined`
- ✅ **ALWAYS** prefix frontend environment variables with `VITE_`
- ✅ Use `getFrontendUrl()` helper for consistent frontend URL resolution

## ✅ Verification

All changes verified:
- [x] `apiConfig.ts` - Only uses `VITE_FRONTEND_URL`
- [x] `spotifyAuth.ts` - Uses `getFrontendUrl()` helper
- [x] Documentation comments added explaining Vite prefix requirement
- [x] No unreachable fallback code remaining

## 🚀 Next Steps

1. **Update Environment Variables:**
   - Ensure `VITE_FRONTEND_URL` is set in `.env.local` for production
   - Update Vercel environment variables to use `VITE_FRONTEND_URL` instead of `FRONTEND_URL`

2. **Test:**
   - Verify frontend URL resolution works in dev (should use `window.location.origin`)
   - Verify frontend URL resolution works in production (should use `VITE_FRONTEND_URL`)

---

**All Vite environment variable prefix issues have been resolved!**
