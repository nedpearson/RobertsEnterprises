import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useBusinessId } from '@/hooks/useBusinessId';

export function useMissedCommunications() {
  const businessId = useBusinessId();

  return useQuery({
    queryKey: ['missed-communications', businessId],
    queryFn: async () => {
      if (!businessId) return 0;
      
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      // Fetch potential missed inbound messages older than 2 hours
      const { data: inbounds, error: inboundError } = await supabase
        .from('messages')
        .select('id, customer_id, created_at')
        .eq('business_id', businessId)
        .eq('direction', 'inbound')
        .eq('status', 'sent')
        .lt('created_at', twoHoursAgo);

      if (inboundError) throw inboundError;
      if (!inbounds || inbounds.length === 0) return 0;

      // Optimize: find the oldest inbound message to limit the outbound query
      const oldestInbound = inbounds.reduce(
        (min, msg) => (msg.created_at < min ? msg.created_at : min),
        inbounds[0].created_at
      );

      // Fetch outbound messages created after the oldest inbound message
      const { data: outbounds, error: outboundError } = await supabase
        .from('messages')
        .select('customer_id, created_at')
        .eq('business_id', businessId)
        .eq('direction', 'outbound')
        .gt('created_at', oldestInbound);

      if (outboundError) throw outboundError;

      // Group outbound message dates by customer_id
      const outboundMap = new Map<string, string[]>();
      for (const out of (outbounds || [])) {
        if (!out.customer_id) continue;
        const dates = outboundMap.get(out.customer_id) || [];
        dates.push(out.created_at);
        outboundMap.set(out.customer_id, dates);
      }

      let missedCount = 0;

      for (const inbound of inbounds) {
        if (!inbound.customer_id) continue;
        const customerOutbounds = outboundMap.get(inbound.customer_id) || [];
        
        // Check if there is any outbound message created AFTER this inbound message
        const hasReply = customerOutbounds.some(outDate => outDate > inbound.created_at);
        if (!hasReply) {
          missedCount++;
        }
      }

      return missedCount;
    },
    refetchInterval: 300_000,
    enabled: !!businessId,
  });
}
