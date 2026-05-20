// tests/csv-parser.test.js
const { parseMealCsv } = require('../csv-parser');

// ── Fixtures ──────────────────────────────────────────────────────────────

const VALID_HEADER = 'name,type,protein_g,calories,carbs_g,fat_g,serving_size_g,tags,emoji';

const VALID_ROW_1 = 'Oats + Banana,breakfast,12,320,58,4,300,quick,🥣';
const VALID_ROW_2 = 'Dal + Rice,lunch,22,480,68,4,350,"vegetarian,bulk",🍛';
const VALID_ROW_3 = 'Chicken + Veg,dinner,38,420,20,8,400,,🍗';
const VALID_ROW_4 = 'Greek Yoghurt,snack,17,150,8,0,200,quick,🥛';
const VALID_ROW_5 = 'Scrambled Eggs,breakfast,18,200,2,12,150,,';

function makeCSV(...rows) {
  return [VALID_HEADER, ...rows].join('\n');
}

// ── Happy path ────────────────────────────────────────────────────────────

describe('Happy path', () => {
  test('5-row valid CSV → 5 imported meals, 0 errors, 0 duplicates', () => {
    const csv = makeCSV(VALID_ROW_1, VALID_ROW_2, VALID_ROW_3, VALID_ROW_4, VALID_ROW_5);
    const { imported, errors, duplicates } = parseMealCsv(csv, []);
    expect(imported).toHaveLength(5);
    expect(errors).toHaveLength(0);
    expect(duplicates).toHaveLength(0);
  });

  test('Blank optional columns → null for those fields', () => {
    const row = 'Plain Chicken,dinner,35,,,,,, ';
    const { imported, errors } = parseMealCsv(makeCSV(row), []);
    expect(errors).toHaveLength(0);
    expect(imported).toHaveLength(1);
    const meal = imported[0];
    expect(meal.calories).toBeNull();
    expect(meal.carbs_g).toBeNull();
    expect(meal.fat_g).toBeNull();
    expect(meal.serving_size_g).toBeNull();
    expect(meal.emoji).toBeNull();
    expect(meal.tags).toEqual([]);
  });

  test('Column order independence — shuffled headers parse correctly', () => {
    const shuffledHeader = 'protein_g,emoji,type,name,calories';
    const row = '22,🍛,lunch,Dal + Rice,480';
    const { imported, errors } = parseMealCsv([shuffledHeader, row].join('\n'), []);
    expect(errors).toHaveLength(0);
    expect(imported).toHaveLength(1);
    expect(imported[0].name).toBe('Dal + Rice');
    expect(imported[0].protein_g).toBe(22);
    expect(imported[0].type).toBe('lunch');
    expect(imported[0].calories).toBe(480);
    expect(imported[0].emoji).toBe('🍛');
  });

  test('Type values are case-insensitive (Breakfast → breakfast)', () => {
    const row = 'Oats,Breakfast,12,320,,,,, ';
    const { imported, errors } = parseMealCsv(makeCSV(row), []);
    expect(errors).toHaveLength(0);
    expect(imported[0].type).toBe('breakfast');
  });

  test('Type LUNCH → lunch', () => {
    const row = 'Rice Bowl,LUNCH,20,400,,,,, ';
    const { imported } = parseMealCsv(makeCSV(row), []);
    expect(imported[0].type).toBe('lunch');
  });

  test('Each imported meal has id, source, createdAt', () => {
    const { imported } = parseMealCsv(makeCSV(VALID_ROW_1), []);
    const m = imported[0];
    expect(m.id).toMatch(/^m_/);
    expect(m.source).toBe('imported');
    expect(m.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('Tags cell "quick,vegetarian" → parsed as array', () => {
    const row = 'Dal + Rice,lunch,22,480,68,4,350,"quick,vegetarian",🍛';
    const { imported } = parseMealCsv(makeCSV(row), []);
    expect(imported[0].tags).toEqual(['quick', 'vegetarian']);
  });

  test('Multi-codepoint emoji preserved', () => {
    const row = 'Curry,dinner,30,500,,,,,🍛';
    const { imported } = parseMealCsv(makeCSV(row), []);
    expect(imported[0].emoji).toBe('🍛');
  });
});

// ── Required field validation ─────────────────────────────────────────────

describe('Required field validation', () => {
  test('Missing name → row in errors, not in imported', () => {
    const row = ',breakfast,12,320,,,,,';
    const { imported, errors } = parseMealCsv(makeCSV(row), []);
    expect(imported).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/missing name/i);
  });

  test('Missing type → row in errors', () => {
    const row = 'Oats,,12,320,,,,,';
    const { imported, errors } = parseMealCsv(makeCSV(row), []);
    expect(imported).toHaveLength(0);
    expect(errors[0]).toMatch(/missing type/i);
  });

  test('Missing protein_g → row in errors', () => {
    const row = 'Oats,breakfast,,320,,,,,';
    const { imported, errors } = parseMealCsv(makeCSV(row), []);
    expect(imported).toHaveLength(0);
    expect(errors[0]).toMatch(/missing protein_g/i);
  });

  test('Unrecognised type → row in errors', () => {
    const row = 'Brunch Bowl,brunch,18,350,,,,,';
    const { imported, errors } = parseMealCsv(makeCSV(row), []);
    expect(imported).toHaveLength(0);
    expect(errors[0]).toMatch(/unrecognised type/i);
  });

  test('Non-numeric protein_g → row in errors', () => {
    const row = 'Protein Shake,snack,lots,200,,,,,';
    const { imported, errors } = parseMealCsv(makeCSV(row), []);
    expect(imported).toHaveLength(0);
    expect(errors[0]).toMatch(/protein_g/i);
  });

  test('Missing header columns returns header error immediately', () => {
    const csv = 'name,type\nOats,breakfast';
    const { errors } = parseMealCsv(csv, []);
    expect(errors[0]).toMatch(/missing required columns/i);
  });
});

// ── Partial failure ───────────────────────────────────────────────────────

describe('Partial failure', () => {
  test('3 valid + 1 invalid → 3 imported, 1 error, parsing continues', () => {
    const csv = makeCSV(
      VALID_ROW_1,
      VALID_ROW_2,
      'BadRow,brunch,,,,,,',  // invalid type + missing protein_g
      VALID_ROW_3
    );
    const { imported, errors } = parseMealCsv(csv, []);
    expect(imported).toHaveLength(3);
    expect(errors).toHaveLength(1);
  });

  test('Multiple invalid rows each produce their own error entry', () => {
    const csv = makeCSV(
      ',breakfast,12,,,,,',   // missing name
      'Oats,brunch,12,,,,,',  // bad type
      VALID_ROW_1
    );
    const { imported, errors } = parseMealCsv(csv, []);
    expect(imported).toHaveLength(1);
    expect(errors).toHaveLength(2);
  });
});

// ── Duplicate detection ───────────────────────────────────────────────────

describe('Duplicate detection', () => {
  test('Incoming name matches existing library (case-insensitive) → in duplicates, not imported', () => {
    const existing = [{ id: 'm_old', name: 'Dal + Rice', type: 'lunch', protein_g: 20 }];
    const { imported, duplicates } = parseMealCsv(makeCSV(VALID_ROW_2), existing);
    expect(imported).toHaveLength(0);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].existing.name).toBe('Dal + Rice');
    expect(duplicates[0].incoming.name).toBe('Dal + Rice');
  });

  test('Case-insensitive match: "dal + rice" vs "Dal + Rice"', () => {
    const existing = [{ id: 'm_old', name: 'dal + rice', type: 'lunch', protein_g: 20 }];
    const { duplicates } = parseMealCsv(makeCSV(VALID_ROW_2), existing);
    expect(duplicates).toHaveLength(1);
  });

  test('Two rows in same CSV with same name → second in duplicates', () => {
    const csv = makeCSV(VALID_ROW_2, VALID_ROW_2); // same row twice
    const { imported, duplicates } = parseMealCsv(csv, []);
    expect(imported).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  test('Empty string → { imported: [], errors: ["Empty file"], duplicates: [] }', () => {
    const { imported, errors, duplicates } = parseMealCsv('', []);
    expect(imported).toHaveLength(0);
    expect(errors).toEqual(['Empty file']);
    expect(duplicates).toHaveLength(0);
  });

  test('Null input → empty file error', () => {
    const { errors } = parseMealCsv(null, []);
    expect(errors).toEqual(['Empty file']);
  });

  test('Header row only → { imported: [], errors: [], duplicates: [] }', () => {
    const { imported, errors, duplicates } = parseMealCsv(VALID_HEADER, []);
    expect(imported).toHaveLength(0);
    expect(errors).toHaveLength(0);
    expect(duplicates).toHaveLength(0);
  });

  test('CRLF line endings are handled correctly', () => {
    const csv = [VALID_HEADER, VALID_ROW_1].join('\r\n');
    const { imported, errors } = parseMealCsv(csv, []);
    expect(errors).toHaveLength(0);
    expect(imported).toHaveLength(1);
  });

  test('Blank lines between rows are ignored', () => {
    const csv = [VALID_HEADER, '', VALID_ROW_1, '', VALID_ROW_2].join('\n');
    const { imported } = parseMealCsv(csv, []);
    expect(imported).toHaveLength(2);
  });
});
