/**
 * PKCE (Proof Key for Code Exchange) Utilities for Spotify OAuth
 * Implements RFC 7636 - PKCE for OAuth 2.0
 */

/**
 * Generate a cryptographically random code verifier
 * Must be between 43 and 128 characters
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  // Base64url encode (URL-safe base64 without padding)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .slice(0, 128);
}

/**
 * Generate code challenge from verifier using SHA256
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);

  // Base64url encode
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
