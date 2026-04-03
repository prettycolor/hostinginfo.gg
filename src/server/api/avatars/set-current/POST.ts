/**
 * POST /api/avatars/set-current
 *
 * Alias endpoint for avatar selection.
 * Kept to avoid edge/WAF filters that may block /select routes.
 */

import type { Request, Response } from 'express';
import selectHandler from '../select/POST.js';

export default async function handler(req: Request, res: Response) {
  console.log('[Avatar Set Current] Request received');
  console.log('[Avatar Set Current] Auth header present:', Boolean(req.headers.authorization));
  console.log('[Avatar Set Current] Body:', req.body);
  return selectHandler(req, res);
}
