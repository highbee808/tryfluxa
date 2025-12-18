# Cron Generate Update Summary

## Overview
Updated `/api/cron/generate` endpoint to remove Guardian and expired adapters, and use only RapidAPI-based adapters with proper headers.

**Date**: January 19, 2025

---

## Problem Identified

From the Vercel logs, the cron job was:
1. ❌ Still calling Guardian (expired adapter)
2. ❌ Using old NewsAPI endpoint (failing with 401)
3. ❌ Using old Mediastack endpoint (not RapidAPI)
4. ❌ Not using RapidAPI headers (`X-RapidAPI-Key`, `X-RapidAPI-Host`)

---

## Changes Made

### 1. Removed Guardian Adapter

**File**: `api/cron/generate.ts`

**Removed**:
- `fetchGuardianArticles()` function (lines 129-163)
- All references to Guardian in `fetchArticlesFromApis()`

**Before**:
```typescript
async function fetchGuardianArticles(topic: string): Promise<Article[]> {
  const apiKey = process.env.GUARDIAN_API_KEY;
  // ... Guardian API call
}
```

**After**: ❌ Completely removed

---

### 2. Replaced Old NewsAPI with RapidAPI Version

**File**: `api/cron/generate.ts`

**Removed**:
- `fetchNewsApiArticles()` - Old NewsAPI.org endpoint

**Added**:
- `fetchNewsApiRapidApiArticles()` - RapidAPI version

**Key Changes**:
- Uses `RAPIDAPI_KEY` environment variable (not `NEWSAPI_KEY`)
- Uses `X-RapidAPI-Key` and `X-RapidAPI-Host` headers
- Endpoint: `https://newsapi-rapidapi.p.rapidapi.com/everything`
- Host: `newsapi-rapidapi.p.rapidapi.com`
- Logs: `"Using adapter: newsapi (rapidapi)"`

**Before**:
```typescript
async function fetchNewsApiArticles(topic: string): Promise<Article[]> {
  const apiKey = process.env.NEWSAPI_KEY; // ❌ Wrong env var
  const url = `https://newsapi.org/v2/everything?...&apiKey=${apiKey}`; // ❌ Old endpoint
  // No RapidAPI headers
}
```

**After**:
```typescript
async function fetchNewsApiRapidApiArticles(topic: string): Promise<Article[]> {
  const apiKey = process.env.RAPIDAPI_KEY; // ✅ Correct env var
  const url = `https://newsapi-rapidapi.p.rapidapi.com/everything?...`; // ✅ RapidAPI endpoint
  headers: {
    'X-RapidAPI-Key': apiKey, // ✅ RapidAPI headers
    'X-RapidAPI-Host': 'newsapi-rapidapi.p.rapidapi.com',
  }
  console.log(`[API Fetch] Using adapter: newsapi (rapidapi)`); // ✅ Logging
}
```

---

### 3. Replaced Old Mediastack with RapidAPI Version

**File**: `api/cron/generate.ts`

**Removed**:
- `fetchMediastackArticles()` - Old Mediastack direct API

**Added**:
- `fetchMediastackRapidApiArticles()` - RapidAPI version (PRIORITY 1)

**Key Changes**:
- Uses `RAPIDAPI_KEY` environment variable (not `MEDIASTACK_KEY`)
- Uses `X-RapidAPI-Key` and `X-RapidAPI-Host` headers
- Endpoint: `https://mediastack.p.rapidapi.com/news`
- Host: `mediastack.p.rapidapi.com`
- Logs: `"Using adapter: mediastack (rapidapi)"`
- **PRIORITY 1** - Called first in the fetch sequence

**Before**:
```typescript
async function fetchMediastackArticles(topic: string): Promise<Article[]> {
  const apiKey = process.env.MEDIASTACK_KEY; // ❌ Wrong env var
  const url = `http://api.mediastack.com/v1/news?access_key=${apiKey}`; // ❌ Old endpoint
  // No RapidAPI headers
}
```

**After**:
```typescript
async function fetchMediastackRapidApiArticles(topic: string): Promise<Article[]> {
  const apiKey = process.env.RAPIDAPI_KEY; // ✅ Correct env var
  const url = `https://mediastack.p.rapidapi.com/news?...`; // ✅ RapidAPI endpoint
  headers: {
    'X-RapidAPI-Key': apiKey, // ✅ RapidAPI headers
    'X-RapidAPI-Host': 'mediastack.p.rapidapi.com',
  }
  console.log(`[API Fetch] Using adapter: mediastack (rapidapi)`); // ✅ Logging
}
```

---

### 4. Updated Fetch Sequence

**File**: `api/cron/generate.ts` - `fetchArticlesFromApis()` function

**Before**:
```typescript
// Try NewsAPI first
const newsapi = await fetchNewsApiArticles(topic);
if (newsapi.length > 0) return articles;

// Try Guardian if NewsAPI returned nothing ❌
const guardian = await fetchGuardianArticles(topic);
if (guardian.length > 0) return articles;

// Try Mediastack if Guardian returned nothing
const mediastack = await fetchMediastackArticles(topic);
```

**After**:
```typescript
// Try Mediastack RapidAPI first (PRIORITY 1) ✅
const mediastack = await fetchMediastackRapidApiArticles(topic);
if (mediastack.length > 0) return articles;

// Try NewsAPI RapidAPI if Mediastack returned nothing (PRIORITY 2) ✅
const newsapi = await fetchNewsApiRapidApiArticles(topic);
if (newsapi.length > 0) return articles;

// Guardian completely removed ❌
```

**New Priority Order**:
1. ✅ **Mediastack RapidAPI** (first priority)
2. ✅ **NewsAPI RapidAPI** (second priority)
3. ❌ **Guardian** (removed)

---

## Environment Variables Required

### Vercel Environment Variables

The cron job now requires:
```env
RAPIDAPI_KEY=your-rapidapi-key-here
```

**Note**: 
- The old `NEWSAPI_KEY`, `MEDIASTACK_KEY`, and `GUARDIAN_API_KEY` are no longer used
- All RapidAPI adapters use the same `RAPIDAPI_KEY`

---

## Logging Output

### New Log Messages:
- `"[API Fetch] Using adapter: mediastack (rapidapi)"` - When Mediastack RapidAPI is called
- `"[API Fetch] Using adapter: newsapi (rapidapi)"` - When NewsAPI RapidAPI is called
- `"[API Fetch] Mediastack RapidAPI: RAPIDAPI_KEY not configured"` - If key missing
- `"[API Fetch] NewsAPI RapidAPI: RAPIDAPI_KEY not configured"` - If key missing

### Removed Log Messages:
- ❌ No more Guardian-related logs
- ❌ No more old NewsAPI/Mediastack logs

---

## Verification Checklist

After deployment, verify in Vercel logs:

- [ ] ✅ No "Guardian" logs appear
- [ ] ✅ Logs show "Using adapter: mediastack (rapidapi)"
- [ ] ✅ Logs show "Using adapter: newsapi (rapidapi)"
- [ ] ✅ No 401 errors from NewsAPI
- [ ] ✅ Articles are successfully fetched
- [ ] ✅ Content generation succeeds

---

## Files Changed

### Modified:
1. `api/cron/generate.ts`
   - Removed `fetchGuardianArticles()`
   - Removed `fetchNewsApiArticles()` (old)
   - Removed `fetchMediastackArticles()` (old)
   - Added `fetchMediastackRapidApiArticles()` (new, priority 1)
   - Added `fetchNewsApiRapidApiArticles()` (new, priority 2)
   - Updated `fetchArticlesFromApis()` to use new functions in correct order

---

## Summary

✅ **Removed**: Guardian adapter completely  
✅ **Removed**: Old NewsAPI and Mediastack direct API calls  
✅ **Added**: RapidAPI versions of Mediastack and NewsAPI  
✅ **Prioritized**: Mediastack RapidAPI first, then NewsAPI RapidAPI  
✅ **Headers**: All adapters use `X-RapidAPI-Key` and `X-RapidAPI-Host`  
✅ **Logging**: Clear logging shows which adapter is being used  
✅ **Environment**: Uses `RAPIDAPI_KEY` (single key for all RapidAPI adapters)  

The cron job now only calls active, valid RapidAPI endpoints with proper headers and no expired adapters.
