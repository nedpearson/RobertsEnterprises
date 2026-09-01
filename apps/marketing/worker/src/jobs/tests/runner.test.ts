import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchJob, JOB_REGISTRY } from '../registry';
import { claimNextJob, processDurableJob, reclaimStaleLocks, pollOnce } from '../runner';

// Create a mock Supabase DB client for deterministic unit testing
function createMockDb(initialJobs: any[] = []) {
  const jobs: any[] = JSON.parse(JSON.stringify(initialJobs));
  const messages: any[] = [];
  const adCampaigns: any[] = [];

  const mockDb: any = {
    jobs,
    messages,
    adCampaigns,
    from: (table: string) => {
      if (table === 'durable_jobs') {
        return {
          select: (_cols?: string, opts?: any) => {
            if (opts?.head && opts?.count === 'exact') {
              return {
                eq: (field: string, val: any) => {
                  const count = jobs.filter((j) => j[field] === val).length;
                  return Promise.resolve({ count, error: null });
                },
                in: (field: string, vals: any[]) => {
                  const count = jobs.filter((j) => vals.includes(j[field])).length;
                  return Promise.resolve({ count, error: null });
                },
              };
            }
            const queryObj: any = {
              eq: (field: string, val: any) => {
                const filtered = jobs.filter((j) => j[field] === val);
                return {
                  ...queryObj,
                  lte: (dateField: string, dateVal: string) => ({
                    order: () => ({
                      limit: (num: number) => {
                        const matched = filtered
                          .filter((j) => !j[dateField] || new Date(j[dateField]).getTime() <= new Date(dateVal).getTime())
                          .slice(0, num);
                        return Promise.resolve({ data: matched, error: null });
                      },
                    }),
                  }),
                  maybeSingle: () => Promise.resolve({ data: filtered[0] || null, error: null }),
                  single: () => Promise.resolve({ data: filtered[0] || null, error: filtered[0] ? null : new Error('Not found') }),
                  then: (resolve: any) => resolve({ data: filtered, error: null }),
                };
              },
              in: (field: string, vals: any[]) => {
                const filtered = jobs.filter((j) => vals.includes(j[field]));
                return {
                  ...queryObj,
                  order: () => ({
                    range: (from: number, to: number) => Promise.resolve({ data: filtered.slice(from, to + 1), error: null }),
                    limit: (limit: number) => Promise.resolve({ data: filtered.slice(0, limit), error: null }),
                  }),
                  then: (resolve: any) => resolve({ data: filtered, error: null }),
                };
              },
              lt: (field: string, val: string) => {
                const matched = jobs.filter((j) => j[field] && new Date(j[field]).getTime() < new Date(val).getTime());
                return Promise.resolve({ data: matched, error: null });
              },
              order: () => ({
                range: (from: number, to: number) => Promise.resolve({ data: jobs.slice(from, to + 1), error: null }),
                limit: (limit: number) => Promise.resolve({ data: jobs.slice(0, limit), error: null }),
              }),
              then: (resolve: any) => resolve({ data: jobs, error: null }),
            };
            return queryObj;
          },
          update: (updates: any) => {
            const applyUpdates = (filterFn: (j: any) => boolean) => {
              const updatedList: any[] = [];
              for (let i = 0; i < jobs.length; i++) {
                if (filterFn(jobs[i])) {
                  jobs[i] = { ...jobs[i], ...updates };
                  updatedList.push(jobs[i]);
                }
              }
              return updatedList;
            };

            const makeResult = (filterFn: (j: any) => boolean) => {
              const res: any = {
                eq: (f2: string, v2: any) => makeResult((j) => filterFn(j) && j[f2] === v2),
                lt: (f2: string, v2: any) => makeResult((j) => filterFn(j) && j[f2] && new Date(j[f2]).getTime() < new Date(v2).getTime()),
                select: () => ({
                  single: () => {
                    const list = applyUpdates(filterFn);
                    return Promise.resolve({ data: list[0] || null, error: list[0] ? null : new Error('Not found') });
                  },
                  maybeSingle: () => {
                    const list = applyUpdates(filterFn);
                    return Promise.resolve({ data: list[0] || null, error: null });
                  },
                  then: (resolve: any) => {
                    const list = applyUpdates(filterFn);
                    return resolve({ data: list, error: null });
                  },
                }),
                then: (resolve: any) => {
                  const list = applyUpdates(filterFn);
                  return resolve({ data: list, error: null });
                },
              };
              return res;
            };

            return {
              eq: (f1: string, v1: any) => makeResult((j) => j[f1] === v1),
              lt: (f1: string, v1: any) => makeResult((j) => j[f1] && new Date(j[f1]).getTime() < new Date(v1).getTime()),
            };
          },
          insert: (newRow: any) => {
            const rows = Array.isArray(newRow) ? newRow : [newRow];
            jobs.push(...rows);
            return Promise.resolve({ data: rows, error: null });
          },
        };
      }

      if (table === 'messages') {
        return {
          insert: (newRow: any) => {
            const rows = Array.isArray(newRow) ? newRow : [newRow];
            messages.push(...rows);
            return Promise.resolve({ data: rows, error: null });
          },
        };
      }

      if (table === 'growth_ad_campaigns' || table === 'marketing_campaigns') {
        return {
          update: (updates: any) => ({
            eq: (field: string, val: any) => {
              adCampaigns.push({ field, val, updates });
              return Promise.resolve({ data: [{ ...updates, [field]: val }], error: null });
            },
          }),
        };
      }

      if (table === 'customers') {
        const customers = [
          {
            id: 'cust_123',
            business_id: 'biz_bridal_1',
            name: 'Emma Watson',
            phone: '+15551234567',
            sms_opt_in: true,
            location_id: 'loc_br',
          },
        ];
        const query = (rows: any[]): any => ({
          eq: (field: string, val: any) => query(rows.filter((row) => row[field] === val)),
          maybeSingle: () => Promise.resolve({ data: rows[0] || null, error: null }),
        });
        return { select: () => query(customers) };
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
        insert: (row: any) => Promise.resolve({ data: [row], error: null }),
      };
    },
  };

  return mockDb;
}

test('Job Registry: handles sync_shopify_catalog', async () => {
  const mockDb = createMockDb();
  const job = {
    id: '11111111-1111-1111-1111-111111111111',
    queue_name: 'sync_shopify_catalog',
    payload: { brand: 'I Do Bridal Couture' },
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
  };

  const res = await dispatchJob(job, mockDb);
  assert.equal(res.success, true);
  assert.equal(res.count, 1520);
});

test('Job Registry: handles publish_meta_campaign', async () => {
  const mockDb = createMockDb();
  const job = {
    id: '22222222-2222-2222-2222-222222222222',
    queue_name: 'publish_meta_campaign',
    payload: { brand: 'Proper & Co', campaignPayload: { name: 'Spring Bridal Collection' } },
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
  };

  const res = await dispatchJob(job, mockDb);
  assert.equal(res.success, true);
  assert.match(res.external_id, /^act_123456_/);
});

test('Job Registry: handles run_prospecting', async () => {
  const mockDb = createMockDb();
  const job = {
    id: '33333333-3333-3333-3333-333333333333',
    queue_name: 'run_prospecting',
    payload: { brand: 'Proper & Company' },
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
  };

  const res = await dispatchJob(job, mockDb);
  assert.equal(res.success, true);
  assert.equal(res.brand, 'Proper & Company');
});

test('Job Registry: handles generate_outreach with persistence', async () => {
  const mockDb = createMockDb();
  const job = {
    id: '44444444-4444-4444-4444-444444444444',
    business_id: 'biz_123',
    queue_name: 'generate_outreach',
    payload: { leadId: 'lead_abc', brand: 'I Do Bridal', persist: true },
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
  };

  const res = await dispatchJob(job, mockDb);
  assert.equal(res.success, true);
  assert.ok(res.draft.includes('bridal appointment'));
  assert.equal(mockDb.messages.length, 1);
  assert.equal(mockDb.messages[0].channel, 'outreach');
});

test('Job Registry: handles emergency_pause_all and pause_campaign', async () => {
  const mockDb = createMockDb();
  const jobEmergency = {
    id: '55555555-5555-5555-5555-555555555555',
    queue_name: 'emergency_pause_all',
    payload: { brand: 'I Do Bridal Couture' },
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
  };

  const resEmergency = await dispatchJob(jobEmergency, mockDb);
  assert.equal(resEmergency.success, true);
  assert.equal(resEmergency.action, 'haltAllCampaigns');

  const jobPause = {
    id: '66666666-6666-6666-6666-666666666666',
    queue_name: 'pause_campaign',
    payload: { campaign_id: 'camp_123' },
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
  };

  const resPause = await dispatchJob(jobPause, mockDb);
  assert.equal(resPause.success, true);
  assert.equal(resPause.campaign_id, 'camp_123');
});

test('Job Registry: SMS reminder fails closed when provider configuration is unavailable', async () => {
  const mockDb = createMockDb();
  const priorSid = process.env.TWILIO_ACCOUNT_SID;
  const priorToken = process.env.TWILIO_AUTH_TOKEN;
  const priorFrom = process.env.TWILIO_PHONE_NUMBER;
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_PHONE_NUMBER;
  const job = {
    id: '77777777-7777-7777-7777-777777777777',
    business_id: 'biz_bridal_1',
    queue_name: 'send_sms_reminder',
    payload: { customer_id: 'cust_123', message: 'Your fitting is tomorrow at 2pm.' },
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
  };

  try {
    await assert.rejects(() => dispatchJob(job, mockDb), /Twilio is not configured for SMS reminders/);
    assert.equal(mockDb.messages.length, 0, 'Unsent SMS must not be recorded as sent history.');
  } finally {
    if (priorSid === undefined) delete process.env.TWILIO_ACCOUNT_SID; else process.env.TWILIO_ACCOUNT_SID = priorSid;
    if (priorToken === undefined) delete process.env.TWILIO_AUTH_TOKEN; else process.env.TWILIO_AUTH_TOKEN = priorToken;
    if (priorFrom === undefined) delete process.env.TWILIO_PHONE_NUMBER; else process.env.TWILIO_PHONE_NUMBER = priorFrom;
  }
});

test('Job Registry: throws on unknown queue name', async () => {
  const mockDb = createMockDb();
  const job = {
    id: '88888888-8888-8888-8888-888888888888',
    queue_name: 'unsupported_queue_action',
    payload: {},
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
  };

  await assert.rejects(async () => {
    await dispatchJob(job, mockDb);
  }, /Unknown job queue: unsupported_queue_action/);
});

test('Job Runner: atomic lock claims pending job and sets running state', async () => {
  const initialJob = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    queue_name: 'sync_shopify_catalog',
    payload: { brand: 'Test Brand' },
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
    next_retry_at: new Date(Date.now() - 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  const mockDb = createMockDb([initialJob]);
  const claimed = await claimNextJob(mockDb, 'worker-unit-test');

  assert.ok(claimed);
  assert.equal(claimed.id, initialJob.id);
  assert.equal(claimed.status, 'running');
  assert.equal(claimed.locked_by, 'worker-unit-test');
  assert.equal(claimed.attempts, 1);
  assert.ok(claimed.locked_at);

  const secondClaim = await claimNextJob(mockDb, 'worker-unit-test-2');
  assert.equal(secondClaim, null);
});

test('Job Runner: failed job execution applies exponential backoff when attempts < max_attempts', async () => {
  const job = {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    queue_name: 'unsupported_queue_action',
    payload: {},
    status: 'running',
    attempts: 2,
    max_attempts: 5,
    locked_at: new Date().toISOString(),
    locked_by: 'worker-unit-test',
  };

  const mockDb = createMockDb([job]);
  const res = await processDurableJob(job, mockDb);

  assert.equal(res.success, false);
  const updated = mockDb.jobs.find((j: any) => j.id === job.id);
  assert.equal(updated.status, 'pending');
  assert.equal(updated.locked_at, null);
  assert.equal(updated.locked_by, null);
  assert.ok(updated.error_message.includes('Unknown job queue'));
  assert.ok(new Date(updated.next_retry_at).getTime() > Date.now());
});

test('Job Runner: failed job execution transitions to dead-letter queue when attempts >= max_attempts', async () => {
  const job = {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    queue_name: 'unsupported_queue_action',
    payload: {},
    status: 'running',
    attempts: 5,
    max_attempts: 5,
    locked_at: new Date().toISOString(),
    locked_by: 'worker-unit-test',
  };

  const mockDb = createMockDb([job]);
  const res = await processDurableJob(job, mockDb);

  assert.equal(res.success, false);
  const updated = mockDb.jobs.find((j: any) => j.id === job.id);
  assert.equal(updated.status, 'dead-letter');
  assert.equal(updated.locked_at, null);
  assert.equal(updated.locked_by, null);
  assert.ok(updated.error_message.includes('Unknown job queue'));
});

test('Job Runner: watchdog reclaims stale locks older than threshold', async () => {
  const staleJob = {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    queue_name: 'sync_shopify_catalog',
    payload: {},
    status: 'running',
    attempts: 1,
    max_attempts: 5,
    locked_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    locked_by: 'dead-worker-pid-999',
  };

  const freshJob = {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    queue_name: 'sync_shopify_catalog',
    payload: {},
    status: 'running',
    attempts: 1,
    max_attempts: 5,
    locked_at: new Date().toISOString(),
    locked_by: 'live-worker-pid-100',
  };

  const mockDb = createMockDb([staleJob, freshJob]);
  const reclaimedCount = await reclaimStaleLocks(mockDb, 5);

  assert.equal(reclaimedCount, 1);
  const updatedStale = mockDb.jobs.find((j: any) => j.id === staleJob.id);
  assert.equal(updatedStale.status, 'pending');
  assert.equal(updatedStale.locked_at, null);
  assert.equal(updatedStale.locked_by, null);

  const updatedFresh = mockDb.jobs.find((j: any) => j.id === freshJob.id);
  assert.equal(updatedFresh.status, 'running');
});

test('Job Runner: pollOnce executes pending job end-to-end to completed state', async () => {
  const job = {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    queue_name: 'sync_shopify_catalog',
    payload: { brand: 'I Do Bridal Couture' },
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
    next_retry_at: new Date(Date.now() - 5000).toISOString(),
    created_at: new Date().toISOString(),
  };

  const mockDb = createMockDb([job]);
  const outcome = await pollOnce(mockDb, 'poller-test-worker');

  assert.equal(outcome.processed, 1);
  const completedJob = mockDb.jobs.find((j: any) => j.id === job.id);
  assert.equal(completedJob.status, 'completed');
  assert.equal(completedJob.locked_at, null);
  assert.equal(completedJob.locked_by, null);
});
