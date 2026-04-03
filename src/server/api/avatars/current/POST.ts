/**
 * POST /api/avatars/current
 *
 * Compatibility alias for avatar selection.
 */

import type { Request, Response } from 'express';
import selectHandler from '../select/POST.js';

export default async function handler(req: Request, res: Response) {
  console.log('[Avatar Current POST] Request received');
  console.log('[Avatar Current POST] Auth header present:', Boolean(req.headers.authorization));
  console.log('[Avatar Current POST] Body:', req.body);
  return selectHandler(req, res);
}
