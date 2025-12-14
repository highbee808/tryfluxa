# Image Generation Update - No Unsplash Images

## Overview
Updated the content generation pipeline to use **source images** from articles first, and **OpenAI DALL-E** generated images when no source is available. **Removed all Unsplash image usage** from content generation.

## Changes Made

### 1. Updated `src/jobs/generateContent.ts`
- ✅ Added `fetchArticleWithImage()` function to fetch articles from NewsAPI and extract source images
- ✅ Added `generateOpenAIImage()` function to generate images using OpenAI DALL-E based on content context
- ✅ Updated pipeline to:
  1. First try to fetch source image from article
  2. If no source image, generate with OpenAI DALL-E using headline and context
  3. Removed Unsplash fallback image

### 2. Updated `api/cron/generate.ts`
- ✅ Added same `fetchArticleWithImage()` and `generateOpenAIImage()` functions
- ✅ Updated pipeline with same image priority logic
- ✅ Removed Unsplash fallback image

### 3. Image Priority Logic
The pipeline now follows this priority:
1. **Source Image** - Image from NewsAPI article (if available)
2. **OpenAI DALL-E** - AI-generated image based on content context (if no source)
3. **null** - If both fail, image_url is null (frontend will handle gracefully)

### 4. Metadata
Added `image_source` to meta field:
- `"source_article"` when using article image
- `"openai_dalle"` when using AI-generated image

## Testing

### Manual Test via Admin Panel
1. Go to `/admin` page
2. Generate a gist with a topic
3. Check that:
   - Image comes from article source OR OpenAI DALL-E
   - No Unsplash images appear
   - Image displays correctly in feed

### Test Cron Pipeline
The cron runs every 30 minutes. To test manually:

```bash
# Test the route endpoint
curl -X GET "http://localhost:3000/api/cron/generate?secret=YOUR_CRON_SECRET"
```

Or trigger via Vercel dashboard → Functions → `/api/cron/generate`

### Expected Behavior
- ✅ Content should have images from source articles when available
- ✅ Content should have DALL-E generated images when source unavailable
- ✅ No Unsplash images in any generated content
- ✅ Images match the content context

## Environment Variables Required

Make sure these are set in your environment:
- `NEWSAPI_KEY` - For fetching articles with source images
- `OPENAI_API_KEY` - For generating content and images
- `SUPABASE_URL` - Database connection
- `SUPABASE_SERVICE_ROLE_KEY` - Database access

## Notes

- If `NEWSAPI_KEY` is not set, the pipeline will skip article fetch and go straight to DALL-E generation
- If `OPENAI_API_KEY` is not set, image generation will fail and image_url will be null
- Frontend components already handle null images gracefully
- Image generation adds ~5-10 seconds per gist due to DALL-E API call

## Rollback

If needed, revert the changes to restore Unsplash fallback:
```typescript
// Old code (REMOVED)
image_url: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1400&auto=format&fit=crop"
```
