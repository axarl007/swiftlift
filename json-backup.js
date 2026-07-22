// json-backup.js — Swiftlift full backup export/import: domain list + strict validator
// Pure function: no localStorage, no DOM, no React side effects.
// Works in both browser (window global) and Node.js (module.exports) for Jest.
//
// BACKUP_DOMAINS is the single source of truth for "what counts as all app
// data" — export (tabs.jsx), import (validateBackupJson below + store.js
// restoreBackup), and resetAllData (store.js) all read from this same list
// so the three can never drift out of sync with each other.

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.BACKUP_SCHEMA_VERSION = api.BACKUP_SCHEMA_VERSION;
    root.BACKUP_DOMAINS = api.BACKUP_DOMAINS;
    root.MAX_BACKUP_FILE_BYTES = api.MAX_BACKUP_FILE_BYTES;
    root.validateBackupJson = api.validateBackupJson;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const BACKUP_SCHEMA_VERSION = 1;
  const MAX_BACKUP_FILE_BYTES = 20 * 1024 * 1024; // 20 MB — realistic backups are KBs-to-low-MBs

  const BACKUP_DOMAINS = [
    { key: 'profile',           storageKey: 'swiftlift_profile',            type: 'object' },
    { key: 'sessions',          storageKey: 'swiftlift_sessions',           type: 'array' },
    { key: 'log',               storageKey: 'swiftlift_log',                type: 'object' },
    { key: 'weightLog',         storageKey: 'swiftlift_weight_log',         type: 'array' },
    { key: 'hiit',              storageKey: 'swiftlift_hiit',               type: 'object' },
    { key: 'overload',          storageKey: 'swiftlift_overload',           type: 'object' },
    { key: 'settings',          storageKey: 'swiftlift_settings',           type: 'object' },
    { key: 'presets',           storageKey: 'swiftlift_presets',            type: 'object' },
    { key: 'reminderDismissed', storageKey: 'swiftlift_reminder_dismissed', type: 'nullable-string' },
    { key: 'meals',             storageKey: 'swiftlift_meals',              type: 'array' },
    { key: 'mealPlan',          storageKey: 'swiftlift_meal_plan',          type: 'nullable-object' },
    { key: 'mealLog',           storageKey: 'swiftlift_meal_log',           type: 'object' },
  ];

  function matchesType(value, type) {
    switch (type) {
      case 'array':            return Array.isArray(value);
      case 'object':           return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'nullable-object':  return value === null || (typeof value === 'object' && !Array.isArray(value));
      case 'nullable-string':  return value === null || typeof value === 'string';
      default:                return false;
    }
  }

  /**
   * validateBackupJson(jsonString) → ValidationResult
   *
   * Strict, all-or-nothing: any *present* domain whose value has the wrong
   * shape fails the whole import — no partial writes. A domain that's simply
   * absent from the file (legacy backups predating a given domain, or a
   * future domain this version doesn't know about) is not an error, it's
   * treated as "nothing to restore for that domain".
   *
   * @param {string} jsonString - raw file contents
   * @returns {{valid:true, backupSchemaVersion:number, exportedAt:string|null, domains:object}
   *          |{valid:false, error:string}}
   */
  function validateBackupJson(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      return { valid: false, error: 'This file is not valid JSON.' };
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { valid: false, error: 'This does not look like a Swiftlift backup file.' };
    }

    // Legacy backups (from before backupSchemaVersion existed) are treated as version 0.
    let backupSchemaVersion = 0;
    if ('backupSchemaVersion' in parsed) {
      if (typeof parsed.backupSchemaVersion !== 'number') {
        return { valid: false, error: 'Invalid backupSchemaVersion field in this backup.' };
      }
      backupSchemaVersion = parsed.backupSchemaVersion;
    }
    if (backupSchemaVersion > BACKUP_SCHEMA_VERSION) {
      return {
        valid: false,
        error: 'This backup was made with a newer version of Swiftlift. Update the app before importing it.',
      };
    }

    const hasAnyDomain = BACKUP_DOMAINS.some(d => d.key in parsed);
    if (!hasAnyDomain) {
      return { valid: false, error: 'This does not look like a Swiftlift backup file.' };
    }

    const domains = {};
    for (const d of BACKUP_DOMAINS) {
      if (!(d.key in parsed)) continue; // missing domain — tolerated, not an error
      const value = parsed[d.key];
      if (!matchesType(value, d.type)) {
        return { valid: false, error: `Corrupted or invalid "${d.key}" data in this backup.` };
      }
      domains[d.key] = value;
    }

    return {
      valid: true,
      backupSchemaVersion,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
      domains,
    };
  }

  return { BACKUP_SCHEMA_VERSION, BACKUP_DOMAINS, MAX_BACKUP_FILE_BYTES, validateBackupJson };
}));
