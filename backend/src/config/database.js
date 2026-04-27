/**
 * SQLite database wrapper that provides pg-compatible query() API
 * so all existing controllers work without modification.
 */
const Database = require('better-sqlite3');
const path = require('path');
const { initializeDatabase } = require('./initSqliteDb');

// Use file-based DB for persistence during dev
const dbPath = path.join(__dirname, '../../data/community_aid.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Initialize schema and seed data
initializeDatabase(sqlite);

console.log('📦 Connected to SQLite database');

/**
 * Convert PostgreSQL $1, $2 style params to SQLite ? style
 */
function convertQuery(text, params) {
  if (!text || !params || params.length === 0) {
    return { sql: text, values: params || [] };
  }

  // Replace $N placeholders with ?
  let idx = 0;
  const paramMap = {};
  const values = [];

  // Build a mapping from $N to position
  const sql = text.replace(/\$(\d+)/g, (match, num) => {
    const paramIndex = parseInt(num) - 1;
    if (!paramMap[num]) {
      paramMap[num] = true;
    }
    values.push(params[paramIndex]);
    return '?';
  });

  return { sql, values };
}

/**
 * Adapt PostgreSQL-specific SQL to SQLite
 */
function adaptSql(sql) {
  let adapted = sql;

  // Replace ILIKE with LIKE (SQLite LIKE is case-insensitive for ASCII)
  adapted = adapted.replace(/\bILIKE\b/gi, 'LIKE');

  // Replace NOW() with datetime('now')
  adapted = adapted.replace(/\bNOW\(\)/gi, "datetime('now')");

  // Replace INTERVAL expressions: NOW() - INTERVAL '30 days' -> datetime('now', '-30 days')
  adapted = adapted.replace(
    /datetime\('now'\)\s*-\s*INTERVAL\s*'(\d+)\s*(day|days|hour|hours|minute|minutes)'/gi,
    (match, num, unit) => {
      const u = unit.toLowerCase().replace(/s$/, '');
      if (u === 'day') return `datetime('now', '-${num} days')`;
      if (u === 'hour') return `datetime('now', '-${num} hours')`;
      if (u === 'minute') return `datetime('now', '-${num} minutes')`;
      return match;
    }
  );

  // Replace remaining standalone INTERVAL patterns
  adapted = adapted.replace(
    />=\s*datetime\('now'\)\s*-\s*INTERVAL\s*'(\d+)\s*(day|days)'/gi,
    (match, num) => `>= datetime('now', '-${num} days')`
  );

  // Replace EXTRACT(EPOCH FROM (x - y)) / 3600 with
  // (julianday(x) - julianday(y)) * 24
  adapted = adapted.replace(
    /EXTRACT\s*\(\s*EPOCH\s+FROM\s*\(([^)]+)\s*-\s*([^)]+)\)\s*\)\s*\/\s*3600/gi,
    (match, a, b) => `(julianday(${a.trim()}) - julianday(${b.trim()})) * 24`
  );

  // Replace PostgreSQL array syntax: $X = ANY(column) -> column LIKE '%' || ? || '%'
  // This is tricky, handle it in individual controllers instead

  // Replace COALESCE with SQLite-compatible COALESCE (already works)
  // Replace RETURNING * -> handled in query wrapper

  // Replace boolean true/false with 1/0
  adapted = adapted.replace(/\b= true\b/gi, '= 1');
  adapted = adapted.replace(/\b= false\b/gi, '= 0');

  // Replace json_agg / json_build_object -> handled specially
  // Replace FILTER (WHERE ...) -> not supported in SQLite, handle in code

  // Replace ON CONFLICT DO NOTHING with OR IGNORE
  adapted = adapted.replace(/ON CONFLICT DO NOTHING/gi, 'ON CONFLICT DO NOTHING');

  // Replace TEXT[] -> TEXT (arrays stored as JSON strings)

  return adapted;
}

/**
 * pg-compatible query function
 * Returns { rows: [...] } like pg
 */
function query(text, params) {
  try {
    let { sql, values } = convertQuery(text, params);
    sql = adaptSql(sql);

    // Sanitize values: convert undefined to null, booleans to 0/1
    values = values.map(v => {
      if (v === undefined) return null;
      if (v === true) return 1;
      if (v === false) return 0;
      if (v instanceof Date) return v.toISOString();
      if (typeof v === 'object' && v !== null) return JSON.stringify(v);
      return v;
    });

    const trimmed = sql.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('WITH');
    const hasReturning = /\bRETURNING\b/i.test(sql);

    if (isSelect) {
      const rows = sqlite.prepare(sql).all(...values);
      // Parse JSON columns
      return { rows: rows.map(parseJsonColumns) };
    }

    if (hasReturning) {
      // SQLite doesn't support RETURNING, simulate it
      const baseSql = sql.replace(/\s+RETURNING\s+.*/i, '');
      const info = sqlite.prepare(baseSql).run(...values);

      // Try to get the affected row back
      const returningMatch = sql.match(/\bRETURNING\s+(.*)/i);
      if (returningMatch) {
        // Determine table name
        const tableName = extractTableName(sql);
        if (tableName) {
          // For INSERT, find by rowid; for UPDATE/DELETE, re-run a select
          let row;
          if (trimmed.startsWith('INSERT')) {
            // Find the ID from values (first param is usually the id)
            const idParam = values[0];
            row = sqlite.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(idParam);
          } else if (trimmed.startsWith('UPDATE')) {
            // Extract WHERE clause
            const whereMatch = baseSql.match(/WHERE\s+(.+?)(?:\s*$)/i);
            if (whereMatch) {
              const whereClause = whereMatch[1];
              // Get the id value (usually first param for UPDATE ... WHERE id = ?)
              const idMatch = baseSql.match(/WHERE\s+(?:\w+\.)?id\s*=\s*\?/i);
              if (idMatch) {
                row = sqlite.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(values[0]);
              } else {
                // Try last query value as id
                row = sqlite.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`).get(info.lastInsertRowid || 0);
              }
            }
          }
          if (row) {
            return { rows: [parseJsonColumns(row)], rowCount: 1 };
          }
        }
      }
      return { rows: [], rowCount: info.changes };
    }

    // Regular INSERT/UPDATE/DELETE without RETURNING
    const info = sqlite.prepare(sql).run(...values);
    return { rows: [], rowCount: info.changes };
  } catch (err) {
    // Handle complex queries that may need special treatment
    console.error('SQLite query error:', err.message);
    console.error('Query:', text);
    console.error('Params:', params);
    throw err;
  }
}

/**
 * Extract table name from SQL
 */
function extractTableName(sql) {
  let match;
  match = sql.match(/\bINTO\s+(\w+)/i);
  if (match) return match[1];
  match = sql.match(/\bUPDATE\s+(\w+)/i);
  if (match) return match[1];
  match = sql.match(/\bFROM\s+(\w+)/i);
  if (match) return match[1];
  return null;
}

/**
 * Parse JSON string columns back to objects
 */
function parseJsonColumns(row) {
  if (!row) return row;
  const result = { ...row };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      // Try to parse JSON arrays/objects
      if ((result[key].startsWith('[') && result[key].endsWith(']')) ||
          (result[key].startsWith('{') && result[key].endsWith('}'))) {
        try {
          result[key] = JSON.parse(result[key]);
        } catch {
          // Not JSON, keep as string
        }
      }
    }
    // Convert integer booleans back for 'read', 'accepted', 'time_sensitive'
    if (['read', 'accepted', 'time_sensitive'].includes(key)) {
      result[key] = Boolean(result[key]);
    }
  }
  return result;
}

/**
 * Get a raw sqlite connection (for transactions)
 */
function getClient() {
  return {
    query: query,
    release: () => {},
  };
}

module.exports = {
  query,
  getClient,
  pool: { query },
  sqlite, // expose raw sqlite for advanced queries
};
