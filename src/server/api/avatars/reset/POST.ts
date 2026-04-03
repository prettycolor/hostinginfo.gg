/**
 * POST /api/avatars/reset
 *
 * Compatibility endpoint that delegates to setup with forceRebuild enabled.
 * This prevents legacy tier data from being reinserted.
 */

import type { Request, Response } from 'express';
import setupHandler from '../setup/POST.js';

export default async function handler(req: Request, res: Response) {
  const patchedReq = {
    ...req,
    body: {
      ...(req.body || {}),
      forceRebuild: true,
    },
  } as Request;

  return setupHandler(patchedReq, res);
}
