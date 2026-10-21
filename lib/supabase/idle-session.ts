export const IDLE_WARNING_MS = 14 * 60 * 1000;
export const IDLE_LOGOUT_MS = 15 * 60 * 1000;
export const IDLE_STORAGE_PREFIX = "felix:idle-session:";

export type IdleRecord = { lastActivity: number; expired: boolean };
export type IdleView = { status: "active" | "warning" | "expired"; remainingSeconds: number };

type IdlePorts = {
  now: () => number;
  read: () => unknown;
  write: (record: IdleRecord) => void;
  onChange: (view: IdleView) => void;
  onExpire: () => void;
};

export function readIdleRecord(value: unknown, now: number): IdleRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<IdleRecord>;
  if (typeof record.lastActivity !== "number" || !Number.isFinite(record.lastActivity) ||
      record.lastActivity < 0 || record.lastActivity > now || typeof record.expired !== "boolean") return null;
  return { lastActivity: record.lastActivity, expired: record.expired };
}

// No browser dependencies: clock and shared storage are injected for deterministic tests.
export class IdleSession {
  private record: IdleRecord;
  private view: IdleView | undefined;
  private lastWrite = -Infinity;
  private dirty = false;
  private expired = false;

  constructor(private ports: IdlePorts) {
    this.record = readIdleRecord(ports.read(), ports.now()) ?? { lastActivity: ports.now(), expired: false };
    this.persist();
    this.check();
  }

  isExpired() { return this.expired; }

  private persist() {
    this.ports.write({ ...this.record });
    this.lastWrite = this.ports.now();
    this.dirty = false;
  }

  private merge(value: unknown) {
    const shared = readIdleRecord(value, this.ports.now());
    if (!shared) return;
    this.record.lastActivity = Math.max(this.record.lastActivity, shared.lastActivity);
    this.record.expired ||= shared.expired;
  }

  receive(value: unknown) {
    this.merge(value);
    this.check();
  }

  check() {
    if (this.expired) return;
    this.merge(this.ports.read());
    const elapsed = this.ports.now() - this.record.lastActivity;
    const status = this.record.expired || elapsed >= IDLE_LOGOUT_MS
      ? "expired" : elapsed >= IDLE_WARNING_MS ? "warning" : "active";
    const remainingSeconds = status === "warning" ? Math.ceil((IDLE_LOGOUT_MS - elapsed) / 1000) : 0;
    if (status === "expired") {
      this.expired = true;
      this.record.expired = true;
      this.persist();
    } else if (this.dirty && this.ports.now() - this.lastWrite >= 1000) {
      this.persist();
    }
    if (status !== this.view?.status || remainingSeconds !== this.view.remainingSeconds) {
      this.view = { status, remainingSeconds };
      this.ports.onChange(this.view);
    }
    if (this.expired) this.ports.onExpire();
  }

  activity() {
    // Check expiry before recording activity, including on wake after suspended timers.
    this.check();
    if (this.expired) return;
    const wasWarning = this.view?.status === "warning";
    this.record.lastActivity = this.ports.now();
    this.dirty = true;
    if (wasWarning || this.ports.now() - this.lastWrite >= 1000) this.persist();
    this.check();
  }
}

// Keep failed logout attempts locked, with one request and one retry at a time.
export class IdleSignOut {
  private pending = false;
  private disposed = false;
  private completed = false;
  private cancelRetry: (() => void) | undefined;

  constructor(private ports: {
    signOut: () => Promise<{ error: unknown }>;
    onSuccess: () => void;
    onError: (failed: boolean) => void;
    schedule: (retry: () => void, delay: number) => () => void;
  }) {}

  async run() {
    if (this.disposed || this.pending || this.completed) return;
    this.pending = true;
    this.cancelRetry?.();
    this.ports.onError(false);
    try {
      const { error } = await this.ports.signOut();
      if (error) throw error;
      this.completed = true;
      if (!this.disposed) this.ports.onSuccess();
    } catch {
      if (!this.disposed) {
        this.ports.onError(true);
        this.cancelRetry = this.ports.schedule(() => { void this.run(); }, 5000);
      }
    } finally {
      this.pending = false;
    }
  }

  dispose() {
    this.disposed = true;
    this.cancelRetry?.();
  }
}
