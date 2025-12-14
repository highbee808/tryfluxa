/**
 * Vercel serverless function for admin gist publishing
 * Proxies requests to Supabase Edge Function publish-gist-v3
 * 
 * This endpoint requires admin authentication via x-admin-secret header
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const adminSecret = process.env.ADMIN_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('[Admin Publish] Handler invoked', {
    method: req.method,
    hasSupabaseUrl: !!supabaseUrl,
    hasAdminSecret: !!adminSecret,
    hasServiceKey: !!serviceKey,
  });

  // Validate environment variables
  if (!supabaseUrl) {
    console.error('[Admin Publish] Missing SUPABASE_URL');
    return res.status(500).json({
      error: 'Server misconfiguration: missing SUPABASE_URL',
    });
  }

  if (!serviceKey) {
    console.error('[Admin Publish] Missing SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({
      error: 'Server misconfiguration: missing SUPABASE_SERVICE_ROLE_KEY',
    });
  }

  // Validate admin secret if configured
  if (adminSecret) {
    const requestSecret = req.headers['x-admin-secret'] as string | undefined;
    
    console.log('[Admin Publish] Admin secret check', {
      hasRequestSecret: !!requestSecret,
      matches: requestSecret === adminSecret,
    });

    if (!requestSecret || requestSecret !== adminSecret) {
      console.error('[Admin Publish] Unauthorized - invalid or missing admin secret');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing admin secret',
      });
    }
  } else {
    console.warn('[Admin Publish] ADMIN_SECRET not configured - allowing all requests');
  }

  // Parse request body
  let body: any;
  try {
    body = req.body;
    console.log('[Admin Publish] Request body received', {
      hasBody: !!body,
      bodyKeys: body ? Object.keys(body) : [],
    });
  } catch (error: any) {
    console.error('[Admin Publish] Invalid JSON body', error);
    return res.status(400).json({
      error: 'Invalid JSON body',
      details: error?.message,
    });
  }

  try {
    // Forward request to Supabase Edge Function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/publish-gist-v3`;
    
    console.log('[Admin Publish] Calling Supabase Edge Function', {
      url: edgeFunctionUrl,
    });

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        ...(adminSecret ? { 'x-admin-secret': adminSecret } : {}),
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    
    console.log('[Admin Publish] Edge Function response', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 200),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!isJson) {
      console.error('[Admin Publish] Edge Function returned non-JSON response', {
        contentType,
        responsePreview: responseText.substring(0, 200),
      });
      return res.status(500).json({
        error: 'Edge Function returned invalid response',
        details: 'Expected JSON but received ' + contentType,
        responsePreview: responseText.substring(0, 200),
      });
    }

    // Parse and return JSON response
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error('[Admin Publish] Failed to parse JSON response', {
        error: parseError.message,
        responsePreview: responseText.substring(0, 200),
      });
      return res.status(500).json({
        error: 'Failed to parse Edge Function response',
        details: parseError.message,
        responsePreview: responseText.substring(0, 200),
      });
    }

    // Return the response with same status code
    return res.status(response.status).json(jsonResponse);

  } catch (error: any) {
    console.error('[Admin Publish] Error calling Edge Function', {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      error: 'Failed to reach Supabase Edge Function',
      details: error.message,
    });
  }
}

