const Aggregator = require('../lib/aggregator');
const { getModelPricing, getModelLabel } = require('../lib/pricing');

describe('multi-provider tracking', () => {
  let agg;

  beforeEach(() => {
    agg = new Aggregator();
    // Ingest messages from three distinct providers
    agg.addMessages([
      {
        id: 'msg-claude-1',
        sessionId: 'sess-claude-1',
        project: 'project-a',
        provider: 'claude',
        model: 'claude-sonnet-4-5-20250929',
        timestamp: '2026-06-01T10:00:00Z',
        inputTokens: 1000,
        outputTokens: 200,
        cacheReadTokens: 500,
        cacheCreateTokens: 100,
        cost: 0.05,
        linesAdded: 10,
        linesRemoved: 2,
        linesWritten: 20
      },
      {
        id: 'msg-codex-1',
        sessionId: 'sess-codex-1',
        project: 'project-b',
        provider: 'codex',
        model: 'gpt-6-astra',
        timestamp: '2026-06-01T11:00:00Z',
        inputTokens: 2000,
        outputTokens: 400,
        cacheReadTokens: 1000,
        cacheCreateTokens: 0,
        cost: 0.04,
        linesAdded: 50,
        linesRemoved: 10,
        linesWritten: 100
      },
      {
        id: 'msg-ag-1',
        sessionId: 'sess-ag-1',
        project: 'project-c',
        provider: 'antigravity',
        model: 'gemini-3.8-flash',
        timestamp: '2026-06-01T12:00:00Z',
        inputTokens: 3000,
        outputTokens: 600,
        cacheReadTokens: 1500,
        cacheCreateTokens: 0,
        cost: 0.01,
        linesAdded: 30,
        linesRemoved: 5,
        linesWritten: 60
      }
    ]);
  });

  describe('aggregator.getProviders', () => {
    it('returns breakdown for all active providers', () => {
      const providers = agg.getProviders();
      expect(providers).toHaveProperty('claude');
      expect(providers).toHaveProperty('codex');
      expect(providers).toHaveProperty('antigravity');

      expect(providers.claude.tokens).toBe(1800);
      expect(providers.claude.messages).toBe(1);
      expect(providers.claude.sessionsCount).toBe(1);

      expect(providers.codex.tokens).toBe(3400);
      expect(providers.codex.messages).toBe(1);
      expect(providers.codex.sessionsCount).toBe(1);

      expect(providers.antigravity.tokens).toBe(5100);
      expect(providers.antigravity.messages).toBe(1);
      expect(providers.antigravity.sessionsCount).toBe(1);
    });

    it('filters providers by date window', () => {
      const providersOut = agg.getProviders('2026-07-01', '2026-07-30');
      expect(Object.keys(providersOut).length).toBe(0);

      const providersIn = agg.getProviders('2026-06-01', '2026-06-01');
      expect(providersIn.claude.messages).toBe(1);
      expect(providersIn.codex.messages).toBe(1);
      expect(providersIn.antigravity.messages).toBe(1);
    });
  });

  describe('provider filtering on getOverview', () => {
    it('returns combined overview by default', () => {
      const ov = agg.getOverview();
      expect(ov.messages).toBe(3);
      expect(ov.sessions).toBe(3);
      expect(ov.totalTokens).toBe(1800 + 3400 + 5100);
    });

    it('filters overview by codex', () => {
      const ov = agg.getOverview(null, null, 'codex');
      expect(ov.messages).toBe(1);
      expect(ov.sessions).toBe(1);
      expect(ov.totalTokens).toBe(3400);
      expect(ov.inputTokens).toBe(2000);
      expect(ov.outputTokens).toBe(400);
    });

    it('filters overview by antigravity', () => {
      const ov = agg.getOverview(null, null, 'antigravity');
      expect(ov.messages).toBe(1);
      expect(ov.sessions).toBe(1);
      expect(ov.totalTokens).toBe(5100);
      expect(ov.inputTokens).toBe(3000);
    });

    it('filters overview by claude', () => {
      const ov = agg.getOverview(null, null, 'claude');
      expect(ov.messages).toBe(1);
      expect(ov.sessions).toBe(1);
      expect(ov.totalTokens).toBe(1800);
    });
  });

  describe('provider filtering on getDaily', () => {
    it('returns combined daily by default', () => {
      const daily = agg.getDaily();
      expect(daily.length).toBe(1);
      expect(daily[0].messages).toBe(3);
    });

    it('filters daily by provider', () => {
      const dailyCodex = agg.getDaily(null, null, 'codex');
      expect(dailyCodex.length).toBe(1);
      expect(dailyCodex[0].messages).toBe(1);
      expect(dailyCodex[0].inputTokens).toBe(2000);
    });
  });

  describe('provider filtering on getProjects', () => {
    it('filters projects by provider', () => {
      const codexProjects = agg.getProjects(null, null, 'codex');
      expect(codexProjects.length).toBe(1);
      expect(codexProjects[0].name).toBe('project-b');

      const agProjects = agg.getProjects(null, null, 'antigravity');
      expect(agProjects.length).toBe(1);
      expect(agProjects[0].name).toBe('project-c');

      const claudeProjects = agg.getProjects(null, null, 'claude');
      expect(claudeProjects.length).toBe(1);
      expect(claudeProjects[0].name).toBe('project-a');
    });
  });

  describe('provider filtering on getModels', () => {
    it('returns models with provider field', () => {
      const models = agg.getModels();
      expect(models.length).toBe(3);
      const codexModel = models.find(m => m.model === 'gpt-6-astra');
      expect(codexModel.provider).toBe('codex');

      const agModel = models.find(m => m.model === 'gemini-3.8-flash');
      expect(agModel.provider).toBe('antigravity');

      const claudeModel = models.find(m => m.model === 'claude-sonnet-4-5-20250929');
      expect(claudeModel.provider).toBe('claude');
    });

    it('filters models by provider', () => {
      const codexModels = agg.getModels(null, null, 'codex');
      expect(codexModels.length).toBe(1);
      expect(codexModels[0].model).toBe('gpt-6-astra');
    });
  });

  describe('provider filtering on getSessions', () => {
    it('filters sessions by provider', () => {
      const claudeSessions = agg.getSessions(null, null, null, null, 'claude');
      expect(claudeSessions.length).toBe(1);
      expect(claudeSessions[0].id).toBe('sess-claude-1');
      expect(claudeSessions[0].provider).toBe('claude');

      const codexSessions = agg.getSessions(null, null, null, null, 'codex');
      expect(codexSessions.length).toBe(1);
      expect(codexSessions[0].id).toBe('sess-codex-1');
      expect(codexSessions[0].provider).toBe('codex');

      const agSessions = agg.getSessions(null, null, null, null, 'antigravity');
      expect(agSessions.length).toBe(1);
      expect(agSessions[0].id).toBe('sess-ag-1');
      expect(agSessions[0].provider).toBe('antigravity');
    });
  });
});
