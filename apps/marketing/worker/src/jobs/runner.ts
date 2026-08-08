import { supabase } from '../index';

const POLL_INTERVAL_MS = 5000;

export async function runJobPoller() {
  console.log('Job poller started, checking for pending jobs...');

  setInterval(async () => {
    try {
      // 1. Fetch the next pending job and lock it
      const { data: jobs, error } = await supabase
        .from('durable_jobs')
        .select('*')
        .eq('status', 'pending')
        .lte('next_retry_at', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;
      if (!jobs || jobs.length === 0) return; // No jobs to process

      const job = jobs[0];

      // Lock the job
      const { error: lockError } = await supabase
        .from('durable_jobs')
        .update({
          status: 'running',
          locked_at: new Date().toISOString(),
          locked_by: `worker-${process.pid}`,
          attempts: job.attempts + 1
        })
        .eq('id', job.id)
        .eq('status', 'pending');

      if (lockError) {
        console.log(`Failed to lock job ${job.id}, another worker might have picked it up.`);
        return;
      }

      console.log(`Processing job ${job.id}: ${job.queue_name}`);

      try {
        await processJob(job);
        
        // Mark as completed
        await supabase
          .from('durable_jobs')
          .update({ status: 'completed' })
          .eq('id', job.id);
          
        console.log(`Successfully completed job ${job.id}`);
      } catch (jobError: any) {
        console.error(`Error processing job ${job.id}:`, jobError);
        
        const nextAttempts = job.attempts + 1;
        if (nextAttempts >= job.max_attempts) {
          // Dead letter
          await supabase
            .from('durable_jobs')
            .update({
              status: 'dead-letter',
              error_message: jobError.message,
              locked_at: null,
              locked_by: null
            })
            .eq('id', job.id);
        } else {
          // Exponential backoff
          const delaySeconds = Math.pow(2, nextAttempts) * 10;
          const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
          
          await supabase
            .from('durable_jobs')
            .update({
              status: 'pending',
              error_message: jobError.message,
              next_retry_at: nextRetryAt.toISOString(),
              locked_at: null,
              locked_by: null
            })
            .eq('id', job.id);
        }
      }
    } catch (err) {
      console.error('Job poller encountered an error:', err);
    }
  }, POLL_INTERVAL_MS);
}

async function processJob(job: any) {
  // Delegate to specific queues/providers based on job.queue_name
  switch (job.queue_name) {
    case 'sync_shopify_catalog':
      console.log('Syncing Shopify catalog...');
      // await ShopifyAdapter.syncCatalog(job.payload);
      break;
    case 'publish_meta_campaign':
      console.log('Publishing Meta Campaign...');
      break;
    case 'run_prospecting':
      console.log('Running AI Prospecting Cycle...');
      // await runProspectingCycle(job.payload.brand);
      break;
    case 'generate_outreach':
      console.log('Generating AI Outreach Draft...');
      // await generateOutreachDraft(job.payload.leadId, job.payload.content, job.payload.brand);
      break;
    case 'emergency_pause_all':
      console.log('Executing emergency pause for all campaigns...');
      break;
    default:
      throw new Error(`Unknown job queue: ${job.queue_name}`);
  }
}
