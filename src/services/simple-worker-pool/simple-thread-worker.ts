export class SimpleThreadWorker<T, R> {
  workerId: string = 'init';
  currentTaskId: string = 'init';

  constructor() {
    self.onmessage = (e: MessageEvent) => {
      if (e.data && e.data.__abort) {
        this.onAbort?.();
        return;
      } else if (e.data && e.data.__workerId) {
        this.workerId = e.data.__workerId;
        return;
      }
      if (e.data && e.data.__workerTaskId) {
        this.currentTaskId = e.data.__workerTaskId;
      } else {
        this.currentTaskId = 'none';
      }
      this.onMessage(e.data);
    };
  }

  log(...args: any[]) {
    console.log(`[WORKER.${this.workerId}.${this.currentTaskId}]`, ...args);
  }

  debug(...args: any[]) {
    console.debug(`[WORKER.${this.workerId}.${this.currentTaskId}]`, ...args);
  }

  error(...args: any[]) {
    console.error(`[WORKER.${this.workerId}.${this.currentTaskId}]`, ...args);
  }

  onMessage(data: T): void {}

  onAbort?(): void;

  postProgress(msg: any) {
    self.postMessage(msg);
  }

  postResult(result: R) {
    self.postMessage({ __workerResult: true, result });
  }

  finishTask() {
    self.postMessage({ __workerFinishedTask: true });
  }
}
