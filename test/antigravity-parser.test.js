const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const {
  decodeVarint,
  decodeProtobuf,
  extractAntigravityProjectName,
  loadAntigravityWorkspaces,
  parseAntigravityConversationFile,
  findAntigravityConversationFiles,
  parseAllAntigravity
} = require('../lib/antigravity-parser');

describe('antigravity-parser', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('decodeVarint & decodeProtobuf', () => {
    it('decodes varint correctly', () => {
      // 300 = 0xac 0x02
      const buf = Buffer.from([0xac, 0x02]);
      const [val, nextI] = decodeVarint(buf, 0);
      expect(val).toBe(300);
      expect(nextI).toBe(2);
    });

    it('decodes simple protobuf message', () => {
      // tag 1, varint 42: (1 << 3) | 0 = 0x08, 42 = 0x2a
      const buf = Buffer.from([0x08, 0x2a]);
      const fields = decodeProtobuf(buf);
      expect(fields).toEqual([[1, 'varint', 42]]);
    });
  });

  describe('extractAntigravityProjectName', () => {
    it('handles JSON array of file URIs', () => {
      // Built from the real home dir: the parser strips HOME, and a hard-coded
      // /Users/martin only matched the developer's machine (CI runs /home/runner).
      const { HOME } = require('../lib/config');
      const fileUri = (rel) => 'file://' + encodeURI(path.posix.join(HOME.split(path.sep).join('/'), rel));
      expect(extractAntigravityProjectName(JSON.stringify([fileUri('claude/my-project')]))).toBe('claude/my-project');
      expect(extractAntigravityProjectName(fileUri('Downloads/MaX3 3'))).toBe('Downloads/MaX3 3');
      expect(extractAntigravityProjectName(null)).toBe('default');
    });
  });

  describe('parseAntigravityConversationFile', () => {
    it('extracts messages from SQLite database', () => {
      const dbPath = path.join(tmpDir, 'test-conv.db');
      const db = new Database(dbPath);

      db.exec(`
        CREATE TABLE gen_metadata (idx INTEGER PRIMARY KEY, data BLOB);
        CREATE TABLE steps (idx INTEGER PRIMARY KEY, metadata BLOB);
      `);

      // Mock protobuf for tokens in gen_metadata:
      // tag 1 (bytes) -> submessage:
      //   tag 4 (bytes) -> submessage f4:
      //     tag 1 (varint) 1500  (input)
      //     tag 2 (varint) 3000  (cache read)
      //     tag 3 (varint) 200   (output)
      const f4Buf = Buffer.from([
        0x08, 0xdc, 0x0b, // tag 1 (varint 1500)
        0x10, 0xb8, 0x17, // tag 2 (varint 3000)
        0x18, 0xc8, 0x01  // tag 3 (varint 200)
      ]);
      const f1Buf = Buffer.concat([
        Buffer.from([0x22, f4Buf.length]), // tag 4, length
        f4Buf,
        Buffer.from('gemini-3.8-flash'),
        Buffer.from('\n\x0flast_step_index\x12\x010')
      ]);
      const genBuf = Buffer.concat([
        Buffer.from([0x0a, f1Buf.length]), // tag 1, length
        f1Buf
      ]);

      db.prepare('INSERT INTO gen_metadata (idx, data) VALUES (?, ?)').run(0, genBuf);

      // Mock step metadata with timestamp ~1790778932
      // tag 1 (bytes length 12): tag 1 varint 1790778932, tag 2 varint 0
      const tsBuf = Buffer.from([0x08, 0xb4, 0xbc, 0xf4, 0xd5, 0x06, 0x10, 0x00]);
      const stepMeta = Buffer.concat([
        Buffer.from([0x0a, tsBuf.length]),
        tsBuf
      ]);
      db.prepare('INSERT INTO steps (idx, metadata) VALUES (?, ?)').run(0, stepMeta);
      db.close();

      const workspaceMap = new Map([['test-conv', { project: 'test-proj', lastModified: '2026-09-30T10:00:00Z' }]]);
      const res = parseAntigravityConversationFile(dbPath, -1, workspaceMap);

      expect(res.messages).toHaveLength(1);
      const m = res.messages[0];
      expect(m.id).toBe('agy_test-conv_0');
      expect(m.model).toBe('gemini-3.8-flash');
      expect(m.project).toBe('test-proj');
      expect(m.inputTokens).toBe(1500);
      expect(m.cacheReadTokens).toBe(3000);
      expect(m.outputTokens).toBe(200);
      expect(m.provider).toBe('antigravity');
    });
  });

  describe('parseAllAntigravity across provider dirs', () => {
    const writeConv = (conversationsDir, convId, project) => {
      fs.mkdirSync(conversationsDir, { recursive: true });
      const db = new Database(path.join(conversationsDir, `${convId}.db`));
      db.exec(`
        CREATE TABLE gen_metadata (idx INTEGER PRIMARY KEY, data BLOB);
        CREATE TABLE steps (idx INTEGER PRIMARY KEY, metadata BLOB);
      `);
      const f4Buf = Buffer.from([0x08, 0xdc, 0x0b, 0x10, 0xb8, 0x17, 0x18, 0xc8, 0x01]);
      const f1Buf = Buffer.concat([Buffer.from([0x22, f4Buf.length]), f4Buf]);
      const genBuf = Buffer.concat([Buffer.from([0x0a, f1Buf.length]), f1Buf]);
      db.prepare('INSERT INTO gen_metadata (idx, data) VALUES (?, ?)').run(0, genBuf);
      db.close();

      const summaries = new Database(path.join(path.dirname(conversationsDir), 'conversation_summaries.db'));
      summaries.exec('CREATE TABLE conversation_summaries (conversation_id TEXT, workspace_uris TEXT, last_modified_time TEXT)');
      summaries.prepare('INSERT INTO conversation_summaries VALUES (?, ?, ?)')
        .run(convId, 'file://' + path.join(os.homedir(), project), '2026-10-22T10:00:00Z');
      summaries.close();
    };

    it('reads both the CLI and the app dir, each with its own summaries db', () => {
      const cliDir = path.join(tmpDir, 'antigravity-cli', 'conversations');
      const appDir = path.join(tmpDir, 'antigravity', 'conversations');
      writeConv(cliDir, 'cli-conv', 'proj-cli');
      writeConv(appDir, 'app-conv', 'proj-app');

      expect(findAntigravityConversationFiles([cliDir, appDir])).toHaveLength(2);

      const { messages } = parseAllAntigravity({}, [cliDir, appDir]);
      expect(messages.map(m => m.project).sort()).toEqual(['proj-app', 'proj-cli']);
    });
  });
});
