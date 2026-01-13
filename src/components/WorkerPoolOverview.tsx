import React, { useEffect, useState } from 'react';
import { WorkerPoolStatus } from '../services/simple-worker-pool/simple-worker-pool.ts';
import { Badge } from 'primereact/badge';
import { workerPool } from '../services/openscad-wasm-runner/openscad-runner.ts';

const STATUS_COLORS: Record<string, string> = {
  idle: '#888',
  busy: '#00e676',
  cleanup: '#ffd600',
  error: '#ff1744',
  terminated: '#333',
};
const QUEUE_COLOR = (len: number) => (len > 0 ? '#ffd600' : '#888');
const NO_STATUS_COLOR = '#660000';

export default function WorkerPoolOverview() {
  const [workerPoolStatus, setWorkerPoolStatus] = useState<WorkerPoolStatus>({
    workers: [],
    taskQueueLength: -1,
  });
  useEffect(() => {
    if (workerPoolStatus.taskQueueLength != -1) return; // already subscribed
    workerPool.subscribeStatus((status) => setWorkerPoolStatus(status));
  }, [workerPoolStatus.taskQueueLength]);

  if (workerPoolStatus.taskQueueLength === -1) {
    return (
      <Badge
        key="noWorkerStatus"
        style={{ background: NO_STATUS_COLOR, minWidth: 16, minHeight: 16, color: '#fff' }}
      />
    );
  } else {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <i className="pi pi-hammer" title="OpenSCAD worker pool overview"></i>
        {workerPoolStatus.workers.map((worker) => (
          <Badge
            style={{
              background: STATUS_COLORS[worker.status] || '#888',
              color: '#fff',
            }}
            key={worker.id}
            value={worker.id}
            title={'Worker ' + worker.id}
          />
        ))}
        <Badge
          key="taskQueueLength"
          value={workerPoolStatus.taskQueueLength}
          style={{
            background: QUEUE_COLOR(workerPoolStatus.taskQueueLength),
            color: '#fff',
          }}
          title={`Task queue length: ${workerPoolStatus.taskQueueLength}`}
        />
      </div>
    );
  }
}
