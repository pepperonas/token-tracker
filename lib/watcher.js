const chokidar = require('chokidar');
const fs = require('fs');
const { PROJECTS_DIR, CODEX_SESSIONS_DIR, ANTIGRAVITY_CONVERSATIONS_DIR } = require('./config');
const { parseIncremental } = require('./parser');
const { parseIncrementalCodex } = require('./codex-parser');
const { parseIncrementalAntigravity } = require('./antigravity-parser');

class Watcher {
  constructor(aggregator, parseState, onUpdate) {
    this.aggregator = aggregator;
    this.parseState = parseState;
    this.onUpdate = onUpdate;
    this.watcher = null;
    this.sseClients = new Set();
  }

  start() {
    const watchPaths = [PROJECTS_DIR];
    if (CODEX_SESSIONS_DIR && fs.existsSync(CODEX_SESSIONS_DIR)) {
      watchPaths.push(CODEX_SESSIONS_DIR);
    }
    if (ANTIGRAVITY_CONVERSATIONS_DIR && fs.existsSync(ANTIGRAVITY_CONVERSATIONS_DIR)) {
      watchPaths.push(ANTIGRAVITY_CONVERSATIONS_DIR);
    }

    this.watcher = chokidar.watch(watchPaths, {
      ignored: (path) => {
        const basename = path.split('/').pop();
        if (basename.startsWith('.') && basename !== '.claude' && basename !== '.codex' && basename !== '.gemini') return true;
        if (path.includes('/subagents/')) return true;
        if (basename.endsWith('-shm') || basename.endsWith('-wal')) return true;
        return false;
      },
      persistent: true,
      ignoreInitial: true
    });

    const handleFile = (filePath, isAdd) => {
      try {
        let newMessages = [];
        let rateLimitEvents = [];

        if (filePath.endsWith('.jsonl')) {
          if (filePath.includes('/subagents/')) return;
          if (filePath.includes('.codex') || (CODEX_SESSIONS_DIR && filePath.startsWith(CODEX_SESSIONS_DIR))) {
            const res = parseIncrementalCodex(filePath, this.parseState);
            newMessages = res.messages || [];
          } else {
            const res = parseIncremental(filePath, this.parseState);
            newMessages = res.messages || [];
            rateLimitEvents = res.rateLimitEvents || [];
          }
        } else if (filePath.endsWith('.db') && !filePath.endsWith('-shm') && !filePath.endsWith('-wal')) {
          if (filePath.includes('conversation_summaries')) return;
          const res = parseIncrementalAntigravity(filePath, this.parseState);
          newMessages = res.messages || [];
        } else {
          return;
        }

        if (newMessages.length > 0 || rateLimitEvents.length > 0) {
          if (newMessages.length > 0) this.aggregator.addMessages(newMessages);
          if (rateLimitEvents.length > 0) this.aggregator.addRateLimitEvents(rateLimitEvents);
          this.broadcast({ type: isAdd ? 'new-session' : 'update', count: newMessages.length });
          if (this.onUpdate) this.onUpdate(newMessages, rateLimitEvents);
        }
      } catch (err) {
        console.error(`Error parsing ${filePath}:`, err.message);
      }
    };

    this.watcher.on('change', (filePath) => handleFile(filePath, false));
    this.watcher.on('add', (filePath) => handleFile(filePath, true));

    console.log('File watcher started on', watchPaths.join(', '));
  }

  addSSEClient(res) {
    this.sseClients.add(res);
    res.on('close', () => this.sseClients.delete(res));
  }

  broadcast(data) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      // In multi-user mode, only send to the targeted user (or to all if no userId in data)
      if (data.userId && client._userId && client._userId !== data.userId) continue;
      try { client.write(payload); } catch (_e) { this.sseClients.delete(client); }
    }
  }

  stop() {
    if (this.watcher) this.watcher.close();
  }
}

module.exports = Watcher;
