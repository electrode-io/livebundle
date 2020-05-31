import FakeTimers from "@sinonjs/fake-timers";
import { expect } from "chai";
import "mocha";
import sinon from "sinon";
import { JobManagerImpl } from "../src";
import { Job, JobManagerConfig, JobRunner } from "../src/types";

class JobRunnerNullImpl implements JobRunner {
  public run(job: Job): Promise<void> {
    return Promise.resolve();
  }
}

describe("JobManagerImpl", () => {
  const sandbox = sinon.createSandbox();
  const clock = FakeTimers.createClock();

  const jobManagerConfig: JobManagerConfig = {
    maxConcurentJobs: 4,
  };

  const testJob: Job = {
    installationId: 12345,
    owner: "foo",
    repo: "bar",
    prNumber: 67890,
  };

  const jobRunnerStub: sinon.SinonStubbedInstance<JobRunnerNullImpl> = sandbox.createStubInstance(
    JobRunnerNullImpl,
  );

  afterEach(() => {
    sandbox.restore();
  });

  describe("constructor", () => {
    it("shoud not throw", () => {
      expect(
        () => new JobManagerImpl(jobManagerConfig, jobRunnerStub),
      ).to.not.throw();
    });
  });

  describe("add", () => {
    it("should run the job if queue is empty", () => {
      const stub = sandbox.createStubInstance(JobRunnerNullImpl, {
        run: sandbox.stub<[Job], Promise<void>>().resolves(),
      });
      const sut = new JobManagerImpl(jobManagerConfig, stub);
      sut.add(testJob);
      expect(stub.run.calledOnceWith(testJob)).true;
    });

    it("should emit JOB_RUNNING when a job starts running", () => {
      const stub = sandbox.createStubInstance(JobRunnerNullImpl, {
        run: sandbox.stub<[Job], Promise<void>>().resolves(),
      });
      const sut = new JobManagerImpl(jobManagerConfig, stub);
      const spy = sandbox.spy();
      sut.on(JobManagerImpl.JOB_RUNNING, spy);
      sut.add(testJob);
      expect(spy.calledOnce).true;
    });

    it("should emit JOB_COMPLETED when a job completes", (done) => {
      const stub = sandbox.createStubInstance(JobRunnerNullImpl, {
        run: sandbox.stub<[Job], Promise<void>>().resolves(),
      });
      const sut = new JobManagerImpl(jobManagerConfig, stub);
      const spy = sandbox.spy();
      sut.on(JobManagerImpl.JOB_COMPLETED, spy);
      sut.add(testJob);
      setTimeout(() => {
        expect(spy.calledOnce).true;
        done();
      }, 100);
    });

    it("should set the job in JOB_COMPLETED payload", (done) => {
      const stub = sandbox.createStubInstance(JobRunnerNullImpl, {
        run: sandbox.stub<[Job], Promise<void>>().resolves(),
      });
      const sut = new JobManagerImpl(jobManagerConfig, stub);
      const spy = sandbox.spy();
      sut.on(JobManagerImpl.JOB_COMPLETED, spy);
      sut.add(testJob);
      setTimeout(() => {
        expect(spy.calledOnceWith(testJob)).true;
        done();
      }, 100);
    });

    it("should emit JOB_FAILED when a job fails", (done) => {
      const stub = sandbox.createStubInstance(JobRunnerNullImpl, {
        run: sandbox.stub<[Job], Promise<void>>().rejects(new Error("Fail")),
      });
      const sut = new JobManagerImpl(jobManagerConfig, stub);
      const spy = sandbox.spy();
      sut.on(JobManagerImpl.JOB_FAILED, spy);
      sut.add(testJob);
      setTimeout(() => {
        expect(spy.calledOnce).true;
        done();
      }, 100);
    });

    it("should set the {job, error} in JOB_FAILED payload", (done) => {
      const error = new Error("Fail");
      const stub = sandbox.createStubInstance(JobRunnerNullImpl, {
        run: sandbox.stub<[Job], Promise<void>>().rejects(error),
      });
      const sut = new JobManagerImpl(jobManagerConfig, stub);
      const spy = sandbox.spy();
      sut.on(JobManagerImpl.JOB_FAILED, spy);
      sut.add(testJob);
      setTimeout(() => {
        expect(spy.calledOnceWith({ job: testJob, error })).true;
        done();
      }, 100);
    });

    it("should emit JOB_QUEUED when a job is queued", () => {
      const stub = sandbox.createStubInstance(JobRunnerNullImpl, {
        run: sandbox
          .stub<[Job], Promise<void>>()
          .onFirstCall()
          .callsFake(
            () =>
              new Promise((resolve) => {
                clock.setTimeout(() => resolve(), 5000);
              }),
          )
          .onSecondCall()
          .resolves(),
      });
      const sut = new JobManagerImpl({ maxConcurentJobs: 1 }, stub);
      const spy = sandbox.spy();
      sut.on(JobManagerImpl.JOB_QUEUED, spy);
      sut.add(testJob);
      sut.add(testJob);
      expect(spy.calledOnce).true;
    });

    it("should start the next job in queue", () => {
      const stub = sandbox.createStubInstance(JobRunnerNullImpl, {
        run: sandbox
          .stub<[Job], Promise<void>>()
          .onFirstCall()
          .callsFake(
            () =>
              new Promise((resolve) => {
                clock.setTimeout(() => resolve(), 5000);
              }),
          )
          .onSecondCall()
          .resolves(),
      });
      const sut = new JobManagerImpl({ maxConcurentJobs: 1 }, stub);
      const spy = sandbox.spy();
      sut.on(JobManagerImpl.JOB_RUNNING, spy);
      sut.add(testJob);
      const nextJob = Object.assign({}, testJob);
      sut.add(nextJob);
      clock.tick(5000);
      expect(spy.calledOnceWith(nextJob)).true;
    });
  });
});
