/**
 * Minimal diagnostic endpoint - NO external imports
 * Tests if Vercel can route to /api/admin-ping at all
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // #region agent log - Hypothesis B,D: Minimal handler to test routing
  res.status(200).json({
    ok: true,
    route: '/api/admin-ping',
    method: req.method,
    timestamp: new Date().toISOString(),
    hypothesisTest: 'If this responds, routing works. If 404, Vercel deployment issue.',
  });
  // #endregion
}
