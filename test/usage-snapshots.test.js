const fs = require('fs');
const os = require('os');
const path = require('path');
const { initDB, closeDB, getDB, recordUsageSnapshot, getUsageSnapshots, pruneUsageSnapshots } = require('../lib/db');

const MIN = 60e3, DAY = 86400e3;
const T0 = Date.parse('2026-10-05T10:00:00Z');
const R = Date.parse('2026-10-10T23:00:00Z');

describe('usage_snapshots', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-')); initDB(path.join(dir, 't.db')); });
  afterEach(() => { closeDB(); fs.rmSync(dir, { recursive: true, force: true }); });

  it('writes only changes, plus a heartbeat every 30 minutes', () => {
    expect(recordUsageSnapshot(0, 'claude', 'weekly_all', T0, 10, R, T0)).toBe(true);
    expect(recordUsageSnapshot(0, 'claude', 'weekly_all', T0 + 10 * MIN, 10, R + 46, T0 + 10 * MIN)).toBe(false); // jitter = same window
    expect(recordUsageSnapshot(0, 'claude', 'weekly_all', T0 + 31 * MIN, 10, R, T0 + 31 * MIN)).toBe(true);
    expect(recordUsageSnapshot(0, 'claude', 'weekly_all', T0 + 35 * MIN, 11, R, T0 + 35 * MIN)).toBe(true);
    expect(recordUsageSnapshot(0, 'claude', 'weekly_all', T0 + 35 * MIN, 12, R, T0 + 35 * MIN)).toBe(false);      // not newer
    expect(getUsageSnapshots(0, 'claude', 'weekly_all', 0).map(s => s.percent)).toEqual([10, 10, 11]);
  });

  it('keeps users, providers and limits apart', () => {
    recordUsageSnapshot(1, 'claude', 'weekly_all', T0, 10, R, T0);
    recordUsageSnapshot(2, 'claude', 'weekly_all', T0, 20, R, T0);
    recordUsageSnapshot(1, 'codex', 'weekly_all', T0, 30, R, T0);
    expect(getUsageSnapshots(1, 'claude', 'weekly_all', 0)).toEqual([{ at: T0, percent: 10, resetsAt: R }]);
    expect(getUsageSnapshots(2, 'claude', 'weekly_all', 0)[0].percent).toBe(20);
    expect(getUsageSnapshots(1, 'codex', 'weekly_all', 0)[0].percent).toBe(30);
  });

  it('reads from a start time on', () => {
    recordUsageSnapshot(0, 'claude', 's', T0, 1, R, T0);
    recordUsageSnapshot(0, 'claude', 's', T0 + DAY, 2, R, T0 + DAY);
    expect(getUsageSnapshots(0, 'claude', 's', T0 + 1).map(s => s.percent)).toEqual([2]);
  });

  it('prunes rows older than 60 days when recording', () => {
    recordUsageSnapshot(0, 'claude', 'old', T0 - 61 * DAY, 5, R, T0 - 61 * DAY);
    pruneUsageSnapshots(0);                                     // nothing older than 0
    recordUsageSnapshot(0, 'claude', 'new', T0, 6, R, T0);      // server clock T0: over an hour after the last prune → prunes
    expect(getUsageSnapshots(0, 'claude', 'old', 0)).toEqual([]);
    expect(getUsageSnapshots(0, 'claude', 'new', 0)).toHaveLength(1);
  });

  it("a future timestamp (untrusted sync report) is refused and cannot prune other users' rows", () => {
    // Pruning used to be cut from the DATA time: a hosted agent sending
    // fetchedAt in the year 2100 deleted every other user's snapshots.
    recordUsageSnapshot(1, 'claude', 'weekly_all', T0, 10, R, T0);
    const future = Date.parse('2100-01-01T00:00:00Z');
    expect(recordUsageSnapshot(2, 'claude', 'weekly_all', future, 50, R, T0 + 2 * 3600e3)).toBe(false);
    expect(getUsageSnapshots(1, 'claude', 'weekly_all', 0)).toHaveLength(1);
    expect(getUsageSnapshots(2, 'claude', 'weekly_all', 0)).toEqual([]);
  });

  it('prunes by the server clock even when the incoming reading is itself old', () => {
    recordUsageSnapshot(0, 'claude', 'x', T0 - 61 * DAY, 5, R, T0 - 61 * DAY);
    recordUsageSnapshot(0, 'claude', 'late', T0 - 30 * DAY, 7, R, T0);   // a delayed report, received now
    expect(getUsageSnapshots(0, 'claude', 'x', 0)).toEqual([]);
    expect(getUsageSnapshots(0, 'claude', 'late', 0)).toHaveLength(1);
  });

  it('stores nothing but numbers and ids', () => {
    const cols = getDB().prepare('PRAGMA table_info(usage_snapshots)').all().map(c => c.name);
    expect(cols).toEqual(['user_id', 'provider', 'limit_id', 'at', 'percent', 'resets_at']);
  });
});
