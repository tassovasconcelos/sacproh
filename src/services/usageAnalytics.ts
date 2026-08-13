import { supabase } from '../lib/supabase';

type UsageEvent = 'SESSION_START' | 'AREA_VIEW' | 'RECORD_CREATED' | 'RECORD_UPDATED';

export const usageAnalytics = {
  async track(tenantId: string, userId: string, area: string, eventType: UsageEvent = 'AREA_VIEW', entityType?: string, entityId?: string) {
    const safeArea = area.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 60);
    if (!tenantId || !userId || !safeArea) return;
    try {
      await supabase.from('platform_usage_events').insert({
        tenant_id: tenantId, user_id: userId, area: safeArea, event_type: eventType,
        entity_type: entityType || null, entity_id: entityId || null
      });
    } catch { /* A telemetria nunca deve interromper o atendimento. */ }
  }
};
