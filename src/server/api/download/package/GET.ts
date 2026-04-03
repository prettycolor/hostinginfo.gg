import type { Request, Response } from "express";

export default async function handler(_req: Request, res: Response) {
  res.status(404).json({
    error: "Not Found",
    message: "This endpoint is disabled.",
  });
}

