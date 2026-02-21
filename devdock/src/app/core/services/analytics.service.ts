import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export type AnalyticsEvent =
  | 'screenshot_taken'
  | 'prompt_optimized'
  | 'voice_transcribed'
  | 'agent_detected'
  | 'snapshot_saved'
  | 'snapshot_restored'
  | 'preview_opened'
  | 'action_executed'
  | 'upgrade_prompt_shown'
  | 'pro_subscription_started';

type EventProps = Record<string, string | number>;

interface AptabasePayload {
  readonly eventName: string;
  readonly props: EventProps;
}

// Aptabase app keys are prefixed with region: A-EU-*, A-US-*, A-SH-*, A-DEV-*
const REGION_MAP: Record<string, string> = {
  'EU': 'eu.aptabase.com',
  'US': 'us.aptabase.com',
  'SH': 'self.aptabase.com',
  'DEV': 'localhost:3000',
};

function resolveIngestHost(appKey: string): string | null {
  const parts = appKey.split('-');
  if (parts.length < 3) return null;
  const region = parts[1].toUpperCase();
  return REGION_MAP[region] ?? null;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly enabled =
    environment.production &&
    !!environment.aptabaseKey &&
    !environment.aptabaseKey.startsWith('__');
  private readonly ingestUrl: string | null = (() => {
    if (!this.enabled) return null;
    const host = resolveIngestHost(environment.aptabaseKey);
    return host ? `https://${host}/api/v0/event` : null;
  })();

  track(event: AnalyticsEvent, props?: EventProps): void {
    if (!this.enabled || !this.ingestUrl) return;

    const payload: AptabasePayload = {
      eventName: event,
      props: props ?? {},
    };

    this.http
      .post<void>(this.ingestUrl, payload, {
        headers: { 'App-Key': environment.aptabaseKey },
      })
      .subscribe({ error: () => { /* Analytics failures must never affect the UX */ } });
  }
}
