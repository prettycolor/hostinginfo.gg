import { randomUUID } from "crypto";

export type PerformanceScanJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface PerformanceScanJob {
  id: string;
  domain: string;
  status: PerformanceScanJobStatus;
  progress: number;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const PERFORMANCE_SCAN_JOB_TTL_MS = Math.max(
  60_000,
  Number.parseInt(process.env.PERFORMANCE_SCAN_JOB_TTL_MS ?? "1800000", 10) ||
    1800000,
);
const PERFORMANCE_SCAN_JOB_MAX_COUNT = Math.max(
  100,
  Number.parseInt(process.env.PERFORMANCE_SCAN_JOB_MAX_COUNT ?? "1000", 10) ||
    1000,
);

const jobs = new Map<string, PerformanceScanJob>();
const activeDomainJobs = new Map<string, string>();

function isActiveJobStatus(status: PerformanceScanJobStatus): boolean {
  return status === "queued" || status === "processing";
}

function trimJobStoreIfNeeded() {
  if (jobs.size <= PERFORMANCE_SCAN_JOB_MAX_COUNT) return;

  const sorted = [...jobs.values()].sort((a, b) => a.updatedAt - b.updatedAt);
  const pruneCount = Math.max(
    1,
    sorted.length - PERFORMANCE_SCAN_JOB_MAX_COUNT,
  );

  for (let i = 0; i < pruneCount; i++) {
    const job = sorted[i];
    jobs.delete(job.id);
    const activeJobId = activeDomainJobs.get(job.domain);
    if (activeJobId === job.id) {
      activeDomainJobs.delete(job.domain);
    }
  }
}

export function cleanupPerformanceScanJobs(now = Date.now()) {
  for (const [jobId, job] of jobs.entries()) {
    const expired = now - job.updatedAt > PERFORMANCE_SCAN_JOB_TTL_MS;
    if (!expired) continue;

    jobs.delete(jobId);
    const activeJobId = activeDomainJobs.get(job.domain);
    if (activeJobId === job.id) {
      activeDomainJobs.delete(job.domain);
    }
  }
}

export function getPerformanceScanJob(
  jobId: string,
): PerformanceScanJob | null {
  cleanupPerformanceScanJobs();
  return jobs.get(jobId) ?? null;
}

export function getOrCreatePerformanceScanJob(domain: string): {
  job: PerformanceScanJob;
  reused: boolean;
} {
  cleanupPerformanceScanJobs();

  const activeJobId = activeDomainJobs.get(domain);
  if (activeJobId) {
    const existing = jobs.get(activeJobId);
    if (existing && isActiveJobStatus(existing.status)) {
      return { job: existing, reused: true };
    }
    activeDomainJobs.delete(domain);
  }

  const now = Date.now();
  const job: PerformanceScanJob = {
    id: randomUUID(),
    domain,
    status: "queued",
    progress: 0,
    createdAt: now,
    updatedAt: now,
  };

  jobs.set(job.id, job);
  activeDomainJobs.set(domain, job.id);
  trimJobStoreIfNeeded();

  return { job, reused: false };
}

export function markPerformanceScanJobProcessing(jobId: string): boolean {
  const job = jobs.get(jobId);
  if (!job || job.status !== "queued") return false;

  job.status = "processing";
  job.progress = Math.max(job.progress, 5);
  job.updatedAt = Date.now();
  return true;
}

export function updatePerformanceScanJobProgress(
  jobId: string,
  progress: number,
) {
  const job = jobs.get(jobId);
  if (!job || !isActiveJobStatus(job.status)) return;

  job.progress = Math.max(job.progress, Math.min(99, Math.round(progress)));
  job.updatedAt = Date.now();
}

export function completePerformanceScanJob(
  jobId: string,
  result: Record<string, unknown>,
) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "completed";
  job.progress = 100;
  job.result = result;
  job.error = undefined;
  job.updatedAt = Date.now();

  const activeJobId = activeDomainJobs.get(job.domain);
  if (activeJobId === job.id) {
    activeDomainJobs.delete(job.domain);
  }
}

export function failPerformanceScanJob(jobId: string, error: string) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "failed";
  job.progress = 100;
  job.error = error;
  job.updatedAt = Date.now();

  const activeJobId = activeDomainJobs.get(job.domain);
  if (activeJobId === job.id) {
    activeDomainJobs.delete(job.domain);
  }
}
