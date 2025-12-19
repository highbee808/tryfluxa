/**
 * Shared admin authentication helper for admin API endpoints
 * 
 * Authentication is based on x-admin-secret header matching ADMIN_SECRET env var.
 * All admin endpoints must use this helper to validate requests.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get environment variable with fallbacks
 */
function getEnv(key: string): string | undefined {
  return process.env[key];
}

/**
 * Get Supabase URL from environment
 */
function getSupabaseUrl(): string {
  const url = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  if (!url) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }
  return url;
}

/**
 * Get service role key from environment
 */
function getServiceRoleKey(): string {
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SB_SERVICE_ROLE_KEY');
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }
  return key;
}

/**
 * Get Supabase client with service role key for admin operations
 */
export function getAdminSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;
  
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();
  
  supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  
  return supabaseClient;
}

export interface AdminAuthResult {
  success: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Validate admin authentication via x-admin-secret header
 * 
 * @param req - Vercel request object
 * @returns Authentication result with success status
 */
export function validateAdminAuth(req: VercelRequest): AdminAuthResult {
  const adminSecret = getEnv('ADMIN_SECRET');
  
  // If ADMIN_SECRET is not configured, reject in production
  if (!adminSecret) {
    const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
    if (isProduction) {
      console.error('[Admin Auth] ADMIN_SECRET not configured in production');
      return {
        success: false,
        error: 'Server misconfiguration: admin authentication not configured',
        statusCode: 500,
      };
    }
    // Allow in development if secret not configured
    console.warn('[Admin Auth] ADMIN_SECRET not configured - allowing request in dev mode');
    return { success: true };
  }
  
  const requestSecret = req.headers['x-admin-secret'] as string | undefined;
  
  if (!requestSecret) {
    return {
      success: false,
      error: 'Missing x-admin-secret header',
      statusCode: 401,
    };
  }
  
  if (requestSecret !== adminSecret) {
    return {
      success: false,
      error: 'Invalid admin secret',
      statusCode: 401,
    };
  }
  
  return { success: true };
}

/**
 * Middleware-style auth check that sends error response if unauthorized
 * 
 * @param req - Vercel request object
 * @param res - Vercel response object
 * @returns true if authorized, false if response was sent
 */
export function requireAdminAuth(req: VercelRequest, res: VercelResponse): boolean {
  const authResult = validateAdminAuth(req);
  
  if (!authResult.success) {
    res.status(authResult.statusCode || 401).json({
      error: 'Unauthorized',
      message: authResult.error,
    });
    return false;
  }
  
  return true;
}

/**
 * Log admin action with structured format
 */
export function logAdminAction(
  action: string,
  details: Record<string, any>,
  req?: VercelRequest
): void {
  const logEntry = {
    action,
    ...details,
    admin_ip: req?.headers['x-forwarded-for'] || req?.headers['x-real-ip'] || 'unknown',
    timestamp: new Date().toISOString(),
  };
  
  console.log('[Admin Config]', JSON.stringify(logEntry));
}

/**
 * Standard error response helper
 */
export function sendError(
  res: VercelResponse,
  statusCode: number,
  error: string,
  details?: string
): void {
  res.status(statusCode).json({
    error,
    ...(details ? { message: details } : {}),
  });
}

/**
 * Standard success response helper
 */
export function sendSuccess<T>(
  res: VercelResponse,
  data: T,
  statusCode: number = 200
): void {
  res.status(statusCode).json(data);
}
