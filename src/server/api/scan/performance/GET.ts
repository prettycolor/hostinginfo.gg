import type { Request, Response } from "express";
import { getPerformanceScanJob } from "../../../lib/performance-scan-jobs.js";

export default async function handler(req: Request, res: Response) {
  res.set("Cache-Control", "no-store");

  const rawJobId =
    typeof req.query?.jobId === "string" ? req.query.jobId.trim() : "";
  if (!rawJobId) {
    return res
      .status(400)
      .json({ error: "Missing required query param: jobId" });
  }

  const job = getPerformanceScanJob(rawJobId);
  if (!job) {
    return res.status(404).json({ error: "Performance scan job not found" });
  }

  const statusCode =
    job.status === "completed" || job.status === "failed" ? 200 : 202;
  return res.status(statusCode).json({
    jobId: job.id,
    domain: job.domain,
    status: job.status,
    progress: job.progress,
    pollAfterMs:
      job.status === "completed" || job.status === "failed" ? 0 : 2000,
    result: job.status === "completed" ? job.result : undefined,
    error: job.status === "failed" ? job.error : undefined,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
