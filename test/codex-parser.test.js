const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  findCodexSessionFiles,
  extractCodexProjectName,
  parseCodexSessionFile,
  parseAllCodex,
  parseIncrementalCodex
} = require('../lib/codex-parser');

describe('codex-parser', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('extractCodexProjectName', () => {
    it('cleans cwd and strips home directory prefix', () => {
      expect(extractCodexProjectName('/Users/test/projects/my-app')).toBeDefined();
      expect(extractCodexProjectName(null)).toBe('default');
      expect(extractCodexProjectName('')).toBe('default');
    });
  });

  describe('findCodexSessionFiles', () => {
    it('recursively finds rollout-*.jsonl files', () => {
      const sub = path.join(tmpDir, '2026', '10', '01');
      fs.mkdirSync(sub, { recursive: true });
      fs.writeFileSync(path.join(sub, 'rollout-1.jsonl'), '{}\n');
      fs.writeFileSync(path.join(sub, 'other.txt'), 'hello\n');

      const files = findCodexSessionFiles(tmpDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toBe(path.join(sub, 'rollout-1.jsonl'));
    });

    it('returns empty array when directory does not exist', () => {
      const files = findCodexSessionFiles('/non/existent/path');
      expect(files).toEqual([]);
    });
  });

  describe('parseCodexSessionFile', () => {
    it('parses turn_context and token_usage_record lines', () => {
      const filePath = path.join(tmpDir, 'rollout-test.jsonl');
      const lines = [
        JSON.stringify({
          type: 'turn_context',
          payload: {
            cwd: '/tmp/my-project',
            model: 'gpt-6-astra'
          }
        }),
        JSON.stringify({
          timestamp: '2026-10-01T10:00:00.000Z',
          ordinal: 1,
          type: 'token_usage_record',
          payload: {
            response_id: 'resp_123',
            session_id: 'sess_abc',
            thread_id: 'thread_1',
            turn_id: 'turn_1',
            usage: {
              input_tokens: 1000,
              cached_input_tokens: 400,
              cache_write_input_tokens: 0,
              output_tokens: 150
            }
          }
        })
      ];
      fs.writeFileSync(filePath, lines.join('\n') + '\n');

      const res = parseCodexSessionFile(filePath);
      expect(res.messages).toHaveLength(1);

      const msg = res.messages[0];
      expect(msg.id).toBe('resp_123');
      expect(msg.timestamp).toBe('2026-10-01T10:00:00.000Z');
      expect(msg.model).toBe('gpt-6-astra');
      expect(msg.sessionId).toBe('sess_abc');
      expect(msg.inputTokens).toBe(600); // 1000 - 400 cached
      expect(msg.cacheReadTokens).toBe(400);
      expect(msg.outputTokens).toBe(150);
      expect(msg.provider).toBe('codex');
    });

    it('handles incremental reads with byte offsets', () => {
      const filePath = path.join(tmpDir, 'rollout-inc.jsonl');
      const l1 = JSON.stringify({
        type: 'turn_context',
        payload: { cwd: '/tmp/proj', model: 'gpt-5-codex' }
      }) + '\n';
      const l2 = JSON.stringify({
        type: 'token_usage_record',
        payload: { response_id: 'r1', usage: { input_tokens: 100, output_tokens: 20 } }
      }) + '\n';
      fs.writeFileSync(filePath, l1 + l2);

      const firstPass = parseCodexSessionFile(filePath, 0);
      expect(firstPass.messages).toHaveLength(1);
      expect(firstPass.messages[0].id).toBe('r1');

      const l3 = JSON.stringify({
        type: 'token_usage_record',
        payload: { response_id: 'r2', usage: { input_tokens: 200, output_tokens: 40 } }
      }) + '\n';
      fs.appendFileSync(filePath, l3);

      const secondPass = parseCodexSessionFile(filePath, firstPass.newOffset);
      expect(secondPass.messages).toHaveLength(1);
      expect(secondPass.messages[0].id).toBe('r2');
    });
  });
});
