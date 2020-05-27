import * as events from "events";
import { JobRunner } from "./JobRunner";
import { Job, JobManagerConfig } from "./types";

export class JobManager extends events.EventEmitter {
  private readonly jobQueue: Job[] = [];
  private runningJobsCount = 0;

  public static readonly EVENT_JOB_RUNNING = "job.running";
  public static readonly EVENT_JOB_QUEUED = "job.queued";
  public static readonly EVENT_JOB_COMPLETED = "job.completed";
  public static readonly EVENT_JOB_FAILED = "job.failed";

  public constructor(
    private readonly config: JobManagerConfig,
    private readonly jobRunner: JobRunner,
  ) {
    super();
    this.on(JobManager.EVENT_JOB_COMPLETED, () => {
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
    this.emit(JobManager.EVENT_JOB_RUNNING, job);
    this.jobRunner
      .run(job)
      .then(() => this.emit(JobManager.EVENT_JOB_COMPLETED, job))
      .catch((error) => this.emit(JobManager.EVENT_JOB_FAILED, { job, error }));
  }

  private enqueue(job: Job) {
    this.jobQueue.unshift(job);
    this.emit(JobManager.EVENT_JOB_QUEUED, job);
  }
}
