# API-First Pipeline Refactor - Complete

## Problem Fixed

The auto-generation pipeline was incorrectly using OpenAI as the primary content generator:
- ❌ Content text was AI-generated (fake content)
- ❌ Images were always AI-generated
- ❌ Output did not reflect real news/events
- ❌ Resulted in fake, repetitive, non-news content

## Solution Implemented

### Core Architecture Change

**BEFORE (Broken):**
```
Topic → OpenAI Generate Content → Fetch Image (optional) → Insert
```

**AFTER (Correct):**
```
Topic → Fetch APIs (MANDATORY) → Validate Freshness → 
Summarize with OpenAI → Use Source Image FIRST → AI Image (fallback only) → Insert
```

### Key Changes

#### 1. API Fetching is MANDATORY
- **Location**: `src/jobs/generateContent.ts` & `api/cron/generate.ts`
- **Functions**: 
  - `fetchNewsApiArticles()` - Fetches from NewsAPI
  - `fetchGuardianArticles()` - Fetches from Guardian API
  - `fetchMediastackArticles()` - Fetches from Mediastack API
  - `fetchArticlesFromApis()` - Sequential fallback across all APIs
- **Guard**: If no API content found → **SKIP topic** (don't generate fake content)

#### 2. Freshness Validation
- **Function**: `isValidFreshArticle()`
- **Rule**: Rejects articles older than 7 days
- **Requirement**: Article must have `published_at` date
- **Result**: Only fresh, current content is processed

#### 3. OpenAI Restricted to Summarization
- **Function**: `summarizeArticleWithAI()`
- **Before**: Generated content from scratch based on topic
- **After**: Summarizes real article content only
- **Prompt**: Explicitly instructs to summarize, not create
- **Guard**: Only called if API article exists

#### 4. Image Priority Enforced
- **Priority 1**: Source image from article (ALWAYS preferred)
- **Priority 2**: AI-generated image (ONLY if no source image)
- **Function**: `generateOpenAIImage()` - Last resort fallback only

#### 5. Data Integrity Requirements
Every post MUST include:
- ✅ `source_url` - URL to original article (mandatory)
- ✅ `source_name` - Source publication name (stored in meta)
- ✅ `published_at` - Article's published date (not current time)
- ✅ `source_title` - Original article title (stored in meta)

## Files Changed

### 1. `src/jobs/generateContent.ts`
**Complete rewrite** with API-first architecture:
- ✅ Added API fetching functions (NewsAPI, Guardian, Mediastack)
- ✅ Added freshness validation
- ✅ Changed `generateAISummary()` → `summarizeArticleWithAI()` (takes article, not topic)
- ✅ Added guards to skip topics without API content
- ✅ Enforced source image priority
- ✅ Added source metadata to all posts

### 2. `api/cron/generate.ts`
**Complete rewrite** with same API-first architecture:
- ✅ Same API fetching logic
- ✅ Same validation and guards
- ✅ Same image priority enforcement
- ✅ Same data integrity requirements

## Validation Guards

### Guard 1: No API Content
```typescript
if (articles.length === 0) {
  console.log(`❌ No API content found - SKIPPING`);
  errors.push(`No API content found for topic: ${topic}`);
  skipped++;
  continue; // Don't generate fake content
}
```

### Guard 2: No Fresh Articles
```typescript
const validArticles = articles.filter(isValidFreshArticle);
if (validArticles.length === 0) {
  console.log(`❌ No fresh articles - SKIPPING`);
  errors.push(`No fresh articles (< 7 days) found`);
  skipped++;
  continue;
}
```

### Guard 3: Summary Failed
```typescript
if (!aiSummary) {
  console.log(`❌ Failed to summarize - SKIPPING`);
  errors.push(`Failed to summarize article`);
  skipped++;
  continue; // Don't insert without summary
}
```

## Image Logic Flow

```typescript
// Step 1: Try source image FIRST
let finalImageUrl: string | null = selectedArticle.image || null;

// Step 2: Only use AI if source doesn't exist
if (!finalImageUrl) {
  console.log(`⚠️ No source image, using AI image as last resort...`);
  finalImageUrl = await generateOpenAIImage(aiSummary.headline, aiSummary.context);
} else {
  console.log(`✅ Using source image from article`);
}
```

## OpenAI Prompt Changes

### Before (WRONG):
```
"Create a gist about: ${topic}"
→ OpenAI invents content
```

### After (CORRECT):
```
"Summarize this real news article about: ${topic}

ARTICLE TO SUMMARIZE:
${articleText}

Remember: You are SUMMARIZING this article, not creating new content."
→ OpenAI only summarizes existing content
```

## Success Criteria ✅

After this refactor:

1. ✅ **New posts map to real external sources**
   - Every post has `source_url` pointing to real article
   - Every post has `source_name` in metadata

2. ✅ **Headlines reflect real current events**
   - Headlines are summaries of real articles
   - Not AI-generated fake news

3. ✅ **Images match source content**
   - Source images prioritized
   - AI images only when source unavailable

4. ✅ **AI text reads like summary, not invention**
   - Prompt explicitly says "SUMMARIZE"
   - AI receives full article text to summarize
   - No content generation without source

5. ✅ **No posts exist without API source**
   - Guards prevent insertion without API content
   - Topics skipped if no articles found

## Example Flow

### Topic: "Taylor Swift releases new album"

1. **API Fetch**:
   - Calls NewsAPI → Finds article: "Taylor Swift Announces New Album 'Midnights'"
   - Article has: title, description, content, URL, image, published date

2. **Validation**:
   - Checks: published_at exists ✅
   - Checks: < 7 days old ✅
   - Article selected ✅

3. **Summarization**:
   - OpenAI receives full article text
   - Prompt: "Summarize this real news article..."
   - Returns: Friendly summary with emojis

4. **Image**:
   - Uses article's `urlToImage` ✅
   - (AI image not needed)

5. **Insert**:
   - Stores: headline, summary, source_url, source_name, published_at
   - Post now references real article ✅

## Constraints Met

- ✅ **No caching** - Fresh data every run
- ✅ **No content without APIs** - Guards prevent it
- ✅ **No AI originality** - Only summarization
- ✅ **Correctness over speed** - Validates freshness

## Testing

To verify the fix works:

1. **Check logs** for:
   - "✅ Found X articles from NewsAPI/Guardian/Mediastack"
   - "✅ Selected article: [title] from [source]"
   - "✅ Using source image from article"
   - Topics skipped if no API content found

2. **Check database** for:
   - `source_url` always populated
   - `published_at` matches article date
   - `meta.source_name` populated

3. **Check posts** for:
   - Headlines match real news events
   - Images are source images (not AI-generated)
   - Content reads like summaries, not inventions

## Result

Fluxa now feels like:
✅ **"An intelligent feed summarizing what's actually happening right now."**

Not:
❌ ~~"AI imagining news."~~
