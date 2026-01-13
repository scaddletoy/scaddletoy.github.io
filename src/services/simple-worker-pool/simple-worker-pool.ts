export type WorkerStatus = 'idle' | 'busy' | 'cleanup' | 'error' | 'terminated';

export type WorkerPoolStatus = {
  workers: { id: string; status: WorkerStatus }[];
  taskQueueLength: number;
};

export type WorkerPoolStatusListener = (status: WorkerPoolStatus) => void;

export type WorkerTask<T, R, P> = {
  data: T;
  onProgress?: (msg: P) => void;
  resolve: (value: R) => void;
  reject: (reason: any) => void;
  abortController: AbortController;
};

export class SimpleWorkerPool<T, R, P> {
  private workerUrl: string | URL;
  private size: number;
  private workerOpts: WorkerOptions;
  private workers: Worker[] = [];
  private idleWorkers: Worker[] = [];
  private taskQueue: WorkerTask<T, R, P>[] = [];
  private workerTaskMap = new Map<Worker, WorkerTask<T, R, P>>();
  private workerIds = new Map<Worker, string>();
  private workerStatus = new Map<Worker, WorkerStatus>();
  private statusListeners: WorkerPoolStatusListener[] = [];

  constructor(workerUrl: string | URL, opts?: { size?: number }, workerOpts?: WorkerOptions) {
    this.workerUrl = workerUrl;
    this.workerOpts = workerOpts ?? {};
    this.size = Math.max(Math.min(opts?.size || navigator.hardwareConcurrency - 2, 1), 3);
    window.addEventListener('unload', () => {
      this.dispose();
    });
    for (let i = 0; i < this.size; ++i) {
      this.addWorker();
    }
  }

  private generateRandomId(length = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; ++i) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private addWorker() {
    const workerId: string = this.generateRandomId(2);
    const worker = new Worker(this.workerUrl, { ...this.workerOpts, name: `worker-${workerId}` });
    worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
    worker.onerror = (e) => this.handleWorkerError(worker, e);
    this.workers.push(worker);
    this.idleWorkers.push(worker);
    this.workerIds.set(worker, workerId);
    this.workerStatus.set(worker, 'idle');
    worker.postMessage({ __workerId: workerId });
    this.notifyStatus();
  }

  runTask(data: T, onProgress?: (msg: P) => void): { promise: Promise<R>; abort: () => void } {
    const abortController = new AbortController();
    let task: WorkerTask<T, R, P>;
    const dataWithId = { ...data, __workerTaskId: this.generateRandomId() };
    const promise = new Promise<R>((resolve, reject) => {
      task = { data: dataWithId, onProgress, resolve, reject, abortController };
      this.taskQueue.push(task);
      this.schedule();
      this.notifyStatus();
    });
    return {
      promise,
      abort: () => {
        abortController.abort();
        this.abortTask(task!);
      },
    };
  }

  private schedule() {
    while (this.idleWorkers.length && this.taskQueue.length) {
      const worker = this.idleWorkers.shift()!;
      const task = this.taskQueue.shift()!;
      this.workerTaskMap.set(worker, task);
      this.workerStatus.set(worker, 'busy');
      worker.postMessage(task.data);
      task.abortController.signal.addEventListener('abort', () => {
        this.terminateWorker(worker, task, 'aborted');
      });
    }
    this.notifyStatus();
  }

  private handleWorkerMessage(worker: Worker, e: MessageEvent) {
    const task = this.workerTaskMap.get(worker);
    if (!task) return;
    if (e.data && e.data.__workerResult) {
      task.resolve(e.data.result);
      this.workerStatus.set(worker, 'cleanup');
      this.notifyStatus();
    } else if (e.data && e.data.__workerFinishedTask) {
      this.finishTask(worker);
    } else {
      task.onProgress?.(e.data);
    }
  }

  private handleWorkerError(worker: Worker, e: ErrorEvent) {
    const task = this.workerTaskMap.get(worker);
    if (task) {
      task.reject(e.error || e.message);
      this.workerStatus.set(worker, 'error');
      this.finishTask(worker);
    }
    this.notifyStatus();
  }

  private finishTask(worker: Worker) {
    this.workerTaskMap.delete(worker);
    this.idleWorkers.push(worker);
    this.workerStatus.set(worker, 'idle');
    this.schedule();
    this.notifyStatus();
  }

  private abortTask(task: WorkerTask<any, any, any>) {
    // Find the worker running this task
    for (const [worker, t] of this.workerTaskMap.entries()) {
      if (t === task) {
        this.terminateWorker(worker, task, 'aborted');
        break;
      }
    }
    // If not running yet, remove from queue
    const idx = this.taskQueue.indexOf(task);
    if (idx !== -1) {
      this.taskQueue.splice(idx, 1);
      task.reject('aborted');
    }
    this.notifyStatus();
  }

  private terminateWorker(worker: Worker, task: WorkerTask<any, any, any>, reason: string) {
    this.workerTaskMap.delete(worker);
    this.workerStatus.set(worker, 'terminated');
    worker.terminate();
    // Replace with a new worker
    this.workers = this.workers.filter((w) => w !== worker);
    this.addWorker();
    task.reject(reason);
    this.schedule();
    this.notifyStatus();
  }

  dispose() {
    for (const worker of this.workers) {
      worker.terminate();
      this.workerStatus.set(worker, 'terminated');
    }
    this.workers = [];
    this.idleWorkers = [];
    this.taskQueue = [];
    this.workerTaskMap.clear();
    this.notifyStatus();
  }

  // --- Status API ---
  getStatus(): WorkerPoolStatus {
    return {
      workers: this.workers.map((worker) => ({
        id: this.workerIds.get(worker) || '',
        status: this.workerStatus.get(worker) || 'terminated',
      })),
      taskQueueLength: this.taskQueue.length,
    };
  }

  subscribeStatus(listener: WorkerPoolStatusListener) {
    this.statusListeners.push(listener);
    // Immediately notify with current status
    listener(this.getStatus());
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private notifyStatus() {
    const status = this.getStatus();
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }
}
