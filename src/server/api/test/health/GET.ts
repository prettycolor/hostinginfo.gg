import type { Request, Response } from 'express';

/**
 * GET /api/test/health
 * Simple health check endpoint
 */
export default async function handler(req: Request, res: Response) {
  res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString(),
  });
}
