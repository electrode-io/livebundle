import * as events from "events";
import { Job, JobManager, JobManagerConfig, JobRunner } from "./types";

export class JobManagerImpl extends events.EventEmitter implements JobManager {
  private readonly jobQueue: Job[] = [];
  private runningJobsCount = 0;

  public static readonly JOB_RUNNING = "job.running";
  public static readonly JOB_QUEUED = "job.queued";
  public static readonly JOB_COMPLETED = "job.completed";
  public static readonly JOB_FAILED = "job.failed";

  public constructor(
    private readonly config: JobManagerConfig,
    private readonly jobRunner: JobRunner,
  ) {
    super();
    this.on(JobManagerImpl.JOB_COMPLETED, () => {
      this.runningJobsCount--;
      const job = this.jobQueue.pop();
      if (job) {
        this.run(job);
      }
    });
  }

  public add(job: Job): void {
    this.jobQueue.length === 0 &&
    this.runningJobsCount < this.config.maxConcurentJobs
      ? this.run(job)
      : this.enqueue(job);
  }

  private run(job: Job) {
    this.emit(JobManagerImpl.JOB_RUNNING, job);
    this.runningJobsCount++;
    this.jobRunner
      .run(job)
      .then(() => this.emit(JobManagerImpl.JOB_COMPLETED, job))
      .catch((error) => this.emit(JobManagerImpl.JOB_FAILED, { job, error }));
  }

  private enqueue(job: Job) {
    this.jobQueue.unshift(job);
    this.emit(JobManagerImpl.JOB_QUEUED, job);
  }
}
