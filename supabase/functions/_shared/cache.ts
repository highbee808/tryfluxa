/**
 * Shared cache utilities for Pipeline v2
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { ENV } from './env.ts'

const supabaseUrl = ENV.VITE_SUPABASE_URL
const serviceKey = ENV.VITE_SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, serviceKey)

export interface CacheEntry<T = any> {
  cache_key: string
  value: T
  expires_at: string
  created_at: string
}

/**
 * Get cached value if not expired
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from('fluxa_cache')
      .select('*')
      .eq('cache_key', key)
      .single()

    if (error || !data) return null

    const entry = data as CacheEntry<T>
    const expiresAt = new Date(entry.expires_at)
    const now = new Date()

    if (now > expiresAt) {
      // Expired, delete it
      await supabase.from('fluxa_cache').delete().eq('cache_key', key)
      return null
    }

    return entry.value
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

/**
 * Set cache value with TTL (time to live in seconds)
 */
export async function setCache<T = any>(key: string, value: T, ttlSeconds: number = 3600): Promise<boolean> {
  try {
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds)

    const { error } = await supabase
      .from('fluxa_cache')
      .upsert({
        cache_key: key,
        value: value as any,
        expires_at: expiresAt.toISOString(),
      })

    return !error
  } catch (error) {
    console.error('Cache set error:', error)
    return false
  }
}

/**
 * Delete cache entry
 */
export async function deleteCache(key: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('fluxa_cache')
      .delete()
      .eq('cache_key', key)

    return !error
  } catch (error) {
    console.error('Cache delete error:', error)
    return false
  }
}

/**
 * Generate cache key from topic
 */
export function generateCacheKey(prefix: string, topic: string): string {
  return `${prefix}:${topic.toLowerCase().replace(/\s+/g, '-').slice(0, 100)}`
}
