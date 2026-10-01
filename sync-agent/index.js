#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const readline = require('readline');
const { execFileSync } = require('child_process');
const os = require('os');

const HOME = process.env.HOME || os.homedir();

// Provider directories
const CLAUDE_DIR = process.env.CLAUDE_DIR || path.join(HOME, '.claude');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');

const CODEX_DIR = process.env.CODEX_DIR || path.join(HOME, '.codex');
const CODEX_SESSIONS_DIR = path.join(CODEX_DIR, 'sessions');

const ANTIGRAVITY_DIR = process.env.ANTIGRAVITY_DIR || path.join(HOME, '.gemini', 'antigravity-cli');
const ANTIGRAVITY_CONVERSATIONS_DIR = path.join(ANTIGRAVITY_DIR, 'conversations');
const ANTIGRAVITY_SUMMARIES_DB = path.join(ANTIGRAVITY_DIR, 'conversation_summaries.db');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const STATE_PATH = path.join(__dirname, '.sync-state.json');
const PLAN_USAGE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// --- Helper functions ---

function countLines(str) {
  if (!str) return 0;
  let n = 1;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\n') n++;
  }
  if (str[str.length - 1] === '\n') n--;
  return n;
}

const HOME_PREFIX_RE = new RegExp(
  '^' + HOME.replace(/\//g, '-').replace(/^-/, '-') + '-?'
);

// --- Claude Code parser ---

function extractProjectName(filePath) {
  const rel = path.relative(PROJECTS_DIR, filePath);
  const parts = rel.split(path.sep);
  const dirName = parts[0];
  const cleaned = dirName.replace(HOME_PREFIX_RE, '') || 'home';
  return cleaned.replace(/-/g, '/') || 'home';
}

function parseSessionFile(filePath, fromOffset = 0) {
  let stat;
  try { stat = fs.statSync(filePath); } catch { return { messages: [], rateLimitEvents: [], newOffset: fromOffset }; }
  if (stat.size <= fromOffset) return { messages: [], rateLimitEvents: [], newOffset: fromOffset };

  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(stat.size - fromOffset);
  fs.readSync(fd, buf, 0, buf.length, fromOffset);
  fs.closeSync(fd);

  const lines = buf.toString('utf-8').split('\n');
  const msgMap = new Map();
  const rateLimitEvents = [];
  let sessionId = null;
  const project = extractProjectName(filePath);

  for (const line of lines) {
    if (!line.trim()) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }

    if (!sessionId && obj.sessionId) sessionId = obj.sessionId;

    // Rate-limit events
    if (obj.type === 'queue-operation' && obj.content === '/rate-limit-options') {
      const sid = obj.sessionId || sessionId || '';
      const id = crypto.createHash('sha256').update(sid + obj.timestamp).digest('hex').slice(0, 16);
      rateLimitEvents.push({ id, timestamp: obj.timestamp, sessionId: sid, project });
      continue;
    }

    if (obj.type === 'assistant' && obj.message) {
      const msg = obj.message;
      const usage = msg.usage;
      if (!usage) continue;

      const msgId = msg.id || obj.uuid;
      const model = msg.model || '<synthetic>';
      const timestamp = obj.timestamp;

      const tools = [];
      let linesAdded = 0, linesRemoved = 0, linesWritten = 0;
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'tool_use') {
            tools.push(block.name);
            if (block.name === 'Edit' && block.input) {
              linesRemoved += countLines(block.input.old_string);
              linesAdded += countLines(block.input.new_string);
            } else if (block.name === 'Write' && block.input) {
              linesWritten += countLines(block.input.content);
            }
          }
        }
      }

      const prev = msgMap.get(msgId);
      const mergedTools = prev ? [...new Set([...prev.tools, ...tools])] : tools;

      msgMap.set(msgId, {
        id: msgId,
        timestamp,
        model,
        sessionId: obj.sessionId || sessionId,
        project,
        inputTokens: usage.input_tokens || 0,
        outputTokens: usage.output_tokens || 0,
        cacheReadTokens: usage.cache_read_input_tokens || 0,
        cacheCreateTokens: usage.cache_creation_input_tokens || 0,
        cacheCreate5m: (usage.cache_creation && usage.cache_creation.ephemeral_5m_input_tokens) || 0,
        cacheCreate1h: (usage.cache_creation && usage.cache_creation.ephemeral_1h_input_tokens) || 0,
        tools: mergedTools,
        stopReason: msg.stop_reason,
        linesAdded,
        linesRemoved,
        linesWritten,
        provider: 'claude'
      });
    }
  }

  return { messages: [...msgMap.values()], rateLimitEvents, newOffset: stat.size };
}

function findSessionFiles() {
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
  if (fs.existsSync(PROJECTS_DIR)) {
    walk(PROJECTS_DIR);
  }
  return files;
}

// --- OpenAI Codex parser ---

function extractCodexProjectName(cwd) {
  if (!cwd) return 'default';
  let cleaned = cwd;
  if (cleaned.startsWith(HOME)) {
    cleaned = cleaned.slice(HOME.length).replace(/^[/\\]+/, '');
  }
  return cleaned || 'home';
}

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

// --- Google Antigravity parser ---

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

function decodeProtobuf(data) {
  if (!data) return [];
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  let i = 0;
  const fields = [];
  while (i < buf.length) {
    try {
      const byte = buf[i++];
      const fieldNum = byte >> 3;
      const wireType = byte & 0x07;
      if (wireType === 0) {
        const [val, nextI] = decodeVarint(buf, i);
        i = nextI;
        fields.push([fieldNum, 'varint', val]);
      } else if (wireType === 2) {
        const [len, nextI] = decodeVarint(buf, i);
        i = nextI;
        if (i + len > buf.length) break;
        const val = buf.subarray(i, i + len);
        i += len;
        fields.push([fieldNum, 'bytes', val]);
      } else if (wireType === 1) {
        if (i + 8 > buf.length) break;
        fields.push([fieldNum, 'fixed64', buf.subarray(i, i + 8)]);
        i += 8;
      } else if (wireType === 5) {
        if (i + 4 > buf.length) break;
        fields.push([fieldNum, 'fixed32', buf.subarray(i, i + 4)]);
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

function extractAntigravityProjectName(uri) {
  if (!uri) return 'default';
  let clean = uri;
  try {
    if (clean.startsWith('[') && clean.endsWith(']')) {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0) clean = parsed[0];
    }
  } catch {}

  if (clean.startsWith('file://')) {
    clean = decodeURIComponent(clean.slice(7));
  }
  if (clean.startsWith(HOME)) {
    clean = clean.slice(HOME.length).replace(/^[/\\]+/, '');
  }
  return clean || 'home';
}

function toBuffer(val) {
  if (!val) return null;
  if (Buffer.isBuffer(val)) return val;
  if (val instanceof Uint8Array) return Buffer.from(val);
  if (typeof val === 'string') return Buffer.from(val, 'hex');
  return null;
}

function openSqliteDb(filePath) {
  if (!fs.existsSync(filePath)) return null;

  // 1. Try node:sqlite (Node 22+)
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(filePath, { readOnly: true });
    return {
      all: (sql, params = []) => {
        const stmt = db.prepare(sql);
        return stmt.all(...params);
      },
      close: () => { try { db.close(); } catch {} }
    };
  } catch {}

  // 2. Try better-sqlite3
  try {
    const Database = require('better-sqlite3');
    const db = new Database(filePath, { readonly: true, fileMustExist: true });
    return {
      all: (sql, params = []) => {
        const stmt = db.prepare(sql);
        return stmt.all(...params);
      },
      close: () => { try { db.close(); } catch {} }
    };
  } catch {}

  // 3. Fallback: sqlite3 CLI
  try {
    return {
      all: (sql, params = []) => {
        let rendered = sql;
        for (const p of params) {
          const val = typeof p === 'number' ? p : `'${String(p).replace(/'/g, "''")}'`;
          rendered = rendered.replace('?', val);
        }
        const stdout = execFileSync('sqlite3', [filePath, '.mode json', rendered], {
          encoding: 'utf8',
          maxBuffer: 50 * 1024 * 1024,
          timeout: 10000
        });
        if (!stdout.trim()) return [];
        return JSON.parse(stdout);
      },
      close: () => {}
    };
  } catch {}

  return null;
}

function loadAntigravityWorkspaces(summariesDbPath = ANTIGRAVITY_SUMMARIES_DB) {
  const map = new Map();
  const db = openSqliteDb(summariesDbPath);
  if (!db) return map;

  try {
    const rows = db.all('SELECT conversation_id, workspace_uris, last_modified_time FROM conversation_summaries');
    for (const r of rows) {
      map.set(r.conversation_id, {
        project: extractAntigravityProjectName(r.workspace_uris),
        lastModified: r.last_modified_time
      });
    }
  } catch (err) {
    // ignore read error
  } finally {
    db.close();
  }
  return map;
}

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

  const messages = [];
  let maxIdx = fromIdx;
  const db = openSqliteDb(filePath);
  if (!db) return { messages: [], maxIdx: fromIdx };

  try {
    const stepTimestamps = new Map();
    try {
      const stepRows = db.all('SELECT idx, metadata FROM steps WHERE metadata IS NOT NULL');
      for (const row of stepRows) {
        const metaBuf = toBuffer(row.metadata);
        if (!metaBuf) continue;
        const top = decodeProtobuf(metaBuf);
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
    } catch {}

    const genRows = db.all('SELECT idx, data FROM gen_metadata WHERE idx > ? AND data IS NOT NULL ORDER BY idx ASC', [fromIdx]);

    for (const row of genRows) {
      const idx = row.idx;
      if (idx > maxIdx) maxIdx = idx;

      const dataBuf = toBuffer(row.data);
      if (!dataBuf) continue;

      const dataStr = dataBuf.toString('latin1');
      const mModel = dataStr.match(/(gemini-[a-zA-Z0-9.\-]+)/);
      const model = mModel ? mModel[1] : 'gemini-3.8-flash';

      const mStep = dataStr.match(/last_step_index\x12[\x01-\x10]([0-9]+)/);
      const stepIdx = mStep ? parseInt(mStep[1], 10) : idx;

      const ts = stepTimestamps.get(stepIdx) || stepTimestamps.get(idx) || defaultTimestamp;

      const top = decodeProtobuf(dataBuf);
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
    db.close();
  }

  return { messages, maxIdx };
}

// --- State management ---

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// --- Config ---

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

// --- Plan Usage (OAuth token detection + claude.ai API) ---

let _planUsageCache = null;
let _planUsageFetchedAt = 0;
let _orgId = null;

function _getOAuthTokenFromKeychain() {
  if (os.platform() !== 'darwin') return null;
  try {
    const raw = execFileSync('security', [
      'find-generic-password', '-s', 'Claude Code-credentials', '-w'
    ], { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const parsed = JSON.parse(raw);
    return (parsed.claudeAiOauth && parsed.claudeAiOauth.accessToken) || null;
  } catch {
    return null;
  }
}

function _getOAuthTokenFromFile() {
  let credPath;
  if (os.platform() === 'win32') {
    credPath = path.join(process.env.APPDATA || '', 'Claude', 'credentials.json');
  } else {
    credPath = path.join(HOME, '.config', 'claude', 'credentials.json');
  }
  try {
    const data = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    return (data.claudeAiOauth && data.claudeAiOauth.accessToken) || data.accessToken || null;
  } catch {
    return null;
  }
}

function getOAuthToken() {
  return _getOAuthTokenFromKeychain() || _getOAuthTokenFromFile() || null;
}

function _apiGet(url, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'claude-code/1.0',
        'anthropic-client-platform': 'claude-code',
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 401 || res.statusCode === 403) {
          return reject(new Error('TOKEN_EXPIRED'));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
        try { resolve(JSON.parse(data)); } catch { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function _getOrgId(token) {
  if (_orgId) return _orgId;
  const data = await _apiGet('https://claude.ai/api/bootstrap', token);
  if (data.account && data.account.memberships) {
    for (const m of data.account.memberships) {
      if (m.organization && m.organization.uuid) {
        _orgId = m.organization.uuid;
        return _orgId;
      }
    }
  }
  if (data.organizations && data.organizations.length > 0) {
    _orgId = data.organizations[0].uuid || data.organizations[0].id;
    return _orgId;
  }
  throw new Error('Could not find organization ID');
}

async function fetchPlanUsage() {
  const token = getOAuthToken();
  if (!token) return null;

  if (_planUsageCache && (Date.now() - _planUsageFetchedAt) < PLAN_USAGE_INTERVAL_MS) {
    return _planUsageCache;
  }

  try {
    const orgId = await _getOrgId(token);
    const raw = await _apiGet(`https://claude.ai/api/organizations/${orgId}/usage`, token);

    const result = {};
    if (raw.current_session || raw.currentSession) {
      const cs = raw.current_session || raw.currentSession;
      result.currentSession = {
        percentUsed: cs.percent_used ?? cs.percentUsed ?? null,
        resetsInSeconds: cs.resets_in_seconds ?? cs.resetsInSeconds ?? null,
        expiresAt: cs.expires_at ?? cs.expiresAt ?? null
      };
    }
    if (raw.weekly_limits || raw.weeklyLimits) {
      const wl = raw.weekly_limits || raw.weeklyLimits;
      if (wl.all_models || wl.allModels) {
        const am = wl.all_models || wl.allModels;
        result.weeklyAllModels = {
          percentUsed: am.percent_used ?? am.percentUsed ?? null,
          resetsAt: am.resets_at ?? am.resetsAt ?? null
        };
      }
      if (wl.sonnet_only || wl.sonnetOnly) {
        const so = wl.sonnet_only || wl.sonnetOnly;
        result.weeklySonnet = {
          percentUsed: so.percent_used ?? so.percentUsed ?? null,
          resetsAt: so.resets_at ?? so.resetsAt ?? null
        };
      }
    }
    result.fetchedAt = new Date().toISOString();
    _planUsageCache = result;
    _planUsageFetchedAt = Date.now();
    return result;
  } catch (err) {
    if (_planUsageCache) return _planUsageCache;
    if (!fetchPlanUsage._errorLogged) {
      console.error(`Plan usage fetch error: ${err.message} (suppressing further)`);
      fetchPlanUsage._errorLogged = true;
    }
    return null;
  }
}

// --- HTTP request helper ---

function sendBatch(serverUrl, apiKey, messages, rateLimitEvents, planUsage) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(serverUrl + '/api/sync');
    const isHttps = urlObj.protocol === 'https:';
    const mod = isHttps ? https : http;

    const payload = { messages };
    if (rateLimitEvents && rateLimitEvents.length > 0) {
      payload.rateLimitEvents = rateLimitEvents;
    }
    if (planUsage) {
      payload.planUsage = planUsage;
    }
    const body = JSON.stringify(payload);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'token-tracker-sync-agent'
      }
    };

    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || data}`));
          }
        } catch {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sendWithRetry(serverUrl, apiKey, messages, rateLimitEvents, planUsage, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await sendBatch(serverUrl, apiKey, messages, rateLimitEvents, planUsage);
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`  Retry in ${delay / 1000}s: ${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// --- Setup command ---

async function setup() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(resolve => rl.question(q, resolve));

  console.log('Token Tracker — Sync Agent Setup\n');

  const serverUrl = (await ask('Server URL (e.g. https://tracker.celox.io): ')).trim().replace(/\/$/, '');
  const apiKey = (await ask('API Key: ')).trim();

  rl.close();

  if (!serverUrl || !apiKey) {
    console.error('Both server URL and API key are required.');
    process.exit(1);
  }

  const config = { serverUrl, apiKey };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`\nConfig saved to ${CONFIG_PATH}`);
  console.log('Run `node index.js` to start syncing.');
}

// --- Full sync ---

async function backfillRateLimitEvents(config) {
  const files = findSessionFiles();
  const allEvents = [];

  for (const filePath of files) {
    let stat;
    try { stat = fs.statSync(filePath); } catch { continue; }
    if (stat.size === 0) continue;

    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(stat.size);
    fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);

    const project = extractProjectName(filePath);
    let sessionId = null;

    const lines = buf.toString('utf-8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      let obj;
      try { obj = JSON.parse(line); } catch { continue; }
      if (!sessionId && obj.sessionId) sessionId = obj.sessionId;
      if (obj.type === 'queue-operation' && obj.content === '/rate-limit-options') {
        const sid = obj.sessionId || sessionId || '';
        const id = crypto.createHash('sha256').update(sid + obj.timestamp).digest('hex').slice(0, 16);
        allEvents.push({ id, timestamp: obj.timestamp, sessionId: sid, project });
      }
    }
  }

  if (allEvents.length > 0) {
    for (let i = 0; i < allEvents.length; i += 500) {
      const batch = allEvents.slice(i, i + 500);
      await sendWithRetry(config.serverUrl, config.apiKey, [], batch, null);
    }
    console.log(`Backfilled ${allEvents.length} rate-limit events from existing JSONL files`);
  }

  return allEvents.length;
}

async function fullSync(config) {
  const state = loadState();
  let totalSent = 0;
  let planUsageSent = false;

  // 1. One-time backfill for rate-limit events from already-parsed Claude files
  if (!state._rateLimitBackfillDone) {
    await backfillRateLimitEvents(config);
    state._rateLimitBackfillDone = true;
    saveState(state);
  }

  // 2. Fetch plan usage to include in sync
  const planUsage = await fetchPlanUsage();

  // Helper to push messages in 500 batches
  async function pushMessages(messages, rateLimitEvents = []) {
    if (!messages.length && !rateLimitEvents.length) return;
    if (messages.length > 0) {
      for (let i = 0; i < messages.length; i += 500) {
        const batch = messages.slice(i, i + 500);
        const rle = (i === 0) ? rateLimitEvents : [];
        const pu = (!planUsageSent && i === 0) ? planUsage : null;
        const result = await sendWithRetry(config.serverUrl, config.apiKey, batch, rle, pu);
        if (pu) planUsageSent = true;
        totalSent += (result && result.inserted) || batch.length;
        process.stdout.write(`  Synced ${totalSent} messages...\r`);
      }
    } else if (rateLimitEvents.length > 0) {
      const pu = !planUsageSent ? planUsage : null;
      await sendWithRetry(config.serverUrl, config.apiKey, [], rateLimitEvents, pu);
      if (pu) planUsageSent = true;
    }
  }

  // 3. Claude Code sessions
  const claudeFiles = findSessionFiles();
  for (const filePath of claudeFiles) {
    const prev = state[filePath];
    const offset = prev ? prev.offset : 0;
    const { messages, rateLimitEvents, newOffset } = parseSessionFile(filePath, offset);
    if (messages.length > 0 || rateLimitEvents.length > 0) {
      await pushMessages(messages, rateLimitEvents);
    }
    state[filePath] = { offset: newOffset };
  }

  // 4. OpenAI Codex sessions
  const codexFiles = findCodexSessionFiles();
  for (const filePath of codexFiles) {
    const prev = state[filePath];
    const offset = prev ? prev.offset : 0;
    const { messages, newOffset } = parseCodexSessionFile(filePath, offset);
    if (messages.length > 0) {
      await pushMessages(messages);
    }
    state[filePath] = { offset: newOffset };
  }

  // 5. Google Antigravity conversations
  const agyFiles = findAntigravityConversationFiles();
  if (agyFiles.length > 0) {
    const workspaceMap = loadAntigravityWorkspaces(ANTIGRAVITY_SUMMARIES_DB);
    for (const filePath of agyFiles) {
      const prev = state[filePath];
      const fromIdx = (prev && typeof prev.maxIdx === 'number') ? prev.maxIdx : -1;
      const { messages, maxIdx } = parseAntigravityConversationFile(filePath, fromIdx, workspaceMap);
      if (messages.length > 0) {
        await pushMessages(messages);
      }
      state[filePath] = { maxIdx };
    }
  }

  // If no files had changes but we have plan usage, send it standalone
  if (!planUsageSent && planUsage) {
    await sendWithRetry(config.serverUrl, config.apiKey, [], [], planUsage);
    planUsageSent = true;
    console.log('Synced plan usage data');
  }

  saveState(state);
  return totalSent;
}

// --- Watch mode ---

async function watch(config) {
  let chokidar;
  try {
    chokidar = require('chokidar');
  } catch {
    console.error('chokidar not installed. Run: npm install');
    process.exit(1);
  }

  const state = loadState();
  const watchPaths = [];
  if (fs.existsSync(PROJECTS_DIR)) watchPaths.push(PROJECTS_DIR);
  if (fs.existsSync(CODEX_SESSIONS_DIR)) watchPaths.push(CODEX_SESSIONS_DIR);
  if (fs.existsSync(ANTIGRAVITY_CONVERSATIONS_DIR)) watchPaths.push(ANTIGRAVITY_CONVERSATIONS_DIR);

  console.log(`Watching for changes in:\n  ${watchPaths.join('\n  ')}`);

  const watcher = chokidar.watch(watchPaths, {
    ignored: (filePath) => {
      const base = path.basename(filePath);
      if (base.startsWith('.') && base !== '.claude' && base !== '.codex' && base !== '.gemini') return true;
      if (base === 'subagents' || filePath.includes('/subagents/')) return true;
      if (base.endsWith('-shm') || base.endsWith('-wal')) return true;
      return false;
    },
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 }
  });

  let lastSyncTs = Date.now();
  let planUsageErrorLogged = false;

  const processFile = async (filePath) => {
    try {
      let messages = [];
      let rateLimitEvents = [];

      if (filePath.endsWith('.jsonl')) {
        if (filePath.includes('/subagents/')) return;
        const prev = state[filePath];
        const offset = prev ? prev.offset : 0;

        if (filePath.includes('.codex') || (CODEX_SESSIONS_DIR && filePath.startsWith(CODEX_SESSIONS_DIR))) {
          const res = parseCodexSessionFile(filePath, offset);
          messages = res.messages || [];
          state[filePath] = { offset: res.newOffset };
        } else {
          const res = parseSessionFile(filePath, offset);
          messages = res.messages || [];
          rateLimitEvents = res.rateLimitEvents || [];
          state[filePath] = { offset: res.newOffset };
        }
      } else if (filePath.endsWith('.db') && !filePath.endsWith('-shm') && !filePath.endsWith('-wal')) {
        if (filePath.includes('conversation_summaries')) return;
        const prev = state[filePath];
        const fromIdx = (prev && typeof prev.maxIdx === 'number') ? prev.maxIdx : -1;
        const workspaceMap = loadAntigravityWorkspaces(ANTIGRAVITY_SUMMARIES_DB);
        const res = parseAntigravityConversationFile(filePath, fromIdx, workspaceMap);
        messages = res.messages || [];
        state[filePath] = { maxIdx: res.maxIdx };
      } else {
        return;
      }

      if (messages.length > 0 || rateLimitEvents.length > 0) {
        const planUsage = await fetchPlanUsage().catch(() => null);
        await sendWithRetry(config.serverUrl, config.apiKey, messages, rateLimitEvents, planUsage);
        lastSyncTs = Date.now();
        const parts = [];
        if (messages.length > 0) parts.push(`${messages.length} messages`);
        if (rateLimitEvents.length > 0) parts.push(`${rateLimitEvents.length} rate-limit events`);
        if (planUsage) parts.push('plan usage');
        console.log(`[${new Date().toTimeString().slice(0, 8)}] Synced ${parts.join(', ')} from ${path.basename(filePath)}`);
      }

      saveState(state);
    } catch (err) {
      console.error(`Error syncing ${filePath}: ${err.message}`);
    }
  };

  watcher.on('change', processFile);
  watcher.on('add', processFile);
  watcher.on('error', (err) => {
    console.error(`Watcher error: ${err.message}`);
  });
  watcher.on('ready', () => {
    console.log('File watcher ready.');
  });

  // Periodic plan usage sync (every 5 min, even without file changes)
  const planUsageTimer = setInterval(async () => {
    try {
      const planUsage = await fetchPlanUsage();
      if (planUsage) {
        await sendWithRetry(config.serverUrl, config.apiKey, [], [], planUsage);
        console.log(`[${new Date().toTimeString().slice(0, 8)}] Synced plan usage`);
      }
    } catch (err) {
      if (!planUsageErrorLogged) {
        console.error(`Plan usage sync error: ${err.message} (suppressing further)`);
        planUsageErrorLogged = true;
      }
    }
  }, PLAN_USAGE_INTERVAL_MS);

  // Heartbeat every 30 min — shows agent is alive
  const heartbeatTimer = setInterval(() => {
    const ago = Math.round((Date.now() - lastSyncTs) / 60000);
    console.log(`[${new Date().toTimeString().slice(0, 8)}] Heartbeat — watching, last sync ${ago}m ago`);
  }, 30 * 60 * 1000);

  // Catch unhandled rejections to prevent silent death
  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled rejection: ${err && err.message || err}`);
  });

  // Keep alive
  process.on('SIGINT', () => {
    console.log('\nStopping sync agent...');
    clearInterval(planUsageTimer);
    clearInterval(heartbeatTimer);
    watcher.close();
    saveState(state);
    process.exit(0);
  });
}

// --- Main ---

async function main() {
  const command = process.argv[2];

  if (command === 'setup') {
    return setup();
  }

  const config = loadConfig();
  if (!config) {
    console.error('No config found. Run: node index.js setup');
    process.exit(1);
  }

  console.log(`Token Tracker Sync Agent`);
  console.log(`Server: ${config.serverUrl}\n`);

  // Initial full sync
  console.log('Running initial sync...');
  const count = await fullSync(config);
  console.log(`Initial sync complete: ${count} messages sent.\n`);

  // Start watching
  await watch(config);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
