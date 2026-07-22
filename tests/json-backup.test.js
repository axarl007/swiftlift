// tests/json-backup.test.js
const { validateBackupJson, BACKUP_SCHEMA_VERSION, BACKUP_DOMAINS } = require('../json-backup');

function fullBackup(overrides) {
  return JSON.stringify({
    exportedAt: '2026-07-22T10:00:00.000Z',
    backupSchemaVersion: BACKUP_SCHEMA_VERSION,
    profile: { name: 'Axar', schemaVersion: 7 },
    sessions: [{ id: 's1', date: '2026-07-01', completed: true }],
    log: { '2026-07-01': { protein: [], water: [] } },
    weightLog: [{ id: 'wl1', date: '2026-07-01', kg: 75 }],
    hiit: { level: 'easy' },
    overload: {},
    settings: { timerSound: true },
    presets: { protein: [], water: [] },
    reminderDismissed: '2026-07-01',
    meals: [],
    mealPlan: null,
    mealLog: {},
    ...overrides,
  });
}

// ── Happy path ────────────────────────────────────────────────────────────

describe('Happy path', () => {
  test('valid full backup → valid, all 12 domains present', () => {
    const result = validateBackupJson(fullBackup());
    expect(result.valid).toBe(true);
    expect(result.backupSchemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(result.exportedAt).toBe('2026-07-22T10:00:00.000Z');
    expect(Object.keys(result.domains).sort()).toEqual(
      BACKUP_DOMAINS.map(d => d.key).sort()
    );
  });

  test('valid legacy backup (no backupSchemaVersion, only old domains) → valid, version 0', () => {
    const legacy = JSON.stringify({
      exportedAt: '2026-01-01T00:00:00.000Z',
      profile: { name: 'Axar' },
      sessions: [],
      log: {},
      weightLog: [],
    });
    const result = validateBackupJson(legacy);
    expect(result.valid).toBe(true);
    expect(result.backupSchemaVersion).toBe(0);
    expect(Object.keys(result.domains).sort()).toEqual(['log', 'profile', 'sessions', 'weightLog']);
  });

  test('missing domain (e.g. no meals) is tolerated, not an error', () => {
    const backup = JSON.parse(fullBackup());
    delete backup.meals;
    delete backup.mealPlan;
    delete backup.mealLog;
    const result = validateBackupJson(JSON.stringify(backup));
    expect(result.valid).toBe(true);
    expect(result.domains.meals).toBeUndefined();
    expect(result.domains.mealPlan).toBeUndefined();
    expect(result.domains.mealLog).toBeUndefined();
    expect(result.domains.profile).toBeDefined();
  });

  test('nullable fields accept null (mealPlan, reminderDismissed)', () => {
    const result = validateBackupJson(fullBackup({ mealPlan: null, reminderDismissed: null }));
    expect(result.valid).toBe(true);
    expect(result.domains.mealPlan).toBeNull();
    expect(result.domains.reminderDismissed).toBeNull();
  });

  test('missing exportedAt → exportedAt is null, still valid', () => {
    const backup = JSON.parse(fullBackup());
    delete backup.exportedAt;
    const result = validateBackupJson(JSON.stringify(backup));
    expect(result.valid).toBe(true);
    expect(result.exportedAt).toBeNull();
  });
});

// ── Malformed input ───────────────────────────────────────────────────────

describe('Malformed input — all-or-nothing rejection', () => {
  test('not valid JSON → invalid', () => {
    const result = validateBackupJson('{not json');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not valid JSON/i);
  });

  test('valid JSON but not an object (array) → invalid', () => {
    const result = validateBackupJson('[1,2,3]');
    expect(result.valid).toBe(false);
  });

  test('valid JSON but not an object (string) → invalid', () => {
    const result = validateBackupJson('"hello"');
    expect(result.valid).toBe(false);
  });

  test('valid JSON object with no recognized domain keys → invalid ("not a backup")', () => {
    const result = validateBackupJson(JSON.stringify({ foo: 'bar', hello: 123 }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/does not look like/i);
  });

  test('wrong type for a known array field (sessions as string) → whole import rejected', () => {
    const result = validateBackupJson(fullBackup({ sessions: 'oops' }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/sessions/);
  });

  test('wrong type for a known object field (profile as array) → whole import rejected', () => {
    const result = validateBackupJson(fullBackup({ profile: [] }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/profile/);
  });

  test('wrong type for nullable-object field (mealPlan as string) → whole import rejected', () => {
    const result = validateBackupJson(fullBackup({ mealPlan: 'not-an-object' }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/mealPlan/);
  });

  test('wrong type for nullable-string field (reminderDismissed as number) → whole import rejected', () => {
    const result = validateBackupJson(fullBackup({ reminderDismissed: 42 }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/reminderDismissed/);
  });

  test('non-numeric backupSchemaVersion → invalid', () => {
    const result = validateBackupJson(fullBackup({ backupSchemaVersion: 'v1' }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/backupSchemaVersion/i);
  });
});

// ── Forward compatibility ─────────────────────────────────────────────────

describe('Future backupSchemaVersion', () => {
  test('backupSchemaVersion newer than supported → blocked with clear error', () => {
    const result = validateBackupJson(fullBackup({ backupSchemaVersion: BACKUP_SCHEMA_VERSION + 1 }));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/newer version/i);
  });

  test('backupSchemaVersion equal to supported → allowed', () => {
    const result = validateBackupJson(fullBackup({ backupSchemaVersion: BACKUP_SCHEMA_VERSION }));
    expect(result.valid).toBe(true);
  });
});
