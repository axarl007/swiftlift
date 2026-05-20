// csv-parser.js — Swiftlift meal library CSV importer
// Pure function: no localStorage, no DOM, no React side effects.
// Works in both browser (window global) and Node.js (module.exports) for Jest.

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.parseMealCsv = factory().parseMealCsv;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const VALID_TYPES  = ['breakfast', 'lunch', 'dinner', 'snack'];
  const REQUIRED     = ['name', 'type', 'protein_g'];
  const OPTIONAL_NUM = ['calories', 'carbs_g', 'fat_g', 'serving_size_g'];

  // ── Minimal CSV tokeniser ─────────────────────────────────────────────────
  // Handles quoted fields (commas + newlines inside quotes), CRLF + LF.
  function tokeniseRow(line) {
    const fields = [];
    let cur = '';
    let inQ  = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') {
          // peek: doubled-quote escape?
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') { inQ = true; }
        else if (ch === ',') { fields.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
    }
    fields.push(cur.trim());
    return fields;
  }

  // Split raw CSV text into rows (handles CRLF + LF, skips fully-blank lines)
  function splitRows(csv) {
    return csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      .split('\n')
      .filter(r => r.trim() !== '');
  }

  // Normalise a column name for matching: lowercase, strip spaces
  function normalise(s) { return (s || '').toLowerCase().replace(/\s+/g, '_').trim(); }

  // Generate a short random id suffix
  function randId() {
    return Math.random().toString(36).slice(2, 9);
  }

  // ── Core parser ───────────────────────────────────────────────────────────
  /**
   * parseMealCsv(csvString, existingMeals) → ParseResult
   *
   * @param {string}   csvString     - raw CSV text from file read
   * @param {object[]} existingMeals - current library (for duplicate detection)
   * @returns {{ imported: object[], errors: string[], duplicates: object[] }}
   */
  function parseMealCsv(csvString, existingMeals) {
    const imported   = [];
    const errors     = [];
    const duplicates = [];

    if (!csvString || !csvString.trim()) {
      return { imported, errors: ['Empty file'], duplicates };
    }

    const rows = splitRows(csvString);
    if (rows.length < 1) {
      return { imported, errors: ['Empty file'], duplicates };
    }

    // Parse header row
    const headerRow  = tokeniseRow(rows[0]);
    const headerMap  = {}; // normalisedName → columnIndex
    headerRow.forEach((h, i) => { headerMap[normalise(h)] = i; });

    // Validate all required columns present in header
    const missingHeaders = REQUIRED.filter(r => headerMap[r] === undefined);
    if (missingHeaders.length > 0) {
      return {
        imported,
        errors: [`Header row missing required columns: ${missingHeaders.join(', ')}`],
        duplicates,
      };
    }

    // Header-only file is valid (0 data rows)
    if (rows.length === 1) {
      return { imported, errors, duplicates };
    }

    // Build lookup of existing meal names (lowercase) for duplicate detection
    const existingByName = new Map(
      (existingMeals || []).map(m => [m.name.toLowerCase(), m])
    );

    // Track names seen within this CSV to catch intra-file duplicates
    const seenInFile = new Map();

    const todayIso = new Date().toISOString().slice(0, 10);

    function getField(row, name) {
      const idx = headerMap[name];
      return idx !== undefined ? (row[idx] || '').trim() : '';
    }

    // Parse data rows
    for (let ri = 1; ri < rows.length; ri++) {
      const rowNum = ri + 1; // 1-indexed, accounting for header
      const row    = tokeniseRow(rows[ri]);
      const rowErrors = [];

      // --- Required fields ---
      const name      = getField(row, 'name');
      const typeRaw   = getField(row, 'type');
      const proteinRaw = getField(row, 'protein_g');

      if (!name) rowErrors.push('missing name');
      if (!typeRaw) rowErrors.push('missing type');
      if (!proteinRaw) rowErrors.push('missing protein_g');

      if (rowErrors.length > 0) {
        errors.push(`Row ${rowNum}: ${rowErrors.join('; ')}`);
        continue;
      }

      // --- Type validation ---
      const type = typeRaw.toLowerCase();
      if (!VALID_TYPES.includes(type)) {
        errors.push(`Row ${rowNum}: unrecognised type "${typeRaw}" — must be one of ${VALID_TYPES.join(', ')}`);
        continue;
      }

      // --- Protein validation ---
      const protein_g = parseFloat(proteinRaw);
      if (isNaN(protein_g) || protein_g < 0) {
        errors.push(`Row ${rowNum}: protein_g "${proteinRaw}" is not a valid number`);
        continue;
      }

      // --- Optional numeric fields ---
      const optNums = {};
      let optNumError = false;
      for (const field of OPTIONAL_NUM) {
        const raw = getField(row, field);
        if (raw === '') {
          optNums[field] = null;
        } else {
          const val = parseFloat(raw);
          if (isNaN(val) || val < 0) {
            errors.push(`Row ${rowNum}: ${field} "${raw}" is not a valid number`);
            optNumError = true;
            break;
          }
          optNums[field] = val;
        }
      }
      if (optNumError) continue;

      // --- Optional string fields ---
      const tagsRaw  = getField(row, 'tags');
      const tags     = tagsRaw
        ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
        : [];
      const emojiRaw = getField(row, 'emoji');
      const emoji    = emojiRaw || null;

      // --- Build meal object ---
      const meal = {
        id:             'm_' + randId(),
        name,
        type,
        protein_g,
        calories:       optNums['calories'],
        carbs_g:        optNums['carbs_g'],
        fat_g:          optNums['fat_g'],
        serving_size_g: optNums['serving_size_g'],
        tags,
        emoji,
        source:         'imported',
        createdAt:      todayIso,
      };

      // --- Duplicate detection: intra-file ---
      const nameLower = name.toLowerCase();
      if (seenInFile.has(nameLower)) {
        duplicates.push({ incoming: meal, existing: seenInFile.get(nameLower) });
        continue;
      }
      seenInFile.set(nameLower, meal);

      // --- Duplicate detection: vs existing library ---
      if (existingByName.has(nameLower)) {
        duplicates.push({ incoming: meal, existing: existingByName.get(nameLower) });
        continue;
      }

      imported.push(meal);
    }

    return { imported, errors, duplicates };
  }

  return { parseMealCsv };
}));
