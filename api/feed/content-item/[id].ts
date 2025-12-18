/**
 * Vercel serverless function for fetching a single content_item by ID
 * Optimized for PostDetail page - fast single-item lookup
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../_internal/ingestion/db.js';

interface ContentItemResponse {
  id: string;
  source_id: string;
  source_key: string;
  source_name: string;
  title: string;
  url: string | null;
  excerpt: string | null;
  published_at: string | null;
  image_url: string | null;
  categories: string[];
  created_at: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Item ID is required',
      });
    }

    // Get Supabase client (service role - bypasses RLS)
    const supabase = getSupabaseClient();

    // Query single item with joins
    const { data, error } = await supabase
      .from('content_items')
      .select(`
        id,
        source_id,
        title,
        url,
        excerpt,
        published_at,
        image_url,
        created_at,
        content_sources!inner(
          id,
          source_key,
          name,
          is_active
        ),
        content_item_categories(
          content_categories(
            name,
            slug
          )
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[Content Item API] Query error:', error);
      return res.status(500).json({
        error: 'Database query failed',
        message: error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Content item not found',
      });
    }

    // Check if source is active
    const source = data.content_sources;
    if (!source || !source.is_active) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Content item source is not active',
      });
    }

    // Transform to response format
    const categories = (data.content_item_categories || [])
      .map((cic: any) => cic.content_categories?.name)
      .filter(Boolean);

    const response: ContentItemResponse = {
      id: data.id,
      source_id: data.source_id,
      source_key: source.source_key || '',
      source_name: source.name || '',
      title: data.title,
      url: data.url,
      excerpt: data.excerpt,
      published_at: data.published_at,
      image_url: data.image_url,
      categories,
      created_at: data.created_at,
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('[Content Item API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || String(error),
    });
  }
}
