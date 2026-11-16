/** Framework-independent first-party tracking policy shared by CMS v1 and v2. */
export interface TrackingSnapshot {
  type: string;
  visitorId?: string;
  sessionId?: string;
  pageUrl?: string;
  webpageUuid?: string;
  scrollPct?: number;
  activeTime?: number;
  timeOnPage?: number;
}

/** Only pending cumulative snapshots may be merged; business actions remain distinct. */
export function enqueueTrackingSnapshot<T extends TrackingSnapshot>(queue: T[], event: T): void {
  if (event.type === 'session_heartbeat' || event.type === 'page_engagement') {
    const lastAction = queue.findLastIndex(previous => previous.type !== 'session_heartbeat' && previous.type !== 'page_engagement');
    const index = queue.findLastIndex((previous, index) => index > lastAction &&
      previous.type === event.type && previous.visitorId === event.visitorId &&
      previous.sessionId === event.sessionId && previous.pageUrl === event.pageUrl &&
      previous.webpageUuid === event.webpageUuid);
    if (index >= 0) {
      const previous = queue[index];
      const merged = { ...previous, ...event };
      for (const key of ['scrollPct', 'activeTime', 'timeOnPage'] as const) {
        const values = [previous[key], event[key]].filter((value): value is number =>
          typeof value === 'number' && Number.isFinite(value));
        if (values.length) merged[key] = Math.max(...values);
      }
      queue[index] = merged;
      return;
    }
  }
  queue.push(event);
}

interface VisibilityDocument {
  visibilityState: string;
  addEventListener(type: 'visibilitychange', callback: () => void): void;
  removeEventListener(type: 'visibilitychange', callback: () => void): void;
}

export interface ActiveTimeOptions {
  document: VisibilityDocument;
  emit(event: { type: 'session_heartbeat' | 'page_engagement'; activeTime: number; timeOnPage: number }): void;
  sessionActiveMs(delta: number): number;
  flush(): void;
  allowed(): boolean;
  now?: () => number;
  setInterval?: (callback: () => void, delay: number) => unknown;
  clearInterval?: (timer: unknown) => void;
}

/** Hidden time is excluded; unchanged snapshots and revoked consent produce no events. */
export function startActiveTimeTracking(options: ActiveTimeOptions): () => void {
  const now = options.now ?? (() => performance.now());
  const schedule = options.setInterval ?? ((callback, delay) => globalThis.setInterval(callback, delay));
  const cancel = options.clearInterval ?? (timer => globalThis.clearInterval(timer as ReturnType<typeof setInterval>));
  let lastTick = now(), activeMs = 0, lastAccountedMs = 0, lastSentSeconds = 0;
  let visible = options.document.visibilityState === 'visible', stopped = false;
  const tick = () => {
    const current = now();
    if (visible && options.allowed()) activeMs += Math.max(0, current - lastTick);
    lastTick = current;
  };
  const report = (type: 'session_heartbeat' | 'page_engagement') => {
    if (!options.allowed()) return false;
    const seconds = Math.floor(activeMs / 1000);
    if (seconds <= lastSentSeconds) return false;
    const sessionMs = options.sessionActiveMs(Math.max(0, Math.round(activeMs - lastAccountedMs)));
    lastAccountedMs = activeMs;
    lastSentSeconds = seconds;
    options.emit({ type, activeTime: Math.floor(sessionMs / 1000), timeOnPage: seconds });
    return true;
  };
  const timer = schedule(() => {
    tick();
    if (visible) report('session_heartbeat');
  }, 30000);
  const visibility = () => {
    tick();
    visible = options.document.visibilityState === 'visible';
    if (!visible && report('page_engagement')) options.flush();
  };
  options.document.addEventListener('visibilitychange', visibility);
  return () => {
    if (stopped) return;
    stopped = true;
    tick(); cancel(timer); options.document.removeEventListener('visibilitychange', visibility);
    if (report('page_engagement')) options.flush();
  };
}
