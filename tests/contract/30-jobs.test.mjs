// Layer: contract/jobs — slow work enqueues fast without blocking.
// Asserts the enqueue contract; the worker draining is proven by worker logs/health.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchJson } from '../helpers.mjs';

describe('jobs queue', () => {
  it('POST /api/jobs/enqueue accepts work and returns a job id', async () => {
    const r = await fetchJson('/api/jobs/enqueue', {
      method: 'POST',
      body: { kind: 'email.verify', payload: { to: 'contract@test.local' } },
    });
    assert.ok([200, 201].includes(r.status), `enqueue status ${r.status}`);
    assert.equal(r.json?.queued, true);
    assert.equal(typeof r.json?.jobId, 'string');
  });
});
