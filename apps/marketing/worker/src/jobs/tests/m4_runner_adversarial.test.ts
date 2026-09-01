import test from 'node:test';
import assert from 'node:assert/strict';
import { SupabaseClient } from '@supabase/supabase-js';
import { dispatchJob, JOB_REGISTRY, DurableJob } from '../registry';
import { claimNextJob, processDurableJob, reclaimStaleLocks, pollOnce } from '../runner';

// Robust Mock Database for Adversarial Testing
function createAdversarialMockDb(initialJobs: any[] = []) {
  const jobs: any[] = JSON.parse(JSON.stringify(initialJobs));
  const messages: any[] = [];
  const adCampaigns: any[] = [];
  const marketingCampaigns: any[] = [];
  const customers: any[] = [
    { id: 'cust_001', business_id: 'biz_001', name: 'Sophia Loren', phone: '+15559876543', sms_opt_in: true, location_id: 'loc_br' },
    { id: 'cust_002', business_id: 'biz_001', name: 'Audrey Hepburn', phone: '+15551112222', sms_opt_in: false, location_id: 'loc_cov' },
  ];

  let shouldSimulateDbError = false;

  const mockDb: any = {
    jobs,
    messages,
    adCampaigns,
    marketingCampaigns,
    customers,
    setDbError: (fail: boolean) => {
      shouldSimulateDbError = fail;
    },
    from: (table: string) => {
      if (shouldSimulateDbError) {
        return {
          select: () => Promise.resolve({ data: null, error: new Error('Simulated Database Connection Loss') }),
          update: () => Promise.resolve({ data: null, error: new Error('Simulated Database Write Failure') }),
          insert: () => Promise.resolve({ data: null, error: new Error('Simulated Database Insert Failure') }),
        };
      }

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

// ============================================================================
// ADVERSARIAL TEST SUITES
// ============================================================================

test('ADV-RUN-01: Exponential backoff calculation and jitter bounds across attempts 1..10', async () => {
  const mockDb = createAdversarialMockDb();

  for (let attempt = 1; attempt <= 10; attempt++) {
    const job: DurableJob = {
      id: `adv-backoff-job-attempt-${attempt}`,
      queue_name: 'non_existent_queue',
      payload: {},
      status: 'running',
      attempts: attempt,
      max_attempts: 12,
      locked_at: new Date().toISOString(),
      locked_by: 'worker-adv-test',
    };

    mockDb.jobs.push(job);
    const startTime = Date.now();
    const result = await processDurableJob(job, mockDb as any);

    assert.equal(result.success, false);
    const updatedJob = mockDb.jobs.find((j: any) => j.id === job.id);
    assert.equal(updatedJob.status, 'pending');
    assert.ok(updatedJob.next_retry_at, 'next_retry_at must be populated');

    const nextRetryMs = new Date(updatedJob.next_retry_at).getTime();
    const delaySeconds = Math.round((nextRetryMs - startTime) / 1000);
    const expectedBase = Math.min(300, Math.pow(2, attempt) * 5);
    const minDelay = expectedBase;
    const maxDelay = expectedBase + 3;

    assert.ok(
      delaySeconds >= minDelay - 1 && delaySeconds <= maxDelay + 1,
      `Attempt ${attempt}: delay ${delaySeconds}s should be within [${minDelay}, ${maxDelay}]s (base: ${expectedBase}s)`
    );

    const observedJitter = delaySeconds - expectedBase;
    assert.ok(observedJitter >= -1 && observedJitter <= 3, `Jitter ${observedJitter} must be non-negative and <= 2s`);
  }
});

test('ADV-RUN-02: Exponential backoff handles extreme attempt counts without overflow (50, 100, 1000)', async () => {
  const mockDb = createAdversarialMockDb();

  const extremeAttempts = [50, 100, 1000];
  for (const att of extremeAttempts) {
    const job: DurableJob = {
      id: `adv-overflow-job-${att}`,
      queue_name: 'failing_action',
      payload: {},
      status: 'running',
      attempts: att,
      max_attempts: att + 5,
    };

    mockDb.jobs.push(job);
    const result = await processDurableJob(job, mockDb as any);
    assert.equal(result.success, false);

    const updated = mockDb.jobs.find((j: any) => j.id === job.id);
    assert.equal(updated.status, 'pending');
    const retryDate = new Date(updated.next_retry_at);
    assert.ok(!isNaN(retryDate.getTime()), 'next_retry_at must be a valid date even for huge attempt numbers');

    const diffSec = (retryDate.getTime() - Date.now()) / 1000;
    assert.ok(diffSec >= 295 && diffSec <= 305, `Delay should be clamped to ~300s, got ${diffSec}s`);
  }
});

test('ADV-RUN-03: Transition to dead-letter queue when attempts >= max_attempts under varied thresholds', async () => {
  const mockDb = createAdversarialMockDb();

  const testCases = [
    { attempts: 1, maxAttempts: 1, expectDlq: true },
    { attempts: 3, maxAttempts: 3, expectDlq: true },
    { attempts: 4, maxAttempts: 5, expectDlq: false },
    { attempts: 5, maxAttempts: 5, expectDlq: true },
    { attempts: 6, maxAttempts: 5, expectDlq: true },
    { attempts: 10, maxAttempts: 10, expectDlq: true },
  ];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const job: DurableJob = {
      id: `adv-dlq-case-${i}`,
      queue_name: 'failing_queue_test',
      payload: { data: 'test' },
      status: 'running',
      attempts: tc.attempts,
      max_attempts: tc.maxAttempts,
      locked_at: new Date().toISOString(),
      locked_by: 'worker-dlq-test',
    };

    mockDb.jobs.push(job);
    const res = await processDurableJob(job, mockDb as any);
    assert.equal(res.success, false);

    const updated = mockDb.jobs.find((j: any) => j.id === job.id);
    if (tc.expectDlq) {
      assert.equal(updated.status, 'dead-letter', `Case ${i} (att: ${tc.attempts}, max: ${tc.maxAttempts}) must transition to dead-letter`);
      assert.equal(updated.locked_at, null);
      assert.equal(updated.locked_by, null);
      assert.ok(updated.error_details, 'error_details must be present in DLQ');
      assert.ok(updated.error_details.stack !== undefined);
    } else {
      assert.equal(updated.status, 'pending', `Case ${i} (att: ${tc.attempts}, max: ${tc.maxAttempts}) must remain pending for retry`);
    }
  }
});

test('ADV-RUN-04: Stale-lock watchdog recovery at boundary (4m59s vs 5m01s) and batch recovery', async () => {
  const now = Date.now();
  const freshJob = {
    id: 'adv-lock-fresh',
    queue_name: 'sync_shopify_catalog',
    status: 'running',
    locked_at: new Date(now - 4 * 60 * 1000 - 50 * 1000).toISOString(),
    locked_by: 'live-worker-1',
  };
  const staleJob1 = {
    id: 'adv-lock-stale-1',
    queue_name: 'sync_shopify_catalog',
    status: 'running',
    locked_at: new Date(now - 5 * 60 * 1000 - 5 * 1000).toISOString(),
    locked_by: 'dead-worker-1',
  };
  const staleJob2 = {
    id: 'adv-lock-stale-2',
    queue_name: 'publish_meta_campaign',
    status: 'running',
    locked_at: new Date(now - 60 * 60 * 1000).toISOString(),
    locked_by: 'dead-worker-2',
  };
  const completedJob = {
    id: 'adv-lock-completed',
    queue_name: 'sync_shopify_catalog',
    status: 'completed',
    locked_at: new Date(now - 60 * 60 * 1000).toISOString(),
    locked_by: 'dead-worker-3',
  };
  const dlqJob = {
    id: 'adv-lock-dlq',
    queue_name: 'sync_shopify_catalog',
    status: 'dead-letter',
    locked_at: new Date(now - 60 * 60 * 1000).toISOString(),
    locked_by: 'dead-worker-4',
  };

  const mockDb = createAdversarialMockDb([freshJob, staleJob1, staleJob2, completedJob, dlqJob]);
  const reclaimed = await reclaimStaleLocks(mockDb as any, 5);

  assert.equal(reclaimed, 2, 'Must reclaim exactly the 2 stale running jobs');

  const uFresh = mockDb.jobs.find((j: any) => j.id === freshJob.id);
  assert.equal(uFresh.status, 'running', 'Fresh running job must not be reclaimed');

  const uStale1 = mockDb.jobs.find((j: any) => j.id === staleJob1.id);
  assert.equal(uStale1.status, 'pending', 'Stale job 1 must be reset to pending');
  assert.equal(uStale1.locked_at, null);
  assert.equal(uStale1.locked_by, null);
  assert.match(uStale1.error_message, /Worker timeout/);

  const uStale2 = mockDb.jobs.find((j: any) => j.id === staleJob2.id);
  assert.equal(uStale2.status, 'pending', 'Stale job 2 must be reset to pending');

  const uComp = mockDb.jobs.find((j: any) => j.id === completedJob.id);
  assert.equal(uComp.status, 'completed', 'Completed job must never be touched');

  const uDlq = mockDb.jobs.find((j: any) => j.id === dlqJob.id);
  assert.equal(uDlq.status, 'dead-letter', 'DLQ job must never be touched');
});

test('ADV-REG-01: Queue Action Dispatch across all 10 action types with valid payloads and real provider boundaries', async () => {
  const mockDb = createAdversarialMockDb();

  const res1 = await dispatchJob({ id: 'job-1', queue_name: 'sync_shopify_catalog', payload: { brand: 'I Do Bridal Couture' }, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  assert.equal(res1.success, true);

  const res2 = await dispatchJob({ id: 'job-2', queue_name: 'publish_meta_campaign', payload: { brand: 'Proper & Co', campaignPayload: { name: 'Fall Bridal' }, campaign_id: 'camp_001' }, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  assert.equal(res2.success, true);

  const res3 = await dispatchJob({ id: 'job-3', queue_name: 'run_prospecting', payload: { brand: 'Proper & Company' }, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  assert.equal(res3.success, true);

  const res4 = await dispatchJob({ id: 'job-4', business_id: 'biz_001', queue_name: 'generate_outreach', payload: { leadId: 'lead_123', content: 'Looking for dresses', brand: 'I Do Bridal', persist: true }, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  assert.equal(res4.success, true);
  assert.ok(res4.draft);

  const res5 = await dispatchJob({ id: 'job-5', business_id: 'biz_001', queue_name: 'emergency_pause_all', payload: { brand: 'Proper & Co', platform: 'meta' }, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  assert.equal(res5.success, true);
  assert.equal(res5.action, 'haltAllCampaigns');

  const res6 = await dispatchJob({ id: 'job-6', queue_name: 'pause_campaign', payload: { campaign_id: 'camp_meta_999' }, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  assert.equal(res6.success, true);
  assert.equal(res6.campaign_id, 'camp_meta_999');

  const res7 = await dispatchJob({ id: 'job-7', business_id: 'biz_001', queue_name: 'send_email_digest', payload: { recipients: ['admin@roberts.com'], periodDays: 14 }, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  assert.ok(res7);
  assert.equal(res7.businessId, 'biz_001');

  const res8 = await dispatchJob({ id: 'job-8', business_id: 'biz_001', queue_name: 'sync_growth', payload: { siteUrl: 'https://idobridal.com' }, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  assert.equal(res8.success, true);

  const res9 = await dispatchJob({ id: 'job-9', queue_name: 'replay_dlq', payload: { connection_id: 'conn_shopify_001', resourceType: 'orders' }, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  assert.ok(res9);

  const priorSid = process.env.TWILIO_ACCOUNT_SID;
  const priorToken = process.env.TWILIO_AUTH_TOKEN;
  const priorFrom = process.env.TWILIO_PHONE_NUMBER;
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_PHONE_NUMBER;
  try {
    await assert.rejects(
      () => dispatchJob({ id: 'job-10', business_id: 'biz_001', queue_name: 'send_sms_reminder', payload: { customer_id: 'cust_001', message: 'Fitting scheduled for 10am tomorrow.' }, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any),
      /Twilio is not configured for SMS reminders/
    );
    assert.equal(mockDb.messages.filter((message: any) => message.channel === 'sms').length, 0, 'Provider failure must not fabricate sent SMS history.');
  } finally {
    if (priorSid === undefined) delete process.env.TWILIO_ACCOUNT_SID; else process.env.TWILIO_ACCOUNT_SID = priorSid;
    if (priorToken === undefined) delete process.env.TWILIO_AUTH_TOKEN; else process.env.TWILIO_AUTH_TOKEN = priorToken;
    if (priorFrom === undefined) delete process.env.TWILIO_PHONE_NUMBER; else process.env.TWILIO_PHONE_NUMBER = priorFrom;
  }
});

test('ADV-REG-02: Malformed payloads, null inputs, and missing keys in job registry handlers', async () => {
  const mockDb = createAdversarialMockDb();

  const res1 = await dispatchJob({ id: 'adv-null-1', queue_name: 'sync_shopify_catalog', payload: null as any, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  assert.equal(res1.success, true, 'sync_shopify_catalog must fall back gracefully on null payload');

  const res2 = await dispatchJob({ id: 'adv-null-2', queue_name: 'publish_meta_campaign', payload: 'corrupted-string' as any, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  assert.equal(res2.success, true, 'publish_meta_campaign must handle non-object payload gracefully');

  await assert.rejects(async () => {
    await dispatchJob({ id: 'adv-null-3', queue_name: 'pause_campaign', payload: {}, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  }, /campaign_id is required in job payload/);

  await assert.rejects(async () => {
    await dispatchJob({ id: 'adv-null-4', queue_name: 'send_sms_reminder', payload: { customer_id: 'non_existent_cust_999' }, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  }, /missing business_id/);

  const res5 = await dispatchJob({ id: 'adv-null-5', queue_name: 'generate_outreach', payload: { content: null, brand: null }, status: 'pending', attempts: 0, max_attempts: 5 }, mockDb as any);
  assert.equal(res5.success, true);
  assert.ok(res5.draft);
});

test('ADV-RUN-05: Unexpected exceptions in handlers are caught cleanly and do not crash the runner', async () => {
  const mockDb = createAdversarialMockDb();

  JOB_REGISTRY['exploding_handler'] = async () => {
    throw new TypeError('Fatal memory dereference in simulated native addon');
  };

  JOB_REGISTRY['string_throw_handler'] = async () => {
    throw 'A raw string exception occurred';
  };

  try {
    const job1: DurableJob = { id: 'adv-explode-1', queue_name: 'exploding_handler', payload: {}, status: 'running', attempts: 1, max_attempts: 3 };
    mockDb.jobs.push(job1);

    const res1 = await processDurableJob(job1, mockDb as any);
    assert.equal(res1.success, false);
    assert.match(res1.error!, /Fatal memory dereference/);

    const uJob1 = mockDb.jobs.find((j: any) => j.id === job1.id);
    assert.equal(uJob1.status, 'pending');
    assert.equal(uJob1.error_details.name, 'TypeError');

    const job2: DurableJob = { id: 'adv-explode-2', queue_name: 'string_throw_handler', payload: {}, status: 'running', attempts: 3, max_attempts: 3 };
    mockDb.jobs.push(job2);

    const res2 = await processDurableJob(job2, mockDb as any);
    assert.equal(res2.success, false);

    const uJob2 = mockDb.jobs.find((j: any) => j.id === job2.id);
    assert.equal(uJob2.status, 'dead-letter');
  } finally {
    delete JOB_REGISTRY['exploding_handler'];
    delete JOB_REGISTRY['string_throw_handler'];
  }
});
