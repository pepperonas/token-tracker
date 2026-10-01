const fs = require('fs');
const path = require('path');
const { CODEX_SESSIONS_DIR, HOME } = require('./config');

const HOME_PREFIX_RE = new RegExp(
  '^' + HOME.replace(/\//g, '-').replace(/^-/, '-') + '-?'
);

/**
 * Clean up a directory path to a project name (same convention as Claude Code parser)
 */
function extractCodexProjectName(cwd) {
  if (!cwd) return 'default';
  let cleaned = cwd;
  if (cleaned.startsWith(HOME)) {
    cleaned = cleaned.slice(HOME.length).replace(/^[/\\]+/, '');
  }
  return cleaned || 'home';
}

/**
 * Find all Codex rollout session files
 */
function findCodexSessionFiles(sessionsDir = CODEX_SESSIONS_DIR) {
  const files = [];
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.name.endsWith('.jsonl')) {
        files.push(full);
      }
    }
  }
  if (fs.existsSync(sessionsDir)) {
    walk(sessionsDir);
  }
  return files;
}

/**
 * Parse a single Codex JSONL session file (optionally from byte offset)
 */
function parseCodexSessionFile(filePath, fromOffset = 0) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return { messages: [], newOffset: fromOffset };
  }
  if (stat.size <= fromOffset) return { messages: [], newOffset: fromOffset };

  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(stat.size - fromOffset);
  fs.readSync(fd, buf, 0, buf.length, fromOffset);
  fs.closeSync(fd);

  const lines = buf.toString('utf-8').split('\n');
  const messages = [];
  let currentCwd = null;
  let currentModel = 'gpt-5-codex';
  let sessionId = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }

    const t = obj.type;
    const p = obj.payload;

    if (t === 'turn_context' && p) {
      if (p.cwd) currentCwd = p.cwd;
      if (p.model) currentModel = p.model;
    } else if (t === 'response_item' && p && typeof p === 'object') {
      if (p.cwd) currentCwd = p.cwd;
      if (p.session_id && !sessionId) sessionId = p.session_id;
    } else if (t === 'token_usage_record' && p && p.usage) {
      const u = p.usage;
      const respId = p.response_id || `codex_${p.thread_id || 't'}_${p.turn_id || 'u'}_${obj.ordinal || i}`;
      const sid = p.session_id || p.thread_id || sessionId || path.basename(filePath, '.jsonl');
      const ts = obj.timestamp || new Date().toISOString();
      const project = extractCodexProjectName(currentCwd);

      const totalInput = u.input_tokens || 0;
      const cachedTokens = u.cached_input_tokens || 0;
      const uncachedInput = Math.max(0, totalInput - cachedTokens);
      const outputTokens = u.output_tokens || 0;
      const cacheCreate = u.cache_write_input_tokens || 0;

      messages.push({
        id: respId,
        timestamp: ts,
        model: currentModel,
        sessionId: sid,
        project,
        inputTokens: uncachedInput,
        outputTokens,
        cacheReadTokens: cachedTokens,
        cacheCreateTokens: cacheCreate,
        cacheCreate5m: cacheCreate,
        cacheCreate1h: 0,
        stopReason: 'end_turn',
        tools: [],
        toolCounts: {},
        isSubagent: false,
        linesAdded: 0,
        linesRemoved: 0,
        linesWritten: 0,
        provider: 'codex'
      });
    }
  }

  return { messages, newOffset: stat.size, sessionId };
}

/**
 * Full parse of all Codex session files
 */
function parseAllCodex(parseState = {}, sessionsDir = CODEX_SESSIONS_DIR) {
  const files = findCodexSessionFiles(sessionsDir);
  const allMessages = [];
  const newState = { ...parseState };

  for (const filePath of files) {
    const prev = parseState[filePath];
    let stat;
    try { stat = fs.statSync(filePath); } catch { continue; }
    const offset = (prev && prev.size <= stat.size && prev.mtime === stat.mtimeMs.toString())
      ? prev.offset
      : 0;

    const { messages, newOffset } = parseCodexSessionFile(filePath, offset);
    allMessages.push(...messages);
    newState[filePath] = {
      size: stat.size,
      mtime: stat.mtimeMs.toString(),
      offset: newOffset
    };
  }

  return { messages: allMessages, parseState: newState };
}

/**
 * Parse a single Codex file incrementally
 */
function parseIncrementalCodex(filePath, parseState = {}) {
  const prev = parseState[filePath];
  let stat;
  try { stat = fs.statSync(filePath); } catch { return { messages: [] }; }
  const offset = prev ? prev.offset : 0;

  const { messages, newOffset } = parseCodexSessionFile(filePath, offset);
  parseState[filePath] = {
    size: stat.size,
    mtime: stat.mtimeMs.toString(),
    offset: newOffset
  };

  return { messages };
}

module.exports = {
  findCodexSessionFiles,
  extractCodexProjectName,
  parseCodexSessionFile,
  parseAllCodex,
  parseIncrementalCodex
};
