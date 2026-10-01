const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const {
  ANTIGRAVITY_CONVERSATIONS_DIR,
  ANTIGRAVITY_SUMMARIES_DB,
  HOME
} = require('./config');

/**
 * Decode varint from Buffer at offset i
 */
function decodeVarint(data, i) {
  let val = 0;
  let shift = 0;
  while (i < data.length) {
    const b = data[i++];
    val |= (b & 0x7f) << shift;
    shift += 7;
    if (!(b & 0x80)) break;
  }
  return [val, i];
}

/**
 * Lightweight pure-JS protobuf decoder
 */
function decodeProtobuf(data) {
  if (!data || !Buffer.isBuffer(data)) return [];
  let i = 0;
  const fields = [];
  while (i < data.length) {
    try {
      const byte = data[i++];
      const fieldNum = byte >> 3;
      const wireType = byte & 0x07;
      if (wireType === 0) {
        const [val, nextI] = decodeVarint(data, i);
        i = nextI;
        fields.push([fieldNum, 'varint', val]);
      } else if (wireType === 2) {
        const [len, nextI] = decodeVarint(data, i);
        i = nextI;
        if (i + len > data.length) break;
        const val = data.subarray(i, i + len);
        i += len;
        fields.push([fieldNum, 'bytes', val]);
      } else if (wireType === 1) {
        if (i + 8 > data.length) break;
        fields.push([fieldNum, 'fixed64', data.subarray(i, i + 8)]);
        i += 8;
      } else if (wireType === 5) {
        if (i + 4 > data.length) break;
        fields.push([fieldNum, 'fixed32', data.subarray(i, i + 4)]);
        i += 4;
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  return fields;
}

/**
 * Extract clean project name from a workspace URI or path
 */
function extractAntigravityProjectName(uri) {
  if (!uri) return 'default';
  let clean = uri;
  try {
    if (clean.startsWith('[') && clean.endsWith(']')) {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0) clean = parsed[0];
    }
  } catch {
    // not json, leave as-is
  }

  if (clean.startsWith('file://')) {
    clean = decodeURIComponent(clean.slice(7));
  }

  if (clean.startsWith(HOME)) {
    clean = clean.slice(HOME.length).replace(/^[/\\]+/, '');
  }

  return clean || 'home';
}

/**
 * Load conversation -> project mapping from conversation_summaries.db
 */
function loadAntigravityWorkspaces(summariesDbPath = ANTIGRAVITY_SUMMARIES_DB) {
  const map = new Map();
  if (!fs.existsSync(summariesDbPath)) return map;

  let db;
  try {
    db = new Database(summariesDbPath, { readonly: true, fileMustExist: true });
    const rows = db.prepare('SELECT conversation_id, workspace_uris, last_modified_time FROM conversation_summaries').all();
    for (const r of rows) {
      map.set(r.conversation_id, {
        project: extractAntigravityProjectName(r.workspace_uris),
        lastModified: r.last_modified_time
      });
    }
  } catch (err) {
    // ignore read error
  } finally {
    if (db) try { db.close(); } catch {}
  }
  return map;
}

/**
 * Find all conversation .db files
 */
function findAntigravityConversationFiles(dir = ANTIGRAVITY_CONVERSATIONS_DIR) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name.endsWith('.db') && !e.name.endsWith('-shm') && !e.name.endsWith('-wal')) {
        files.push(path.join(dir, e.name));
      }
    }
  } catch {}
  return files;
}

/**
 * Parse an Antigravity conversation SQLite database
 */
function parseAntigravityConversationFile(filePath, fromIdx = -1, workspaceMap = null) {
  if (!fs.existsSync(filePath)) return { messages: [], maxIdx: fromIdx };

  const convId = path.basename(filePath, '.db');
  let project = 'default';
  let defaultTimestamp = new Date().toISOString();

  if (workspaceMap && workspaceMap.has(convId)) {
    const info = workspaceMap.get(convId);
    project = info.project;
    if (info.lastModified) defaultTimestamp = new Date(info.lastModified).toISOString();
  }

  let db;
  const messages = [];
  let maxIdx = fromIdx;

  try {
    db = new Database(filePath, { readonly: true, fileMustExist: true });

    // 1. Build step timestamps from steps table
    const stepTimestamps = new Map();
    try {
      const stepRows = db.prepare('SELECT idx, metadata FROM steps WHERE metadata IS NOT NULL').all();
      for (const row of stepRows) {
        if (!row.metadata) continue;
        const top = decodeProtobuf(row.metadata);
        for (const [fn, wt, val] of top) {
          if (wt === 'bytes' && val.length >= 8) {
            const sub = decodeProtobuf(val);
            for (const [k, t, v] of sub) {
              if (t === 'varint' && v > 1000000000 && v < 2500000000) {
                stepTimestamps.set(row.idx, new Date(v * 1000).toISOString());
                break;
              }
            }
          }
        }
      }
    } catch {
      // steps table read failure is non-fatal
    }

    // 2. Query gen_metadata for tokens and model
    const genRows = db.prepare('SELECT idx, data FROM gen_metadata WHERE idx > ? AND data IS NOT NULL ORDER BY idx ASC').all(fromIdx);

    for (const row of genRows) {
      const idx = row.idx;
      if (idx > maxIdx) maxIdx = idx;

      const data = row.data;
      if (!data) continue;

      // Extract model name
      const dataStr = data.toString('latin1');
      const mModel = dataStr.match(/(gemini-[a-zA-Z0-9.\-]+)/);
      const model = mModel ? mModel[1] : 'gemini-3.8-flash';

      // Extract last_step_index
      const mStep = dataStr.match(/last_step_index\x12[\x01-\x10]([0-9]+)/);
      const stepIdx = mStep ? parseInt(mStep[1], 10) : idx;

      const ts = stepTimestamps.get(stepIdx) || stepTimestamps.get(idx) || defaultTimestamp;

      // Extract tokens from protobuf fields
      const top = decodeProtobuf(data);
      let inputTokens = 0;
      let cacheRead = 0;
      let outputTokens = 0;

      for (const [fn, wt, val] of top) {
        if (fn === 1 && wt === 'bytes') {
          const sub = decodeProtobuf(val);
          for (const [sfn, swt, sval] of sub) {
            if (sfn === 4 && swt === 'bytes') {
              const f4 = decodeProtobuf(sval);
              for (const [k, t, v] of f4) {
                if (t === 'varint') {
                  if (k === 1) inputTokens = v;
                  else if (k === 2) cacheRead = v;
                  else if (k === 3) outputTokens = v;
                }
              }
            }
          }
        }
      }

      if (inputTokens > 0 || outputTokens > 0 || cacheRead > 0) {
        messages.push({
          id: `agy_${convId}_${idx}`,
          timestamp: ts,
          model,
          sessionId: convId,
          project,
          inputTokens,
          outputTokens,
          cacheReadTokens: cacheRead,
          cacheCreateTokens: 0,
          cacheCreate5m: 0,
          cacheCreate1h: 0,
          stopReason: 'end_turn',
          tools: [],
          toolCounts: {},
          isSubagent: false,
          linesAdded: 0,
          linesRemoved: 0,
          linesWritten: 0,
          provider: 'antigravity'
        });
      }
    }
  } catch (err) {
    // Database busy or read error
  } finally {
    if (db) try { db.close(); } catch {}
  }

  return { messages, maxIdx };
}

/**
 * Full parse of all Antigravity conversations
 */
function parseAllAntigravity(parseState = {}, conversationsDir = ANTIGRAVITY_CONVERSATIONS_DIR, summariesDb = ANTIGRAVITY_SUMMARIES_DB) {
  const files = findAntigravityConversationFiles(conversationsDir);
  const workspaceMap = loadAntigravityWorkspaces(summariesDb);
  const allMessages = [];
  const newState = { ...parseState };

  for (const filePath of files) {
    const prev = parseState[filePath];
    let stat;
    try { stat = fs.statSync(filePath); } catch { continue; }

    const fromIdx = (prev && prev.mtime === stat.mtimeMs.toString() && typeof prev.maxIdx === 'number')
      ? prev.maxIdx
      : -1;

    const { messages, maxIdx } = parseAntigravityConversationFile(filePath, fromIdx, workspaceMap);
    allMessages.push(...messages);
    newState[filePath] = {
      size: stat.size,
      mtime: stat.mtimeMs.toString(),
      maxIdx
    };
  }

  return { messages: allMessages, parseState: newState };
}

/**
 * Incremental parse of a single Antigravity conversation file
 */
function parseIncrementalAntigravity(filePath, parseState = {}, summariesDb = ANTIGRAVITY_SUMMARIES_DB) {
  const prev = parseState[filePath];
  let stat;
  try { stat = fs.statSync(filePath); } catch { return { messages: [] }; }

  const fromIdx = (prev && typeof prev.maxIdx === 'number') ? prev.maxIdx : -1;
  const workspaceMap = loadAntigravityWorkspaces(summariesDb);

  const { messages, maxIdx } = parseAntigravityConversationFile(filePath, fromIdx, workspaceMap);
  parseState[filePath] = {
    size: stat.size,
    mtime: stat.mtimeMs.toString(),
    maxIdx
  };

  return { messages };
}

module.exports = {
  decodeVarint,
  decodeProtobuf,
  extractAntigravityProjectName,
  loadAntigravityWorkspaces,
  findAntigravityConversationFiles,
  parseAntigravityConversationFile,
  parseAllAntigravity,
  parseIncrementalAntigravity
};
