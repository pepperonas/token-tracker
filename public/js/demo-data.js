// Demo data for non-authenticated visitors in multi-user mode
// Provides realistic sample data so visitors can explore the dashboard before signing in
const DEMO_DATA = (() => {
  // Generate 15 days of data ending yesterday
  const now = new Date();
  const days = [];
  for (let i = 14; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const models = [
    { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' }
  ];

  const projects = ['my-webapp', 'api-server', 'mobile-app'];

  const toolList = [
    'Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Task', 'WebFetch',
    'WebSearch', 'NotebookEdit', 'TodoRead', 'TodoWrite'
  ];

  // --- Overview ---
  // activeDays: 12 of 15 demo days have activity (3 "off" days)
  // totalActiveMin: 14h 23m active wall-clock across the period
  // avgActiveMinPerDay: 14h 23m / 12 active days = 72 min/day avg
  const overview = {
    inputTokens: 1842560,
    outputTokens: 623480,
    cacheReadTokens: 4215890,
    cacheCreateTokens: 312450,
    inputCost: 7.38,
    outputCost: 12.47,
    cacheReadCost: 1.69,
    cacheCreateCost: 1.17,
    estimatedCost: 22.71,
    sessions: 42,
    messages: 847,
    linesAdded: 3240,
    linesRemoved: 1180,
    linesWritten: 5420,
    totalActiveMin: 863,
    avgActiveMinPerDay: 72,
    activeDays: 12,
    rateLimitHits: 4,
    providers: {
      claude: { provider: 'claude', tokens: 4994380, cost: 16.50, messages: 620, sessionsCount: 30 },
      codex: { provider: 'codex', tokens: 1200000, cost: 4.20, messages: 140, sessionsCount: 8 },
      antigravity: { provider: 'antigravity', tokens: 800000, cost: 2.01, messages: 87, sessionsCount: 4 }
    }
  };

  // --- Daily data ---
  const dailyData = days.map((date, i) => {
    const factor = 0.5 + Math.sin(i * 0.7) * 0.3 + (i / 15) * 0.3;
    const input = Math.round(120000 * factor);
    const output = Math.round(42000 * factor);
    const cacheRead = Math.round(280000 * factor);
    const cacheCreate = Math.round(21000 * factor);
    const msgs = Math.round(55 * factor);
    const sess = Math.max(1, Math.round(3 * factor));
    const cost = Math.round((input * 3 / 1e6 + output * 15 / 1e6 + cacheRead * 0.3 / 1e6 + cacheCreate * 3.75 / 1e6) * 100) / 100;
    const lW = Math.round(360 * factor);
    const lA = Math.round(220 * factor);
    const lR = Math.round(80 * factor);
    return {
      date,
      inputTokens: input,
      outputTokens: output,
      cacheReadTokens: cacheRead,
      cacheCreateTokens: cacheCreate,
      inputCost: Math.round(input * 3 / 1e6 * 100) / 100,
      outputCost: Math.round(output * 15 / 1e6 * 100) / 100,
      cacheReadCost: Math.round(cacheRead * 0.3 / 1e6 * 100) / 100,
      cacheCreateCost: Math.round(cacheCreate * 3.75 / 1e6 * 100) / 100,
      estimatedCost: cost,
      cost,
      sessions: sess,
      messages: msgs,
      linesAdded: lA,
      linesRemoved: lR,
      linesWritten: lW
    };
  });

  // --- Sessions ---
  const sessionsData = [];
  let sessionIdx = 0;
  for (const date of days) {
    const count = Math.max(1, Math.round(2 + Math.sin(sessionIdx * 0.5) * 1.5));
    for (let s = 0; s < count && sessionsData.length < 42; s++) {
      const hour = 8 + Math.floor(Math.random() * 12);
      const min = Math.floor(Math.random() * 60);
      const proj = projects[sessionIdx % projects.length];
      const model = models[sessionIdx % models.length];
      const durMin = 10 + Math.floor(Math.random() * 80);
      const msgs = 8 + Math.floor(Math.random() * 35);
      const toolCalls = Math.floor(msgs * 1.8);
      const inputT = msgs * 2200;
      const outputT = msgs * 740;
      const cacheR = msgs * 5100;
      const cacheC = msgs * 380;
      const cost = Math.round((inputT * 3 / 1e6 + outputT * 15 / 1e6 + cacheR * 0.3 / 1e6 + cacheC * 3.75 / 1e6) * 100) / 100;
      const lW = Math.round(msgs * 6.4);
      const lA = Math.round(msgs * 3.8);
      const lR = Math.round(msgs * 1.4);
      const sessId = `demo-session-${sessionIdx}`;
      sessionsData.push({
        id: sessId,
        sessionId: sessId,
        firstTs: `${date}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00.000Z`,
        lastTs: `${date}T${String(hour + Math.floor(durMin / 60)).padStart(2, '0')}:${String((min + durMin) % 60).padStart(2, '0')}:00.000Z`,
        project: proj,
        models: [model.label],
        messages: msgs,
        toolCalls,
        durationMin: durMin,
        activeMin: Math.max(1, Math.min(durMin, Math.round(msgs * 1.4))),
        inputTokens: inputT,
        outputTokens: outputT,
        cacheReadTokens: cacheR,
        cacheCreateTokens: cacheC,
        totalTokens: inputT + outputT + cacheR + cacheC,
        inputCost: Math.round(inputT * 3 / 1e6 * 100) / 100,
        outputCost: Math.round(outputT * 15 / 1e6 * 100) / 100,
        cacheReadCost: Math.round(cacheR * 0.3 / 1e6 * 100) / 100,
        cacheCreateCost: Math.round(cacheC * 3.75 / 1e6 * 100) / 100,
        cost,
        linesAdded: lA,
        linesRemoved: lR,
        linesWritten: lW
      });
      sessionIdx++;
    }
  }

  // --- Projects ---
  const projectsData = projects.map((name, i) => {
    const sess = sessionsData.filter(s => s.project === name);
    const inputT = sess.reduce((a, s) => a + s.inputTokens, 0);
    const outputT = sess.reduce((a, s) => a + s.outputTokens, 0);
    const cacheR = sess.reduce((a, s) => a + s.cacheReadTokens, 0);
    const cacheC = sess.reduce((a, s) => a + s.cacheCreateTokens, 0);
    return {
      name,
      inputTokens: inputT,
      outputTokens: outputT,
      cacheReadTokens: cacheR,
      cacheCreateTokens: cacheC,
      inputCost: Math.round(inputT * 3 / 1e6 * 100) / 100,
      outputCost: Math.round(outputT * 15 / 1e6 * 100) / 100,
      cacheReadCost: Math.round(cacheR * 0.3 / 1e6 * 100) / 100,
      cacheCreateCost: Math.round(cacheC * 3.75 / 1e6 * 100) / 100,
      cost: sess.reduce((a, s) => a + s.cost, 0),
      sessions: sess.length,
      messages: sess.reduce((a, s) => a + s.messages, 0),
      linesAdded: sess.reduce((a, s) => a + s.linesAdded, 0),
      linesRemoved: sess.reduce((a, s) => a + s.linesRemoved, 0),
      linesWritten: sess.reduce((a, s) => a + s.linesWritten, 0)
    };
  });

  // --- Models ---
  const modelsData = models.map((m, i) => {
    const sess = sessionsData.filter(s => s.models[0] === m.label);
    const inputT = sess.reduce((a, s) => a + s.inputTokens, 0);
    const outputT = sess.reduce((a, s) => a + s.outputTokens, 0);
    const cacheR = sess.reduce((a, s) => a + s.cacheReadTokens, 0);
    const cacheC = sess.reduce((a, s) => a + s.cacheCreateTokens, 0);
    return {
      model: m.id,
      label: m.label,
      inputTokens: inputT,
      outputTokens: outputT,
      cacheReadTokens: cacheR,
      cacheCreateTokens: cacheC,
      inputCost: Math.round(inputT * 3 / 1e6 * 100) / 100,
      outputCost: Math.round(outputT * 15 / 1e6 * 100) / 100,
      cacheReadCost: Math.round(cacheR * 0.3 / 1e6 * 100) / 100,
      cacheCreateCost: Math.round(cacheC * 3.75 / 1e6 * 100) / 100,
      cost: sess.reduce((a, s) => a + s.cost, 0),
      messages: sess.reduce((a, s) => a + s.messages, 0)
    };
  });

  // --- Tools ---
  const toolCounts = [320, 280, 245, 190, 155, 130, 85, 42, 28, 18, 12, 8];
  const totalToolCalls = toolCounts.reduce((a, b) => a + b, 0);
  const toolsData = toolList.map((name, i) => ({
    name,
    count: toolCounts[i] || 5,
    percentage: Math.round((toolCounts[i] || 5) / totalToolCalls * 1000) / 10
  }));

  // --- Hourly ---
  const hourlyData = Array.from({ length: 24 }, (_, h) => {
    let msgs = 0;
    if (h >= 9 && h <= 18) msgs = 30 + Math.round(Math.sin((h - 9) / 9 * Math.PI) * 40);
    else if (h >= 7 && h <= 22) msgs = 5 + Math.round(Math.random() * 10);
    const input = msgs * 2200;
    const output = msgs * 740;
    const cacheRead = msgs * 5100;
    const cacheCreate = msgs * 380;
    const cost = Math.round((input * 3 / 1e6 + output * 15 / 1e6 + cacheRead * 0.3 / 1e6 + cacheCreate * 3.75 / 1e6) * 100) / 100;
    return {
      hour: h, messages: msgs, tokens: msgs * 8200,
      inputTokens: input, outputTokens: output, cacheReadTokens: cacheRead, cacheCreateTokens: cacheCreate,
      cost,
      inputCost: Math.round(input * 3 / 1e6 * 100) / 100,
      outputCost: Math.round(output * 15 / 1e6 * 100) / 100,
      cacheReadCost: Math.round(cacheRead * 0.3 / 1e6 * 100) / 100,
      cacheCreateCost: Math.round(cacheCreate * 3.75 / 1e6 * 100) / 100,
      linesWritten: Math.round(msgs * 6.4), linesAdded: Math.round(msgs * 3.8), linesRemoved: Math.round(msgs * 1.4)
    };
  });

  // --- Daily by model ---
  const dailyByModelData = days.map(date => {
    const entry = { date };
    for (const m of models) {
      const base = m.id.includes('sonnet') ? 60000 : m.id.includes('opus') ? 40000 : 20000;
      entry[m.label] = Math.round(base * (0.7 + Math.random() * 0.6));
    }
    return entry;
  });

  // --- Daily cost breakdown ---
  const dailyCostBreakdownData = dailyData.map(d => ({
    date: d.date,
    inputCost: d.inputCost,
    outputCost: d.outputCost,
    cacheReadCost: d.cacheReadCost,
    cacheCreateCost: d.cacheCreateCost
  }));

  // --- Cumulative cost ---
  let cumCost = 0;
  const cumulativeCostData = dailyData.map(d => {
    cumCost += d.cost;
    return { date: d.date, cost: Math.round(cumCost * 100) / 100 };
  });

  // --- Day of week ---
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekData = weekdayNames.map((name, i) => {
    const isWeekday = i >= 1 && i <= 5;
    return {
      day: name,
      dayIndex: i,
      messages: isWeekday ? 100 + Math.round(Math.random() * 80) : 20 + Math.round(Math.random() * 30),
      cost: isWeekday ? 2.5 + Math.random() * 2 : 0.5 + Math.random() * 0.8
    };
  });

  // --- Hourly × weekday heatmap ---
  let hwMaxTokens = 0, hwMaxNoCache = 0, hwMaxCost = 0, hwMaxCostNoCache = 0;
  const hourlyWeekdayData = {
    weekdays: weekdayNames.map((name, di) => {
      const dayBoost = (di >= 1 && di <= 5) ? 1 : 0.35;
      return {
        dayIndex: di,
        hours: Array.from({ length: 24 }, (_, h) => {
          let msgs = 0;
          if (h >= 9 && h <= 18) msgs = 30 + Math.round(Math.sin((h - 9) / 9 * Math.PI) * 40);
          else if (h >= 7 && h <= 22) msgs = 5 + Math.round(Math.random() * 10);
          msgs = Math.round(msgs * dayBoost);
          const input = msgs * 2200, output = msgs * 740;
          const noCache = input + output;
          const tokens = msgs * 8200;
          if (tokens > hwMaxTokens) hwMaxTokens = tokens;
          if (noCache > hwMaxNoCache) hwMaxNoCache = noCache;
          const costNoCache = Math.round((input * 3 / 1e6 + output * 15 / 1e6) * 100) / 100;
          const cost = Math.round((input * 3 / 1e6 + output * 15 / 1e6 + msgs * 5100 * 0.3 / 1e6 + msgs * 380 * 3.75 / 1e6) * 100) / 100;
          if (cost > hwMaxCost) hwMaxCost = cost;
          if (costNoCache > hwMaxCostNoCache) hwMaxCostNoCache = costNoCache;
          return { hour: h, tokens, tokensNoCache: noCache, messages: msgs, cost, costNoCache };
        })
      };
    }),
    maxTokens: 0, maxTokensNoCache: 0, maxCost: 0, maxCostNoCache: 0
  };
  hourlyWeekdayData.maxTokens = hwMaxTokens;
  hourlyWeekdayData.maxTokensNoCache = hwMaxNoCache;
  hourlyWeekdayData.maxCost = hwMaxCost;
  hourlyWeekdayData.maxCostNoCache = hwMaxCostNoCache;

  // --- Cache efficiency ---
  const cacheEfficiencyData = dailyData.map(d => {
    const total = d.inputTokens + d.cacheReadTokens + d.cacheCreateTokens;
    return {
      date: d.date,
      cacheHitRate: total > 0 ? Math.round(d.cacheReadTokens / total * 1000) / 10 : 0
    };
  });

  // --- Stop reasons ---
  const stopReasonsData = [
    { reason: 'end_turn', count: 520, percentage: 61.4 },
    { reason: 'tool_use', count: 295, percentage: 34.8 },
    { reason: 'max_tokens', count: 32, percentage: 3.8 }
  ];

  // --- Session efficiency ---
  const sessionEfficiencyData = sessionsData.map(s => ({
    sessionId: s.sessionId,
    project: s.project,
    tokensPerMessage: Math.round((s.inputTokens + s.outputTokens) / s.messages),
    costPerMessage: Math.round(s.cost / s.messages * 100) / 100,
    messages: s.messages
  }));

  // --- Active sessions (empty for demo — no live sessions) ---
  const activeSessionsData = [];

  // --- Achievements (full active catalogue; illustrative unlocks) ---
  // Compact definition: [key, category, tier, emoji]
  const achDefs = [
    ["tokens_1k", "tokens", "bronze", "🔤"],
    ["tokens_10k", "tokens", "bronze", "📝"],
    ["tokens_100k", "tokens", "silver", "🔍"],
    ["tokens_500k", "tokens", "silver", "🎯"],
    ["tokens_1m", "tokens", "gold", "💰"],
    ["tokens_5m", "tokens", "gold", "💪"],
    ["tokens_10m", "tokens", "platinum", "🏔️"],
    ["tokens_50m", "tokens", "platinum", "🌋"],
    ["tokens_100m", "tokens", "diamond", "🏆"],
    ["tokens_500m", "tokens", "diamond", "👑"],
    ["sessions_1", "sessions", "bronze", "🚀"],
    ["sessions_5", "sessions", "bronze", "🎮"],
    ["sessions_10", "sessions", "silver", "📅"],
    ["sessions_25", "sessions", "silver", "🎪"],
    ["sessions_50", "sessions", "gold", "⭐"],
    ["sessions_100", "sessions", "gold", "💯"],
    ["sessions_250", "sessions", "platinum", "⚡"],
    ["sessions_500", "sessions", "diamond", "🏅"],
    ["messages_10", "messages", "bronze", "💬"],
    ["messages_50", "messages", "bronze", "🗨️"],
    ["messages_100", "messages", "silver", "📨"],
    ["messages_500", "messages", "silver", "📫"],
    ["messages_1k", "messages", "gold", "📬"],
    ["messages_5k", "messages", "gold", "📮"],
    ["messages_10k", "messages", "platinum", "🎖️"],
    ["messages_50k", "messages", "diamond", "🌟"],
    ["cost_1", "cost", "bronze", "💵"],
    ["cost_5", "cost", "bronze", "💶"],
    ["cost_10", "cost", "silver", "💷"],
    ["cost_25", "cost", "silver", "💴"],
    ["cost_50", "cost", "gold", "💰"],
    ["cost_100", "cost", "gold", "🤑"],
    ["cost_250", "cost", "platinum", "💎"],
    ["cost_500", "cost", "diamond", "🏦"],
    ["lines_written_100", "lines", "bronze", "✏️"],
    ["lines_written_1k", "lines", "silver", "📝"],
    ["lines_written_10k", "lines", "gold", "📄"],
    ["lines_written_50k", "lines", "platinum", "📚"],
    ["lines_edited_100", "lines", "bronze", "✂️"],
    ["lines_edited_1k", "lines", "silver", "🔧"],
    ["lines_edited_10k", "lines", "gold", "⚙️"],
    ["lines_deleted_100", "lines", "bronze", "🗑️"],
    ["lines_deleted_1k", "lines", "silver", "💥"],
    ["lines_deleted_10k", "lines", "gold", "🧹"],
    ["lines_net_1k", "lines", "silver", "📈"],
    ["lines_net_10k", "lines", "gold", "🚀"],
    ["model_sonnet", "models", "bronze", "🎵"],
    ["model_opus", "models", "bronze", "🎭"],
    ["model_haiku", "models", "bronze", "🌸"],
    ["model_diversity_2", "models", "silver", "🎨"],
    ["model_diversity_3", "models", "gold", "🌈"],
    ["model_diversity_4", "models", "platinum", "🪄"],
    ["model_sonnet_1k", "models", "silver", "🎶"],
    ["model_opus_1k", "models", "gold", "🎼"],
    ["model_opus_100", "models", "silver", "🎻"],
    ["model_haiku_100", "models", "silver", "🍃"],
    ["tool_read", "tools", "bronze", "📖"],
    ["tool_write", "tools", "bronze", "✍️"],
    ["tool_edit", "tools", "bronze", "🖊️"],
    ["tool_bash", "tools", "bronze", "💻"],
    ["tool_grep", "tools", "bronze", "🔎"],
    ["tool_glob", "tools", "bronze", "📁"],
    ["tool_diversity_5", "tools", "silver", "🔨"],
    ["tool_diversity_10", "tools", "gold", "🧰"],
    ["tool_diversity_15", "tools", "platinum", "🛠️"],
    ["tool_1k_calls", "tools", "silver", "⚡"],
    ["tool_10k_calls", "tools", "gold", "🔌"],
    ["tool_50k_calls", "tools", "platinum", "⚙️"],
    ["early_bird_1", "time", "bronze", "🐦"],
    ["early_bird_10", "time", "silver", "🌅"],
    ["night_owl_1", "time", "bronze", "🦉"],
    ["night_owl_10", "time", "silver", "🌙"],
    ["marathon_1", "time", "silver", "🏃"],
    ["marathon_5", "time", "gold", "🏃‍♂️"],
    ["marathon_10", "time", "platinum", "🥇"],
    ["peak_50_msgs", "time", "silver", "📊"],
    ["peak_100_msgs", "time", "gold", "🔥"],
    ["peak_200_msgs", "time", "platinum", "🌡️"],
    ["project_1", "projects", "bronze", "📂"],
    ["project_3", "projects", "silver", "📁"],
    ["project_5", "projects", "gold", "🗂️"],
    ["project_10", "projects", "platinum", "🏢"],
    ["project_15", "projects", "diamond", "🏗️"],
    ["project_20", "projects", "diamond", "🌆"],
    ["streak_3", "streaks", "bronze", "🔥"],
    ["streak_7", "streaks", "silver", "🗓️"],
    ["streak_14", "streaks", "gold", "📆"],
    ["streak_30", "streaks", "platinum", "🏆"],
    ["streak_60", "streaks", "diamond", "💎"],
    ["active_days_7", "streaks", "bronze", "📅"],
    ["active_days_30", "streaks", "silver", "🗓️"],
    ["active_days_100", "streaks", "gold", "🎯"],
    ["cache_rate_50", "cache", "silver", "💾"],
    ["cache_rate_70", "cache", "gold", "🗄️"],
    ["cache_rate_80", "cache", "platinum", "🏎️"],
    ["cache_rate_90", "cache", "diamond", "⚡"],
    ["holiday_coding", "special", "silver", "🎄"],
    ["palindrome_date", "special", "gold", "🔄"],
    ["weekend_warrior", "special", "bronze", "⚔️"],
    ["all_hours", "special", "platinum", "🕐"],
    ["tokens_1b", "tokens", "diamond", "🌌"],
    ["output_1m", "tokens", "gold", "📤"],
    ["output_5m", "tokens", "platinum", "📦"],
    ["output_10m", "tokens", "platinum", "🛸"],
    ["output_50m", "tokens", "diamond", "💫"],
    ["output_100m", "tokens", "diamond", "🌠"],
    ["input_10m", "tokens", "gold", "📥"],
    ["input_50m", "tokens", "diamond", "📨"],
    ["input_100m", "tokens", "diamond", "📩"],
    ["input_500m", "tokens", "diamond", "🎯"],
    ["cache_tokens_10m", "tokens", "gold", "💾"],
    ["cache_tokens_100m", "tokens", "diamond", "🗄️"],
    ["sessions_750", "sessions", "diamond", "🏅"],
    ["sessions_1k", "sessions", "diamond", "👑"],
    ["sessions_2k", "sessions", "diamond", "🔱"],
    ["sessions_5k", "sessions", "diamond", "🌠"],
    ["sessions_10k", "sessions", "diamond", "🌌"],
    ["session_longest_4h", "sessions", "gold", "⏰"],
    ["session_longest_8h", "sessions", "platinum", "⏱️"],
    ["session_longest_12h", "sessions", "diamond", "🕰️"],
    ["session_max_200_msgs", "sessions", "platinum", "🗣️"],
    ["session_max_500_msgs", "sessions", "diamond", "📢"],
    ["messages_100k", "messages", "diamond", "📬"],
    ["messages_250k", "messages", "diamond", "📮"],
    ["messages_500k", "messages", "diamond", "💌"],
    ["messages_1m", "messages", "diamond", "✉️"],
    ["avg_msgs_session_20", "messages", "gold", "📊"],
    ["avg_msgs_session_50", "messages", "platinum", "📈"],
    ["avg_msgs_session_100", "messages", "diamond", "🎯"],
    ["cost_750", "cost", "diamond", "💰"],
    ["cost_1000", "cost", "diamond", "💸"],
    ["cost_2500", "cost", "diamond", "🤑"],
    ["cost_5000", "cost", "diamond", "🏦"],
    ["cost_10000", "cost", "diamond", "🏛️"],
    ["cost_day_10", "cost", "gold", "📈"],
    ["cost_day_25", "cost", "platinum", "📊"],
    ["cost_day_50", "cost", "diamond", "💹"],
    ["cost_day_100", "cost", "diamond", "🏧"],
    ["cost_session_10", "cost", "gold", "💳"],
    ["cost_session_50", "cost", "diamond", "💎"],
    ["lines_written_100k", "lines", "platinum", "📜"],
    ["lines_written_250k", "lines", "diamond", "📋"],
    ["lines_written_500k", "lines", "diamond", "🗞️"],
    ["lines_written_1m", "lines", "diamond", "📚"],
    ["lines_edited_50k", "lines", "platinum", "✏️"],
    ["lines_edited_100k", "lines", "diamond", "🖊️"],
    ["lines_deleted_50k", "lines", "platinum", "🗑️"],
    ["lines_deleted_100k", "lines", "diamond", "♻️"],
    ["lines_net_50k", "lines", "platinum", "📈"],
    ["lines_net_100k", "lines", "diamond", "🏗️"],
    ["lines_net_250k", "lines", "diamond", "🌆"],
    ["lines_day_1k", "lines", "gold", "⚡"],
    ["lines_day_5k", "lines", "platinum", "🌩️"],
    ["lines_day_10k", "lines", "diamond", "🌋"],
    ["lines_day_25k", "lines", "diamond", "🔥"],
    ["model_sonnet_5k", "models", "gold", "🎵"],
    ["model_sonnet_10k", "models", "platinum", "🎶"],
    ["model_opus_5k", "models", "platinum", "🎭"],
    ["model_opus_10k", "models", "diamond", "🎻"],
    ["model_haiku_1k", "models", "gold", "🌸"],
    ["model_haiku_5k", "models", "platinum", "🌺"],
    ["model_diversity_5", "models", "diamond", "🎨"],
    ["tool_diversity_20", "tools", "diamond", "🧰"],
    ["tool_100k_calls", "tools", "diamond", "⚙️"],
    ["tool_250k_calls", "tools", "diamond", "🔧"],
    ["tool_500k_calls", "tools", "diamond", "🛠️"],
    ["tool_bash_1k", "tools", "gold", "💻"],
    ["tool_bash_10k", "tools", "platinum", "🖥️"],
    ["tool_bash_50k", "tools", "diamond", "⌨️"],
    ["tool_read_10k", "tools", "gold", "📖"],
    ["tool_read_50k", "tools", "platinum", "📗"],
    ["tool_edit_10k", "tools", "gold", "🔏"],
    ["tool_edit_50k", "tools", "platinum", "📐"],
    ["tool_write_10k", "tools", "gold", "📝"],
    ["tool_write_50k", "tools", "diamond", "📘"],
    ["tool_grep_10k", "tools", "gold", "🔍"],
    ["tool_glob_10k", "tools", "diamond", "🗺️"],
    ["tool_task_1k", "tools", "gold", "📋"],
    ["early_bird_50", "time", "gold", "🌅"],
    ["early_bird_100", "time", "platinum", "🌄"],
    ["early_bird_500", "time", "diamond", "☀️"],
    ["night_owl_50", "time", "gold", "🌙"],
    ["night_owl_100", "time", "platinum", "🌑"],
    ["night_owl_500", "time", "diamond", "🦇"],
    ["marathon_25", "time", "platinum", "🏃"],
    ["marathon_50", "time", "diamond", "🏋️"],
    ["marathon_100", "time", "diamond", "🦾"],
    ["marathon_4h", "time", "gold", "⏰"],
    ["marathon_4h_10", "time", "platinum", "⏱️"],
    ["marathon_8h", "time", "diamond", "🕐"],
    ["peak_300_msgs", "time", "platinum", "📊"],
    ["peak_500_msgs", "time", "diamond", "💥"],
    ["peak_1000_msgs", "time", "diamond", "☄️"],
    ["peak_tokens_1m", "time", "platinum", "🌡️"],
    ["peak_tokens_5m", "time", "diamond", "🫠"],
    ["project_25", "projects", "diamond", "🏘️"],
    ["project_50", "projects", "diamond", "🌇"],
    ["project_75", "projects", "diamond", "🌃"],
    ["project_100", "projects", "diamond", "🌍"],
    ["streak_90", "streaks", "diamond", "🔥"],
    ["streak_120", "streaks", "diamond", "🌟"],
    ["streak_180", "streaks", "diamond", "💫"],
    ["streak_365", "streaks", "diamond", "⭐"],
    ["active_days_200", "streaks", "platinum", "📆"],
    ["active_days_365", "streaks", "diamond", "🗓️"],
    ["active_days_500", "streaks", "diamond", "📅"],
    ["active_days_730", "streaks", "diamond", "🎯"],
    ["active_days_1000", "streaks", "diamond", "🏆"],
    ["months_active_6", "streaks", "gold", "📅"],
    ["months_active_12", "streaks", "platinum", "📆"],
    ["months_active_24", "streaks", "diamond", "🗓️"],
    ["months_active_36", "streaks", "diamond", "🏛️"],
    ["cache_rate_95", "cache", "diamond", "🏎️"],
    ["cache_rate_99", "cache", "diamond", "🚀"],
    ["cache_tokens_50m", "cache", "platinum", "💽"],
    ["cache_tokens_500m", "cache", "diamond", "🖲️"],
    ["new_years_coding", "special", "gold", "🎆"],
    ["friday_13th", "special", "gold", "🔮"],
    ["leap_day", "special", "diamond", "🦘"],
    ["pi_day", "special", "gold", "🥧"],
    ["star_wars_day", "special", "gold", "⚔️"],
    ["summer_solstice", "special", "gold", "☀️"],
    ["halloween_night", "special", "platinum", "🎃"],
    ["christmas_coding", "special", "gold", "🎁"],
    ["new_years_eve", "special", "gold", "🎇"],
    ["midnight_marathon", "special", "gold", "🌓"],
    ["full_weekend_5", "special", "gold", "🏖️"],
    ["full_weekend_10", "special", "platinum", "⛱️"],
    ["full_weekend_25", "special", "diamond", "🏝️"],
    ["full_weekend_52", "special", "diamond", "🌴"],
    ["sunday_coder_10", "special", "silver", "☕"],
    ["consec_weekends_4", "special", "platinum", "🎪"],
    ["consec_weekends_8", "special", "diamond", "🎡"],
    ["tokens_session_1m", "special", "platinum", "💎"],
    ["tokens_session_5m", "special", "diamond", "🌟"],
    ["tokens_session_10m", "special", "diamond", "✨"],
    ["multi_proj_day_3", "special", "gold", "🔀"],
    ["multi_proj_day_5", "special", "platinum", "🔄"],
    ["multi_proj_day_10", "special", "diamond", "🌀"],
    ["century_session", "special", "gold", "💯"],
    ["output_ratio_60", "special", "gold", "📤"],
    ["all_weekdays", "special", "gold", "📅"],
    ["triple_model_day", "special", "platinum", "🎨"],
    ["dawn_dusk_session", "special", "gold", "🌗"],
    ["efficiency_master", "special", "gold", "🎯"],
    ["big_session_cost_25", "special", "platinum", "💰"],
    ["lines_session_1k", "special", "gold", "📑"],
    ["lines_session_5k", "special", "platinum", "📗"],
    ["millennium", "special", "diamond", "🏆"],
    ["tokens_2b", "tokens", "diamond", "🌌"],
    ["tokens_5b", "tokens", "diamond", "🔮"],
    ["tokens_10b", "tokens", "diamond", "💎"],
    ["output_250m", "tokens", "diamond", "📤"],
    ["output_500m", "tokens", "diamond", "🚀"],
    ["output_1b", "tokens", "diamond", "🌟"],
    ["output_2b", "tokens", "diamond", "✨"],
    ["input_1b", "tokens", "diamond", "📥"],
    ["input_2b", "tokens", "diamond", "📩"],
    ["input_5b", "tokens", "diamond", "🎯"],
    ["cache_read_1b", "tokens", "diamond", "💾"],
    ["cache_read_2b", "tokens", "diamond", "🗄️"],
    ["cache_read_5b", "tokens", "diamond", "🏦"],
    ["output_ratio_70", "tokens", "platinum", "📊"],
    ["output_ratio_80", "tokens", "diamond", "📈"],
    ["tokens_per_msg_10k", "tokens", "gold", "📝"],
    ["tokens_per_msg_25k", "tokens", "platinum", "📄"],
    ["tokens_per_msg_50k", "tokens", "diamond", "📚"],
    ["avg_tokens_day_1m", "tokens", "gold", "🔢"],
    ["avg_tokens_day_10m", "tokens", "diamond", "🧮"],
    ["sessions_15k", "sessions", "diamond", "🏅"],
    ["sessions_20k", "sessions", "diamond", "👑"],
    ["sessions_50k", "sessions", "diamond", "🔱"],
    ["sessions_100k", "sessions", "diamond", "🌠"],
    ["session_longest_16h", "sessions", "diamond", "⏰"],
    ["session_longest_24h", "sessions", "diamond", "⏱️"],
    ["session_max_1k_msgs", "sessions", "diamond", "🗣️"],
    ["session_max_2k_msgs", "sessions", "diamond", "📢"],
    ["session_cost_100", "sessions", "diamond", "💰"],
    ["session_cost_250", "sessions", "diamond", "💸"],
    ["session_cost_500", "sessions", "diamond", "🤑"],
    ["session_tokens_25m", "sessions", "diamond", "🧮"],
    ["session_tokens_50m", "sessions", "diamond", "📟"],
    ["sessions_100_msgs_10", "sessions", "platinum", "🎖️"],
    ["sessions_100_msgs_50", "sessions", "diamond", "🏆"],
    ["sessions_100_msgs_100", "sessions", "diamond", "👑"],
    ["total_hours_500", "sessions", "platinum", "⏳"],
    ["total_hours_2k", "sessions", "diamond", "⌛"],
    ["total_hours_10k", "sessions", "diamond", "🕰️"],
    ["messages_2m", "messages", "diamond", "💬"],
    ["messages_5m", "messages", "diamond", "🗨️"],
    ["messages_10m", "messages", "diamond", "📨"],
    ["avg_msgs_session_150", "messages", "diamond", "📊"],
    ["avg_msgs_session_200", "messages", "diamond", "📈"],
    ["avg_msgs_day_50", "messages", "gold", "📬"],
    ["avg_msgs_day_100", "messages", "platinum", "📮"],
    ["avg_msgs_day_250", "messages", "diamond", "💌"],
    ["avg_msgs_day_500", "messages", "diamond", "✉️"],
    ["days_100_msgs_10", "messages", "platinum", "🔥"],
    ["days_100_msgs_50", "messages", "diamond", "🌡️"],
    ["days_100_msgs_100", "messages", "diamond", "☄️"],
    ["days_500_msgs_5", "messages", "diamond", "🌋"],
    ["days_500_msgs_10", "messages", "diamond", "🏔️"],
    ["days_500_msgs_25", "messages", "diamond", "🗻"],
    ["cost_15k", "cost", "diamond", "💵"],
    ["cost_25k", "cost", "diamond", "💶"],
    ["cost_50k", "cost", "diamond", "💷"],
    ["cost_100k", "cost", "diamond", "💴"],
    ["cost_day_250", "cost", "diamond", "📈"],
    ["cost_day_500", "cost", "diamond", "📊"],
    ["cost_day_1k", "cost", "diamond", "💹"],
    ["cost_session_1k", "cost", "diamond", "🏛️"],
    ["avg_cost_session_5", "cost", "gold", "💲"],
    ["avg_cost_session_10", "cost", "platinum", "💰"],
    ["avg_cost_session_25", "cost", "diamond", "💸"],
    ["avg_cost_session_50", "cost", "diamond", "🤑"],
    ["avg_cost_day_10", "cost", "gold", "📅"],
    ["avg_cost_day_25", "cost", "platinum", "📆"],
    ["avg_cost_day_50", "cost", "diamond", "🗓️"],
    ["days_50_cost_10", "cost", "platinum", "🔥"],
    ["days_50_cost_100", "cost", "diamond", "🌋"],
    ["lines_written_2m", "lines", "diamond", "📜"],
    ["lines_written_5m", "lines", "diamond", "📋"],
    ["lines_written_10m", "lines", "diamond", "🗞️"],
    ["lines_edited_250k", "lines", "diamond", "✏️"],
    ["lines_edited_500k", "lines", "diamond", "🖊️"],
    ["lines_edited_1m", "lines", "diamond", "🔧"],
    ["lines_deleted_250k", "lines", "diamond", "🗑️"],
    ["lines_deleted_500k", "lines", "diamond", "💥"],
    ["lines_deleted_1m", "lines", "diamond", "🧹"],
    ["lines_net_500k", "lines", "diamond", "📈"],
    ["lines_net_1m", "lines", "diamond", "🚀"],
    ["lines_net_5m", "lines", "diamond", "🌆"],
    ["lines_day_50k", "lines", "diamond", "⚡"],
    ["lines_day_100k", "lines", "diamond", "🌩️"],
    ["lines_session_10k", "lines", "platinum", "📑"],
    ["lines_session_25k", "lines", "diamond", "📗"],
    ["lines_session_50k", "lines", "diamond", "📕"],
    ["lines_session_100k", "lines", "diamond", "📘"],
    ["avg_lines_session_500", "lines", "gold", "📊"],
    ["avg_lines_session_1k", "lines", "platinum", "📈"],
    ["avg_lines_session_2k", "lines", "diamond", "📉"],
    ["avg_lines_session_5k", "lines", "diamond", "📋"],
    ["days_1k_lines_10", "lines", "platinum", "🔥"],
    ["days_1k_lines_50", "lines", "diamond", "🌡️"],
    ["days_1k_lines_100", "lines", "diamond", "☄️"],
    ["model_diversity_6", "models", "diamond", "🎨"],
    ["model_sonnet_25k", "models", "diamond", "🎵"],
    ["model_sonnet_50k", "models", "diamond", "🎶"],
    ["model_sonnet_100k", "models", "diamond", "🎼"],
    ["model_opus_25k", "models", "diamond", "🎭"],
    ["model_opus_50k", "models", "diamond", "🎻"],
    ["model_opus_100k", "models", "diamond", "🎺"],
    ["model_haiku_10k", "models", "platinum", "🌸"],
    ["model_haiku_25k", "models", "diamond", "🌺"],
    ["model_haiku_50k", "models", "diamond", "🍃"],
    ["triple_model_day_10", "models", "platinum", "🌈"],
    ["triple_model_day_50", "models", "diamond", "🪄"],
    ["model_opus_majority", "models", "diamond", "👑"],
    ["model_sonnet_majority", "models", "platinum", "🎯"],
    ["model_haiku_majority", "models", "platinum", "🍂"],
    ["tool_diversity_25", "tools", "diamond", "🧰"],
    ["tool_diversity_30", "tools", "diamond", "🛠️"],
    ["tool_1m_calls", "tools", "diamond", "⚡"],
    ["tool_2m_calls", "tools", "diamond", "🔌"],
    ["tool_5m_calls", "tools", "diamond", "⚙️"],
    ["tool_bash_100k", "tools", "diamond", "💻"],
    ["tool_bash_250k", "tools", "diamond", "🖥️"],
    ["tool_bash_500k", "tools", "diamond", "⌨️"],
    ["tool_read_100k", "tools", "diamond", "📖"],
    ["tool_read_250k", "tools", "diamond", "📗"],
    ["tool_read_500k", "tools", "diamond", "📚"],
    ["tool_edit_100k", "tools", "diamond", "🔏"],
    ["tool_edit_250k", "tools", "diamond", "📐"],
    ["tool_edit_500k", "tools", "diamond", "✂️"],
    ["tool_write_100k", "tools", "diamond", "📝"],
    ["tool_write_250k", "tools", "diamond", "📘"],
    ["tool_grep_50k", "tools", "diamond", "🔍"],
    ["tool_grep_100k", "tools", "diamond", "🔎"],
    ["tool_grep_250k", "tools", "diamond", "🧐"],
    ["tool_glob_50k", "tools", "diamond", "📁"],
    ["tool_glob_100k", "tools", "diamond", "🗺️"],
    ["tool_task_5k", "tools", "platinum", "📋"],
    ["tool_task_10k", "tools", "diamond", "📌"],
    ["tool_task_25k", "tools", "diamond", "📎"],
    ["tool_task_50k", "tools", "diamond", "🗂️"],
    ["early_bird_1000", "time", "diamond", "🌅"],
    ["night_owl_1000", "time", "diamond", "🌙"],
    ["marathon_200", "time", "diamond", "🏃"],
    ["marathon_500", "time", "diamond", "🏋️"],
    ["marathon_8h_10", "time", "diamond", "🕐"],
    ["marathon_8h_25", "time", "diamond", "🕑"],
    ["marathon_8h_50", "time", "diamond", "🕒"],
    ["marathon_12h_5", "time", "diamond", "🕓"],
    ["marathon_12h_10", "time", "diamond", "🕔"],
    ["marathon_12h_25", "time", "diamond", "🕕"],
    ["marathon_16h_1", "time", "diamond", "🕖"],
    ["marathon_16h_5", "time", "diamond", "🕗"],
    ["peak_2000_msgs", "time", "diamond", "📊"],
    ["peak_5000_msgs", "time", "diamond", "💥"],
    ["peak_tokens_10m", "time", "diamond", "🌡️"],
    ["peak_tokens_25m", "time", "diamond", "🫠"],
    ["peak_tokens_50m", "time", "diamond", "🔥"],
    ["weekend_sessions_100", "time", "platinum", "🏖️"],
    ["weekend_sessions_500", "time", "diamond", "⛱️"],
    ["max_sessions_day_10", "time", "gold", "📅"],
    ["max_sessions_day_25", "time", "platinum", "📆"],
    ["max_sessions_day_50", "time", "diamond", "🗓️"],
    ["consec_months_6", "time", "gold", "📅"],
    ["consec_months_12", "time", "platinum", "📆"],
    ["consec_months_24", "time", "diamond", "🗓️"],
    ["project_150", "projects", "diamond", "🏘️"],
    ["project_200", "projects", "diamond", "🌇"],
    ["project_300", "projects", "diamond", "🌃"],
    ["project_500", "projects", "diamond", "🌍"],
    ["proj_sessions_100", "projects", "platinum", "📂"],
    ["proj_sessions_250", "projects", "diamond", "📁"],
    ["proj_sessions_500", "projects", "diamond", "🗂️"],
    ["proj_sessions_1k", "projects", "diamond", "🏢"],
    ["proj_msgs_1k", "projects", "gold", "💬"],
    ["proj_msgs_5k", "projects", "platinum", "🗨️"],
    ["proj_msgs_10k", "projects", "diamond", "📨"],
    ["proj_msgs_50k", "projects", "diamond", "📬"],
    ["proj_cost_100", "projects", "gold", "💰"],
    ["proj_cost_500", "projects", "platinum", "💸"],
    ["proj_cost_1k", "projects", "diamond", "🤑"],
    ["proj_cost_5k", "projects", "diamond", "🏦"],
    ["proj_tokens_10m", "projects", "platinum", "🔢"],
    ["proj_tokens_50m", "projects", "diamond", "🧮"],
    ["proj_tokens_100m", "projects", "diamond", "📟"],
    ["multi_proj_day_15", "projects", "diamond", "🔀"],
    ["streak_500", "streaks", "diamond", "🔥"],
    ["streak_730", "streaks", "diamond", "🌟"],
    ["streak_1000", "streaks", "diamond", "💫"],
    ["streak_1500", "streaks", "diamond", "⭐"],
    ["active_days_1500", "streaks", "diamond", "📆"],
    ["active_days_2000", "streaks", "diamond", "📅"],
    ["active_days_2500", "streaks", "diamond", "🗓️"],
    ["active_days_3650", "streaks", "diamond", "🎯"],
    ["months_active_48", "streaks", "diamond", "📅"],
    ["months_active_60", "streaks", "diamond", "🏛️"],
    ["weeks_active_50", "streaks", "gold", "📅"],
    ["weeks_active_100", "streaks", "diamond", "📆"],
    ["weeks_active_150", "streaks", "diamond", "🗓️"],
    ["weeks_active_200", "streaks", "diamond", "🎯"],
    ["consec_months_active_36", "streaks", "diamond", "🔐"],
    ["days_5_sessions_25", "streaks", "diamond", "📊"],
    ["cache_tokens_10b", "cache", "diamond", "💽"],
    ["cache_and_tokens_100m", "cache", "platinum", "🏎️"],
    ["cache_and_tokens_500m", "cache", "diamond", "🚀"],
    ["cache_and_tokens_1b", "cache", "diamond", "⚡"],
    ["cache_and_sessions_1k", "cache", "diamond", "🔧"],
    ["cache_and_cost_1k", "cache", "diamond", "💰"],
    ["cache_master_90_100d", "cache", "diamond", "🏅"],
    ["cache_king_95_365d", "cache", "diamond", "👑"],
    ["cache_and_msgs_100k", "cache", "diamond", "💬"],
    ["cache_and_msgs_500k", "cache", "diamond", "🗨️"],
    ["cache_and_projects_50", "cache", "diamond", "📂"],
    ["cache_emperor", "cache", "diamond", "🏆"],
    ["full_weekend_100", "special", "diamond", "🏖️"],
    ["full_weekend_200", "special", "diamond", "⛱️"],
    ["consec_weekends_12", "special", "diamond", "🎪"],
    ["consec_weekends_26", "special", "diamond", "🎡"],
    ["consec_weekends_52", "special", "diamond", "🎢"],
    ["sunday_coder_50", "special", "gold", "☕"],
    ["sunday_coder_100", "special", "platinum", "🍵"],
    ["sunday_coder_200", "special", "diamond", "🫖"],
    ["veteran_1y", "special", "diamond", "🎖️"],
    ["veteran_2y", "special", "diamond", "🏛️"],
    ["grandmaster", "special", "diamond", "♟️"],
    ["unstoppable", "special", "diamond", "🦾"],
    ["diverse_master", "special", "diamond", "🌐"],
    ["code_factory", "special", "diamond", "🏭"],
    ["token_billionaire", "special", "diamond", "🤴"],
    ["marathon_lord", "special", "diamond", "👸"],
    ["night_lord", "special", "diamond", "🧛"],
    ["early_riser_elite", "special", "diamond", "🐓"],
    ["project_empire", "special", "diamond", "🌆"],
    ["infinity_coder", "special", "diamond", "♾️"],
    ["the_machine", "special", "diamond", "🤖"],
    ["all_rounder", "special", "diamond", "🎪"],
    ["opus_elite", "special", "diamond", "🎭"],
    ["model_master", "special", "diamond", "🎨"],
    ["proj_above_100s_3", "special", "diamond", "🏗️"],
    ["multi_proj_day_20", "special", "diamond", "🔄"],
    ["sessions_500_msgs_5", "special", "diamond", "🌪️"],
    ["cache_create_1m", "tokens", "gold", "🏗️"],
    ["cache_create_10m", "tokens", "platinum", "🧱"],
    ["cache_create_50m", "tokens", "diamond", "🏰"],
    ["cache_create_100m", "tokens", "diamond", "🏯"],
    ["cache_create_500m", "tokens", "diamond", "🗼"],
    ["avg_tokens_day_25m", "tokens", "diamond", "🔢"],
    ["avg_tokens_day_50m", "tokens", "diamond", "🧮"],
    ["tokens_per_msg_100k", "tokens", "diamond", "📄"],
    ["tokens_25b", "tokens", "diamond", "🪐"],
    ["tokens_50b", "tokens", "diamond", "🌍"],
    ["output_5b", "tokens", "diamond", "📡"],
    ["input_10b", "tokens", "diamond", "📻"],
    ["days_1m_tokens_10", "tokens", "platinum", "🌡️"],
    ["days_1m_tokens_50", "tokens", "diamond", "🔥"],
    ["days_1m_tokens_100", "tokens", "diamond", "☄️"],
    ["avg_session_dur_30", "sessions", "silver", "⏱️"],
    ["avg_session_dur_60", "sessions", "gold", "⏰"],
    ["avg_session_dur_120", "sessions", "platinum", "🕰️"],
    ["avg_session_dur_240", "sessions", "diamond", "🕐"],
    ["short_sessions_10", "sessions", "bronze", "⚡"],
    ["short_sessions_50", "sessions", "silver", "🏎️"],
    ["short_sessions_100", "sessions", "gold", "💨"],
    ["short_sessions_500", "sessions", "platinum", "🚀"],
    ["sessions_per_day_3", "sessions", "silver", "📊"],
    ["sessions_per_day_5", "sessions", "gold", "📈"],
    ["sessions_per_day_10", "sessions", "platinum", "📉"],
    ["sessions_per_day_20", "sessions", "diamond", "🎢"],
    ["days_10_sessions_5", "sessions", "gold", "📅"],
    ["days_10_sessions_25", "sessions", "platinum", "📆"],
    ["days_10_sessions_100", "sessions", "diamond", "🗓️"],
    ["avg_msgs_day_200", "messages", "platinum", "📬"],
    ["avg_msgs_day_400", "messages", "diamond", "📮"],
    ["avg_msgs_day_750", "messages", "diamond", "💌"],
    ["avg_msgs_day_1k", "messages", "diamond", "✉️"],
    ["days_2k_msgs_1", "messages", "platinum", "🔥"],
    ["days_2k_msgs_5", "messages", "diamond", "🌡️"],
    ["days_2k_msgs_25", "messages", "diamond", "☄️"],
    ["busiest_month_5k", "messages", "gold", "📅"],
    ["busiest_month_10k", "messages", "platinum", "📆"],
    ["busiest_month_25k", "messages", "diamond", "🗓️"],
    ["busiest_month_50k", "messages", "diamond", "🏆"],
    ["messages_20k", "messages", "platinum", "📨"],
    ["messages_25k", "messages", "platinum", "📩"],
    ["messages_30k", "messages", "platinum", "📫"],
    ["messages_75k", "messages", "diamond", "📪"],
    ["cost_1500", "cost", "diamond", "💵"],
    ["cost_2000", "cost", "diamond", "💶"],
    ["cost_3000", "cost", "diamond", "💷"],
    ["cost_7500", "cost", "diamond", "💴"],
    ["avg_cost_msg_01", "cost", "silver", "💲"],
    ["avg_cost_msg_05", "cost", "gold", "💰"],
    ["avg_cost_msg_10", "cost", "platinum", "💸"],
    ["avg_cost_msg_25", "cost", "diamond", "🤑"],
    ["cost_per_line_001", "cost", "silver", "📝"],
    ["cost_per_line_005", "cost", "gold", "📄"],
    ["cost_per_line_01", "cost", "platinum", "📃"],
    ["cost_session_1500", "cost", "diamond", "🏦"],
    ["cost_day_150", "cost", "diamond", "📊"],
    ["cost_day_200", "cost", "diamond", "📈"],
    ["avg_cost_day_100", "cost", "diamond", "💹"],
    ["deletion_ratio_20", "lines", "silver", "🧹"],
    ["deletion_ratio_40", "lines", "gold", "🗑️"],
    ["deletion_ratio_60", "lines", "platinum", "♻️"],
    ["deletion_ratio_80", "lines", "diamond", "💥"],
    ["lines_per_msg_5", "lines", "silver", "📝"],
    ["lines_per_msg_10", "lines", "gold", "📄"],
    ["lines_per_msg_25", "lines", "platinum", "📃"],
    ["lines_per_msg_50", "lines", "diamond", "📜"],
    ["proj_lines_10k", "lines", "gold", "📂"],
    ["proj_lines_50k", "lines", "platinum", "📁"],
    ["proj_lines_100k", "lines", "diamond", "🗂️"],
    ["proj_lines_250k", "lines", "diamond", "🏗️"],
    ["lines_written_750k", "lines", "diamond", "📋"],
    ["lines_edited_200k", "lines", "diamond", "🔧"],
    ["lines_deleted_200k", "lines", "diamond", "🧨"],
    ["model_diversity_7", "models", "diamond", "🎨"],
    ["model_diversity_8", "models", "diamond", "🌈"],
    ["model_diversity_10", "models", "diamond", "🪄"],
    ["model_sonnet_200k", "models", "diamond", "🎵"],
    ["model_opus_200k", "models", "diamond", "🎭"],
    ["model_haiku_100k", "models", "diamond", "🌸"],
    ["triple_model_day_100", "models", "diamond", "🌈"],
    ["model_loyal_sonnet_80", "models", "platinum", "🎯"],
    ["model_loyal_opus_80", "models", "diamond", "👑"],
    ["model_balanced", "models", "platinum", "⚖️"],
    ["model_opus_500k", "models", "diamond", "🎺"],
    ["model_sonnet_500k", "models", "diamond", "🎼"],
    ["tool_diversity_35", "tools", "diamond", "🧰"],
    ["tool_diversity_40", "tools", "diamond", "🛠️"],
    ["avg_tools_session_50", "tools", "silver", "🔨"],
    ["avg_tools_session_100", "tools", "gold", "⚒️"],
    ["avg_tools_session_250", "tools", "platinum", "🪓"],
    ["avg_tools_session_500", "tools", "diamond", "⛏️"],
    ["read_write_ratio_3", "tools", "silver", "📖"],
    ["read_write_ratio_5", "tools", "gold", "📗"],
    ["read_write_ratio_10", "tools", "platinum", "📚"],
    ["tool_mcp_user", "tools", "gold", "🔌"],
    ["tool_notebook_edit", "tools", "silver", "📓"],
    ["tool_web_search", "tools", "silver", "🌐"],
    ["tool_web_fetch", "tools", "silver", "🕸️"],
    ["tool_10m_calls", "tools", "diamond", "⚡"],
    ["tool_bash_1m", "tools", "diamond", "💻"],
    ["afternoon_coder_50", "time", "gold", "☀️"],
    ["afternoon_coder_200", "time", "platinum", "🌤️"],
    ["afternoon_coder_500", "time", "diamond", "🌞"],
    ["evening_coder_50", "time", "gold", "🌆"],
    ["evening_coder_200", "time", "platinum", "🌇"],
    ["evening_coder_500", "time", "diamond", "🌃"],
    ["total_hours_1k", "time", "diamond", "⏳"],
    ["total_hours_5k", "time", "diamond", "⌛"],
    ["weekday_sessions_100", "time", "gold", "💼"],
    ["weekday_sessions_500", "time", "platinum", "🏢"],
    ["weekday_sessions_1k", "time", "diamond", "🏛️"],
    ["saturday_warrior_10", "time", "silver", "🏖️"],
    ["saturday_warrior_50", "time", "gold", "⛱️"],
    ["saturday_warrior_100", "time", "platinum", "🏝️"],
    ["weekend_streak_5", "time", "gold", "🔗"],
    ["proj_above_500_msgs_3", "projects", "gold", "📂"],
    ["proj_above_500_msgs_5", "projects", "platinum", "📁"],
    ["proj_above_500_msgs_10", "projects", "diamond", "🗂️"],
    ["proj_above_5k_msgs_1", "projects", "gold", "💬"],
    ["proj_above_5k_msgs_3", "projects", "platinum", "🗨️"],
    ["proj_above_5k_msgs_5", "projects", "diamond", "📨"],
    ["proj_diversity_week_3", "projects", "silver", "🔀"],
    ["proj_diversity_week_5", "projects", "gold", "🔄"],
    ["proj_diversity_week_10", "projects", "platinum", "🌀"],
    ["proj_diversity_week_15", "projects", "diamond", "🎡"],
    ["proj_tokens_500m", "projects", "diamond", "🔢"],
    ["proj_tokens_1b", "projects", "diamond", "🧮"],
    ["proj_cost_10k", "projects", "diamond", "🤑"],
    ["proj_sessions_2k", "projects", "diamond", "🏢"],
    ["project_35", "projects", "diamond", "🏘️"],
    ["streak_21", "streaks", "gold", "🔥"],
    ["streak_45", "streaks", "platinum", "🌟"],
    ["streak_250", "streaks", "diamond", "💫"],
    ["weekend_streak_10", "streaks", "platinum", "🔗"],
    ["weekend_streak_20", "streaks", "diamond", "⛓️"],
    ["weekend_streak_50", "streaks", "diamond", "🔒"],
    ["consec_months_active_48", "streaks", "diamond", "🔐"],
    ["weeks_active_250", "streaks", "diamond", "🗓️"],
    ["active_days_50", "streaks", "gold", "📅"],
    ["active_days_75", "streaks", "gold", "📆"],
    ["active_days_150", "streaks", "platinum", "🎯"],
    ["active_days_250", "streaks", "platinum", "🏆"],
    ["days_5_sessions_10", "streaks", "gold", "📊"],
    ["days_5_sessions_50", "streaks", "diamond", "📈"],
    ["months_active_3", "streaks", "silver", "📅"],
    ["cache_create_1b", "cache", "diamond", "🏗️"],
    ["cache_rate_60", "cache", "silver", "💾"],
    ["cache_rate_75", "cache", "gold", "🗄️"],
    ["cache_rate_85", "cache", "platinum", "🏎️"],
    ["cache_and_lines_100k", "cache", "platinum", "📝"],
    ["cache_and_lines_500k", "cache", "diamond", "📄"],
    ["cache_and_streak_30", "cache", "platinum", "🔥"],
    ["cache_and_tools_50k", "cache", "platinum", "🔧"],
    ["cache_and_tools_250k", "cache", "diamond", "⚙️"],
    ["cache_and_marathon_50", "cache", "diamond", "🏃"],
    ["cache_and_models_5", "cache", "platinum", "🌈"],
    ["cache_tokens_250m", "cache", "diamond", "💽"],
    ["valentines_coder", "special", "gold", "💝"],
    ["april_fools_coder", "special", "gold", "🃏"],
    ["may_day_coder", "special", "gold", "🌷"],
    ["groundhog_coder", "special", "gold", "🦫"],
    ["earth_day_coder", "special", "gold", "🌍"],
    ["towel_day_coder", "special", "gold", "🐬"],
    ["programmers_day", "special", "platinum", "💻"],
    ["sysadmin_day", "special", "platinum", "🖥️"],
    ["polyglot_tools", "special", "diamond", "🌐"],
    ["big_spender_fast", "special", "diamond", "🤑"],
    ["productive_weekend", "special", "gold", "🏖️"],
    ["token_marathon", "special", "diamond", "🏃‍♂️"],
    ["silent_grinder", "special", "platinum", "🥷"],
    ["opus_whale", "special", "diamond", "🐋"],
    ["speed_demon", "special", "platinum", "⚡"],
    ["the_architect", "special", "diamond", "🏛️"],
    ["cost_efficient", "special", "platinum", "🎯"],
    ["midnight_oil", "special", "gold", "🕯️"],
    ["tokens_per_dollar_1m", "efficiency", "bronze", "📊"],
    ["tokens_per_dollar_2m", "efficiency", "silver", "📈"],
    ["tokens_per_dollar_5m", "efficiency", "gold", "📉"],
    ["tokens_per_dollar_10m", "efficiency", "platinum", "💹"],
    ["tokens_per_dollar_25m", "efficiency", "diamond", "🏆"],
    ["lines_per_dollar_50", "efficiency", "bronze", "📝"],
    ["lines_per_dollar_100", "efficiency", "silver", "📄"],
    ["lines_per_dollar_250", "efficiency", "gold", "📃"],
    ["lines_per_dollar_500", "efficiency", "platinum", "📜"],
    ["lines_per_dollar_1k", "efficiency", "diamond", "📋"],
    ["msgs_per_session_50", "efficiency", "gold", "💬"],
    ["msgs_per_session_100", "efficiency", "platinum", "🗨️"],
    ["msgs_per_session_200", "efficiency", "diamond", "📨"],
    ["efficient_combo", "efficiency", "platinum", "🎯"],
    ["hyper_efficient", "efficiency", "diamond", "⚡"],
    ["rate_limit_1", "ratelimits", "bronze", "🚦"],
    ["rate_limit_5", "ratelimits", "silver", "🚧"],
    ["rate_limit_10", "ratelimits", "gold", "⛔"],
    ["rate_limit_25", "ratelimits", "gold", "🛑"],
    ["rate_limit_50", "ratelimits", "platinum", "🔴"],
    ["rate_limit_100", "ratelimits", "platinum", "🚨"],
    ["rate_limit_250", "ratelimits", "diamond", "🆘"],
    ["rate_limit_500", "ratelimits", "diamond", "💀"],
    ["deep_hours_2k", "time", "gold", "🪵"],
    ["deep_hours_2p5k", "time", "platinum", "🔨"],
    ["deep_hours_3k", "time", "platinum", "⚒️"],
    ["deep_hours_4k", "time", "diamond", "🏗️"],
    ["deep_hours_4p5k", "time", "diamond", "⛏️"],
    ["deep_hours_5k", "time", "diamond", "🔥"],
    ["deep_hours_6k", "time", "diamond", "🏭"],
    ["deep_session_7k", "time", "gold", "🎯"],
    ["deep_session_9k", "time", "platinum", "🧗"],
    ["deep_session_12k", "time", "diamond", "🏔️"],
    ["deep_session_15k", "time", "diamond", "🚀"],
    ["deep_session_17p5k", "time", "diamond", "🛰️"],
    ["deep_session_25k", "time", "diamond", "🌌"],
    ["deep_sess_2h_150", "time", "gold", "📗"],
    ["deep_sess_2h_200", "time", "platinum", "📘"],
    ["deep_sess_2h_250", "time", "diamond", "📙"],
    ["deep_sess_2h_300", "time", "diamond", "📕"],
    ["deep_sess_2h_350", "time", "diamond", "📚"],
    ["deep_sess_2h_450", "time", "diamond", "🗄️"],
    ["deep_sess_4h_80", "time", "gold", "🕓"],
    ["deep_sess_4h_100", "time", "platinum", "🕗"],
    ["deep_sess_4h_120", "time", "platinum", "⏳"],
    ["deep_sess_4h_150", "time", "diamond", "⌛"],
    ["deep_sess_4h_200", "time", "diamond", "🧭"],
    ["deep_sess_4h_250", "time", "diamond", "🎖️"],
    ["deep_sess_8h_50", "time", "gold", "🌅"],
    ["deep_sess_8h_70", "time", "platinum", "🌇"],
    ["deep_sess_8h_90", "time", "diamond", "🌃"],
    ["deep_sess_8h_120", "time", "diamond", "🌌"],
    ["deep_sess_8h_150", "time", "diamond", "💫"],
    ["deep_day_peak_8k", "time", "gold", "☀️"],
    ["deep_day_peak_10k", "time", "platinum", "🔆"],
    ["deep_day_peak_15k", "time", "diamond", "🌞"],
    ["deep_day_peak_17p5k", "time", "diamond", "🔥"],
    ["deep_day_peak_25k", "time", "diamond", "☄️"],
    ["deep_days_4h_90", "time", "gold", "📆"],
    ["deep_days_4h_120", "time", "platinum", "🗓️"],
    ["deep_days_4h_150", "time", "diamond", "📅"],
    ["deep_days_4h_175", "time", "diamond", "🧱"],
    ["deep_days_4h_200", "time", "diamond", "🏢"],
    ["deep_days_4h_250", "time", "diamond", "🏙️"],
    ["deep_days_4h_300", "time", "diamond", "🌆"],
    ["deep_days_8h_60", "time", "gold", "⚙️"],
    ["deep_days_8h_80", "time", "platinum", "🛠️"],
    ["deep_days_8h_90", "time", "platinum", "🏗️"],
    ["deep_days_8h_120", "time", "diamond", "🧰"],
    ["deep_days_8h_150", "time", "diamond", "🔧"],
    ["deep_days_8h_175", "time", "diamond", "🦾"],
    ["cmb_endure_1", "time", "gold", "🧗"],
    ["cmb_endure_2", "time", "platinum", "🏔️"],
    ["cmb_endure_3", "time", "platinum", "🗻"],
    ["cmb_endure_4", "time", "diamond", "🌋"],
    ["cmb_endure_5", "time", "diamond", "🏆"],
    ["cmb_deep_streak_1", "time", "gold", "🔥"],
    ["cmb_deep_streak_2", "time", "platinum", "🌟"],
    ["cmb_deep_streak_3", "time", "platinum", "💫"],
    ["cmb_deep_streak_4", "time", "diamond", "☄️"],
    ["cmb_deep_streak_5", "time", "diamond", "🌌"],
    ["lm_hours_10000", "time", "diamond", "🧠"],
    ["avg_active_session_45", "time", "gold", "🎯"],
    ["avg_active_session_60", "time", "platinum", "🧘"],
    ["avg_active_session_90", "time", "diamond", "🕉️"],
    ["tok2_90b", "tokens", "diamond", "🌊"],
    ["tok2_120b", "tokens", "diamond", "🌀"],
    ["tok2_150b", "tokens", "diamond", "🌪️"],
    ["tok2_175b", "tokens", "diamond", "🌋"],
    ["tok2_200b", "tokens", "diamond", "☄️"],
    ["tok2_250b", "tokens", "diamond", "🪐"],
    ["tok2_300b", "tokens", "diamond", "🌠"],
    ["out2_200m", "tokens", "diamond", "🖊️"],
    ["out2_300m", "tokens", "diamond", "🖋️"],
    ["out2_350m", "tokens", "diamond", "📜"],
    ["out2_400m", "tokens", "diamond", "📖"],
    ["out2_600m", "tokens", "diamond", "🏺"],
    ["inp2_9m", "tokens", "gold", "👂"],
    ["inp2_12m", "tokens", "platinum", "📡"],
    ["inp2_15m", "tokens", "diamond", "🔭"],
    ["inp2_17p5m", "tokens", "diamond", "🛰️"],
    ["inp2_25m", "tokens", "diamond", "🌐"],
    ["ccw2_1p75b", "tokens", "diamond", "📦"],
    ["ccw2_2b", "tokens", "diamond", "🗃️"],
    ["ccw2_2p5b", "tokens", "diamond", "🏬"],
    ["ccw2_3b", "tokens", "diamond", "🏭"],
    ["ccw2_3p5b", "tokens", "diamond", "🗄️"],
    ["ccw2_4b", "tokens", "diamond", "🏛️"],
    ["ccw2_5b", "tokens", "diamond", "🌋"],
    ["lm_tokens_100b", "tokens", "diamond", "🌌"],
    ["lm_tokens_500b", "tokens", "diamond", "✴️"],
    ["lm_tokens_1t", "tokens", "diamond", "🌠"],
    ["msg2_300k", "messages", "diamond", "🗣️"],
    ["msg2_350k", "messages", "diamond", "📢"],
    ["msg2_400k", "messages", "diamond", "📣"],
    ["msg2_450k", "messages", "diamond", "🎙️"],
    ["msg2_600k", "messages", "diamond", "📻"],
    ["msg2_700k", "messages", "diamond", "📡"],
    ["msg2_800k", "messages", "diamond", "🛰️"],
    ["msg_sess2_17p5k", "messages", "diamond", "💬"],
    ["msg_sess2_20k", "messages", "diamond", "🗨️"],
    ["msg_sess2_25k", "messages", "diamond", "🗯️"],
    ["msg_sess2_30k", "messages", "diamond", "📨"],
    ["msg_sess2_40k", "messages", "diamond", "📬"],
    ["msg_sess2_50k", "messages", "diamond", "📯"],
    ["msg_day2_6k", "messages", "diamond", "📈"],
    ["msg_day2_8k", "messages", "diamond", "📊"],
    ["msg_day2_9k", "messages", "diamond", "🚦"],
    ["msg_day2_12k", "messages", "diamond", "🚀"],
    ["msg_day2_15k", "messages", "diamond", "🌡️"],
    ["msg_day2_17p5k", "messages", "diamond", "🔺"],
    ["msg_d500_175", "messages", "diamond", "🥉"],
    ["msg_d500_250", "messages", "diamond", "🥈"],
    ["msg_d500_350", "messages", "diamond", "🥇"],
    ["msg_d500_400", "messages", "diamond", "🏅"],
    ["msg_d500_500", "messages", "diamond", "🎖️"],
    ["msg_d2k_40", "messages", "diamond", "⚡"],
    ["msg_d2k_60", "messages", "diamond", "🔋"],
    ["msg_d2k_70", "messages", "diamond", "🌩️"],
    ["msg_d2k_90", "messages", "diamond", "⛈️"],
    ["msg_d2k_120", "messages", "diamond", "🌀"],
    ["cost2_70k", "cost", "diamond", "🪙"],
    ["cost2_80k", "cost", "diamond", "💵"],
    ["cost2_90k", "cost", "diamond", "💰"],
    ["cost2_120k", "cost", "diamond", "🏦"],
    ["cost2_150k", "cost", "diamond", "💎"],
    ["cost2_175k", "cost", "diamond", "👑"],
    ["cost2_200k", "cost", "diamond", "🏛️"],
    ["cost_day2_2k", "cost", "diamond", "💸"],
    ["cost_day2_2p5k", "cost", "diamond", "🧾"],
    ["cost_day2_3k", "cost", "diamond", "🏷️"],
    ["cost_day2_4k", "cost", "diamond", "💳"],
    ["cost_day2_5k", "cost", "diamond", "🪙"],
    ["cost_day2_6k", "cost", "diamond", "🔥"],
    ["cost_sess2_6k", "cost", "diamond", "🎰"],
    ["cost_sess2_8k", "cost", "diamond", "🃏"],
    ["cost_sess2_10k", "cost", "diamond", "🎲"],
    ["cost_sess2_15k", "cost", "diamond", "💠"],
    ["cost_sess2_17p5k", "cost", "diamond", "🏰"],
    ["cost_d50_200", "cost", "diamond", "📅"],
    ["cost_d50_250", "cost", "diamond", "🗓️"],
    ["cost_d50_300", "cost", "diamond", "📆"],
    ["cost_d50_350", "cost", "diamond", "💼"],
    ["cost_d50_450", "cost", "diamond", "🏢"],
    ["cost_d50_600", "cost", "diamond", "🏙️"],
    ["lm_cost_250k", "cost", "diamond", "💎"],
    ["lm_cost_500k", "cost", "diamond", "👑"],
    ["cache_save_450k", "cache", "gold", "🪃"],
    ["cache_save_600k", "cache", "platinum", "♻️"],
    ["cache_save_700k", "cache", "platinum", "🧊"],
    ["cache_save_900k", "cache", "diamond", "🛡️"],
    ["cache_save_1m", "cache", "diamond", "⚗️"],
    ["cache_save_1p2m", "cache", "diamond", "🧪"],
    ["cache_save_1p5m", "cache", "diamond", "🏅"],
    ["cache_read2_90b", "cache", "diamond", "🔁"],
    ["cache_read2_120b", "cache", "diamond", "🔂"],
    ["cache_read2_150b", "cache", "diamond", "♻️"],
    ["cache_read2_200b", "cache", "diamond", "🌀"],
    ["cache_read2_250b", "cache", "diamond", "🎡"],
    ["cache_read2_300b", "cache", "diamond", "🎢"],
    ["cmb_thrift_1", "cache", "gold", "🪶"],
    ["cmb_thrift_2", "cache", "platinum", "🧊"],
    ["cmb_thrift_3", "cache", "platinum", "♻️"],
    ["cmb_thrift_4", "cache", "diamond", "🛡️"],
    ["cmb_thrift_5", "cache", "diamond", "🕊️"],
    ["lm_save_2m", "cache", "diamond", "🏵️"],
    ["lw2_1p5m", "lines", "diamond", "🧱"],
    ["lw2_1p75m", "lines", "diamond", "🧰"],
    ["lw2_2p5m", "lines", "diamond", "🏘️"],
    ["lw2_3m", "lines", "diamond", "🏙️"],
    ["lw2_3p5m", "lines", "diamond", "🌉"],
    ["lw2_4m", "lines", "diamond", "🗼"],
    ["lw2_4p5m", "lines", "diamond", "🌇"],
    ["la2_800k", "lines", "diamond", "➕"],
    ["la2_1p2m", "lines", "diamond", "🪛"],
    ["la2_1p5m", "lines", "diamond", "⚙️"],
    ["la2_1p75m", "lines", "diamond", "🛠️"],
    ["la2_2m", "lines", "diamond", "🧩"],
    ["la2_2p5m", "lines", "diamond", "🎛️"],
    ["ld2_350k", "lines", "diamond", "✂️"],
    ["ld2_450k", "lines", "diamond", "🧹"],
    ["ld2_600k", "lines", "diamond", "🔥"],
    ["ld2_700k", "lines", "diamond", "🌊"],
    ["ld2_900k", "lines", "diamond", "🕳️"],
    ["ld2_1p2m", "lines", "diamond", "🌪️"],
    ["ln2_2m", "lines", "diamond", "📗"],
    ["ln2_2p5m", "lines", "diamond", "📘"],
    ["ln2_3m", "lines", "diamond", "📙"],
    ["ln2_3p5m", "lines", "diamond", "📕"],
    ["ln2_4m", "lines", "diamond", "📚"],
    ["ln2_6m", "lines", "diamond", "🌍"],
    ["ld_day2_45k", "lines", "diamond", "⚡"],
    ["ld_day2_60k", "lines", "diamond", "🌩️"],
    ["ld_day2_70k", "lines", "diamond", "🔥"],
    ["ld_day2_90k", "lines", "diamond", "🌋"],
    ["ld_day2_120k", "lines", "diamond", "☄️"],
    ["ld_day2_150k", "lines", "diamond", "💥"],
    ["ld_sess2_120k", "lines", "diamond", "🖨️"],
    ["ld_sess2_150k", "lines", "diamond", "📃"],
    ["ld_sess2_200k", "lines", "diamond", "📜"],
    ["ld_sess2_250k", "lines", "diamond", "🗞️"],
    ["ld_sess2_350k", "lines", "diamond", "📰"],
    ["ld_d1k_200", "lines", "diamond", "📐"],
    ["ld_d1k_250", "lines", "diamond", "📏"],
    ["ld_d1k_300", "lines", "diamond", "🧮"],
    ["ld_d1k_400", "lines", "diamond", "🗜️"],
    ["ld_d1k_500", "lines", "diamond", "🏗️"],
    ["ld_d1k_600", "lines", "diamond", "🏭"],
    ["cmb_output_1", "lines", "gold", "🧱"],
    ["cmb_output_2", "lines", "platinum", "🏗️"],
    ["cmb_output_3", "lines", "platinum", "🏙️"],
    ["cmb_output_4", "lines", "diamond", "🌉"],
    ["cmb_output_5", "lines", "diamond", "🗽"],
    ["tc2_300k", "tools", "diamond", "🔨"],
    ["tc2_350k", "tools", "diamond", "🪚"],
    ["tc2_400k", "tools", "diamond", "🪓"],
    ["tc2_450k", "tools", "diamond", "⚒️"],
    ["tc2_600k", "tools", "diamond", "🧰"],
    ["tc2_700k", "tools", "diamond", "🏭"],
    ["tc2_800k", "tools", "diamond", "🦾"],
    ["tcnt2_90", "tools", "diamond", "🧭"],
    ["tcnt2_120", "tools", "diamond", "🗺️"],
    ["tcnt2_175", "tools", "diamond", "🔭"],
    ["tcnt2_250", "tools", "diamond", "🧬"],
    ["tcnt2_300", "tools", "diamond", "🌐"],
    ["mcp_calls_15k", "tools", "gold", "🔌"],
    ["mcp_calls_17p5k", "tools", "platinum", "🧩"],
    ["mcp_calls_20k", "tools", "platinum", "🛰️"],
    ["mcp_calls_25k", "tools", "diamond", "🌉"],
    ["mcp_calls_30k", "tools", "diamond", "🕸️"],
    ["mcp_calls_35k", "tools", "diamond", "🧠"],
    ["mcp_calls_40k", "tools", "diamond", "🌐"],
    ["mcp_srv_7", "tools", "gold", "🔗"],
    ["mcp_srv_9", "tools", "platinum", "🧲"],
    ["mcp_srv_12", "tools", "diamond", "🛠️"],
    ["mcp_srv_15", "tools", "diamond", "🏗️"],
    ["mcp_srv_20", "tools", "diamond", "🌍"],
    ["sub_msg_30k", "tools", "platinum", "🐝"],
    ["sub_msg_35k", "tools", "platinum", "🐜"],
    ["sub_msg_40k", "tools", "platinum", "🕸️"],
    ["sub_msg_45k", "tools", "diamond", "🧑‍🤝‍🧑"],
    ["sub_msg_60k", "tools", "diamond", "👥"],
    ["sub_msg_70k", "tools", "diamond", "🏛️"],
    ["sub_msg_80k", "tools", "diamond", "🌐"],
    ["sub_cost_1p75k", "tools", "gold", "💼"],
    ["sub_cost_2p5k", "tools", "platinum", "🧾"],
    ["sub_cost_3k", "tools", "diamond", "🏢"],
    ["sub_cost_3p5k", "tools", "diamond", "🏦"],
    ["sub_cost_4k", "tools", "diamond", "🏛️"],
    ["sub_cost_5k", "tools", "diamond", "👔"],
    ["tl_bash_120k", "tools", "diamond", "🐚"],
    ["tl_bash_150k", "tools", "diamond", "🌀"],
    ["tl_bash_200k", "tools", "diamond", "🧿"],
    ["tl_bash_300k", "tools", "diamond", "🐉"],
    ["tl_bash_350k", "tools", "diamond", "🌌"],
    ["tl_edit_60k", "tools", "platinum", "🖍️"],
    ["tl_edit_80k", "tools", "diamond", "🖊️"],
    ["tl_edit_120k", "tools", "diamond", "📝"],
    ["tl_edit_150k", "tools", "diamond", "🎨"],
    ["tl_read_60k", "tools", "platinum", "🔍"],
    ["tl_read_70k", "tools", "platinum", "📖"],
    ["tl_read_90k", "tools", "diamond", "🕵️"],
    ["tl_read_120k", "tools", "diamond", "🧐"],
    ["tl_read_150k", "tools", "diamond", "🦉"],
    ["tl_write_12k", "tools", "gold", "📄"],
    ["tl_write_15k", "tools", "platinum", "📃"],
    ["tl_write_17p5k", "tools", "platinum", "📑"],
    ["tl_write_25k", "tools", "diamond", "🗂️"],
    ["tl_write_30k", "tools", "diamond", "📚"],
    ["tl_write_35k", "tools", "diamond", "🏛️"],
    ["tl_grep_12k", "tools", "platinum", "🧲"],
    ["tl_grep_15k", "tools", "platinum", "🎣"],
    ["tl_grep_20k", "tools", "diamond", "⛏️"],
    ["tl_grep_25k", "tools", "diamond", "🛰️"],
    ["tl_grep_30k", "tools", "diamond", "🧬"],
    ["tl_glob_1p75k", "tools", "gold", "🗺️"],
    ["tl_glob_2p5k", "tools", "platinum", "🧭"],
    ["tl_glob_3k", "tools", "diamond", "📍"],
    ["tl_glob_3p5k", "tools", "diamond", "🛤️"],
    ["tl_glob_4p5k", "tools", "diamond", "🌐"],
    ["tl_glob_6k", "tools", "diamond", "🪐"],
    ["cmb_toolset_1", "tools", "gold", "🧰"],
    ["cmb_toolset_2", "tools", "platinum", "⚒️"],
    ["cmb_toolset_3", "tools", "platinum", "🛠️"],
    ["cmb_toolset_4", "tools", "diamond", "🏭"],
    ["cmb_toolset_5", "tools", "diamond", "🦾"],
    ["cmb_orchestra_1", "tools", "gold", "🎻"],
    ["cmb_orchestra_2", "tools", "platinum", "🎺"],
    ["cmb_orchestra_3", "tools", "platinum", "🥁"],
    ["cmb_orchestra_4", "tools", "diamond", "🎼"],
    ["cmb_orchestra_5", "tools", "diamond", "🎩"],
    ["lm_subagents_100k", "tools", "diamond", "👥"],
    ["lm_mcp_25", "tools", "diamond", "🌐"],
    ["mdl_o5_45k", "models", "gold", "🌟"],
    ["mdl_o5_60k", "models", "platinum", "💫"],
    ["mdl_o5_70k", "models", "platinum", "✨"],
    ["mdl_o5_90k", "models", "diamond", "🔮"],
    ["mdl_o5_120k", "models", "diamond", "👑"],
    ["mdl_o5_150k", "models", "diamond", "🏆"],
    ["mdl_f5_30k", "models", "gold", "📖"],
    ["mdl_f5_40k", "models", "platinum", "🪄"],
    ["mdl_f5_50k", "models", "diamond", "🎭"],
    ["mdl_f5_70k", "models", "diamond", "🎨"],
    ["mdl_f5_90k", "models", "diamond", "🦄"],
    ["mdl_h45_8k", "models", "gold", "🍃"],
    ["mdl_h45_12k", "models", "platinum", "🌾"],
    ["mdl_h45_15k", "models", "diamond", "🎋"],
    ["mdl_h45_20k", "models", "diamond", "🏞️"],
    ["mdl_h45_25k", "models", "diamond", "⛩️"],
    ["mdl_s5_2p5k", "models", "gold", "🎼"],
    ["mdl_s5_3p5k", "models", "platinum", "🎻"],
    ["mdl_s5_4k", "models", "diamond", "🎺"],
    ["mdl_s5_6k", "models", "diamond", "🎹"],
    ["mdl_s5_7k", "models", "diamond", "🎩"],
    ["mdl_multi_450", "models", "gold", "🔀"],
    ["mdl_multi_500", "models", "platinum", "🎚️"],
    ["mdl_multi_700", "models", "diamond", "🎛️"],
    ["mdl_multi_800", "models", "diamond", "🧪"],
    ["mdl_multi_1k", "models", "diamond", "⚗️"],
    ["mdl_multi_1p2k", "models", "diamond", "🧬"],
    ["mdl_triple_120", "models", "diamond", "🎲"],
    ["mdl_triple_150", "models", "diamond", "🃏"],
    ["mdl_triple_175", "models", "diamond", "🎰"],
    ["mdl_triple_200", "models", "diamond", "🎪"],
    ["mdl_triple_250", "models", "diamond", "🎡"],
    ["mdl_triple_350", "models", "diamond", "🌈"],
    ["cmb_models_1", "models", "gold", "🎭"],
    ["cmb_models_2", "models", "platinum", "🎨"],
    ["cmb_models_3", "models", "platinum", "🌈"],
    ["cmb_models_4", "models", "diamond", "🔮"],
    ["cmb_models_5", "models", "diamond", "👑"],
    ["lm_models_in_session_11", "models", "diamond", "🎪"],
    ["prj2_250", "projects", "diamond", "🌱"],
    ["prj2_400", "projects", "diamond", "🌳"],
    ["prj2_450", "projects", "diamond", "🌲"],
    ["prj2_600", "projects", "diamond", "🏞️"],
    ["prj2_700", "projects", "diamond", "🗺️"],
    ["prj_msg2_30k", "projects", "diamond", "🏠"],
    ["prj_msg2_40k", "projects", "diamond", "🏡"],
    ["prj_msg2_45k", "projects", "diamond", "🏘️"],
    ["prj_msg2_60k", "projects", "diamond", "🏢"],
    ["prj_msg2_70k", "projects", "diamond", "🏬"],
    ["prj_msg2_90k", "projects", "diamond", "🏰"],
    ["prj_cost2_12k", "projects", "diamond", "💠"],
    ["prj_cost2_15k", "projects", "diamond", "💎"],
    ["prj_cost2_20k", "projects", "diamond", "🔷"],
    ["prj_cost2_25k", "projects", "diamond", "🏆"],
    ["prj_cost2_30k", "projects", "diamond", "👑"],
    ["prj_cost2_35k", "projects", "diamond", "🌟"],
    ["prj_sess2_600", "projects", "diamond", "🔁"],
    ["prj_sess2_800", "projects", "diamond", "🔄"],
    ["prj_sess2_900", "projects", "diamond", "♾️"],
    ["prj_sess2_1p2k", "projects", "diamond", "🧗"],
    ["prj_sess2_1p5k", "projects", "diamond", "🏔️"],
    ["prj_sess2_1p75k", "projects", "diamond", "🗻"],
    ["prj_100usd_70", "projects", "gold", "📁"],
    ["prj_100usd_90", "projects", "platinum", "🗃️"],
    ["prj_100usd_120", "projects", "diamond", "🗄️"],
    ["prj_100usd_150", "projects", "diamond", "🏢"],
    ["prj_100usd_175", "projects", "diamond", "🏙️"],
    ["prj_100usd_200", "projects", "diamond", "🌆"],
    ["prj_500usd_30", "projects", "gold", "🥉"],
    ["prj_500usd_40", "projects", "platinum", "🥈"],
    ["prj_500usd_50", "projects", "diamond", "🥇"],
    ["prj_500usd_70", "projects", "diamond", "🏅"],
    ["prj_500usd_90", "projects", "diamond", "🏆"],
    ["prj_1kusd_17p5", "projects", "gold", "💰"],
    ["prj_1kusd_25", "projects", "platinum", "🏦"],
    ["prj_1kusd_30", "projects", "diamond", "💎"],
    ["prj_1kusd_40", "projects", "diamond", "👑"],
    ["prj_1kusd_60", "projects", "diamond", "🌐"],
    ["prj_50sess_17p5", "projects", "gold", "🧭"],
    ["prj_50sess_25", "projects", "platinum", "🛤️"],
    ["prj_50sess_30", "projects", "diamond", "🚉"],
    ["prj_50sess_40", "projects", "diamond", "🗼"],
    ["prj_50sess_50", "projects", "diamond", "🌉"],
    ["prj_day2_25", "projects", "diamond", "🎪"],
    ["prj_day2_35", "projects", "diamond", "🌀"],
    ["prj_day2_45", "projects", "diamond", "🎠"],
    ["prj_day2_60", "projects", "diamond", "🎡"],
    ["cmb_breadth_1", "projects", "gold", "🌾"],
    ["cmb_breadth_2", "projects", "platinum", "🌻"],
    ["cmb_breadth_3", "projects", "platinum", "🌳"],
    ["cmb_breadth_4", "projects", "diamond", "🏞️"],
    ["cmb_breadth_5", "projects", "diamond", "🌍"],
    ["cmb_devotion_1", "projects", "gold", "❤️"],
    ["cmb_devotion_2", "projects", "platinum", "🧡"],
    ["cmb_devotion_3", "projects", "platinum", "💛"],
    ["cmb_devotion_4", "projects", "diamond", "💚"],
    ["cmb_devotion_5", "projects", "diamond", "💙"],
    ["ses2_4k", "sessions", "diamond", "🚪"],
    ["ses2_6k", "sessions", "diamond", "🗝️"],
    ["ses2_7k", "sessions", "diamond", "🏛️"],
    ["ses2_8k", "sessions", "diamond", "🎬"],
    ["ses2_12k", "sessions", "diamond", "🏟️"],
    ["ses_day2_150", "sessions", "diamond", "🔥"],
    ["ses_day2_200", "sessions", "diamond", "🌪️"],
    ["ses_day2_300", "sessions", "diamond", "⚡"],
    ["ses_day2_350", "sessions", "diamond", "💥"],
    ["ses_day2_450", "sessions", "diamond", "🌋"],
    ["ses_d10_120", "sessions", "diamond", "📍"],
    ["ses_d10_150", "sessions", "diamond", "🗓️"],
    ["ses_d10_200", "sessions", "diamond", "🧷"],
    ["ses_d10_250", "sessions", "diamond", "🪢"],
    ["ses_d10_300", "sessions", "diamond", "⛓️"],
    ["ses_100m_350", "sessions", "diamond", "🧵"],
    ["ses_100m_450", "sessions", "diamond", "🪡"],
    ["ses_100m_500", "sessions", "diamond", "🧶"],
    ["ses_100m_700", "sessions", "diamond", "🕸️"],
    ["ses_100m_800", "sessions", "diamond", "🪢"],
    ["ses_100m_1k", "sessions", "diamond", "🌐"],
    ["ses_500m_90", "sessions", "diamond", "🏋️"],
    ["ses_500m_120", "sessions", "diamond", "🤼"],
    ["ses_500m_150", "sessions", "diamond", "🥊"],
    ["ses_500m_175", "sessions", "diamond", "🛡️"],
    ["ses_500m_250", "sessions", "diamond", "⚔️"],
    ["ses_500m_300", "sessions", "diamond", "🐉"],
    ["cmb_density_1", "sessions", "gold", "🧊"],
    ["cmb_density_2", "sessions", "platinum", "🧱"],
    ["cmb_density_3", "sessions", "platinum", "🪨"],
    ["cmb_density_4", "sessions", "diamond", "⛰️"],
    ["cmb_density_5", "sessions", "diamond", "🌑"],
    ["strk2_70", "streaks", "diamond", "🕯️"],
    ["strk2_100", "streaks", "diamond", "🔆"],
    ["strk2_150", "streaks", "diamond", "🌟"],
    ["strk2_175", "streaks", "diamond", "♾️"],
    ["wdstrk_60", "streaks", "platinum", "💼"],
    ["wdstrk_70", "streaks", "platinum", "📋"],
    ["wdstrk_80", "streaks", "platinum", "🗂️"],
    ["wdstrk_100", "streaks", "diamond", "🏢"],
    ["wdstrk_150", "streaks", "diamond", "⏰"],
    ["wdstrk_175", "streaks", "diamond", "🎩"],
    ["adays2_300", "streaks", "platinum", "🌿"],
    ["adays2_350", "streaks", "platinum", "🍀"],
    ["adays2_400", "streaks", "diamond", "🌳"],
    ["adays2_450", "streaks", "diamond", "🌲"],
    ["adays2_600", "streaks", "diamond", "🗿"],
    ["adays2_700", "streaks", "diamond", "🌍"],
    ["weeks2_40", "streaks", "gold", "📅"],
    ["weeks2_45", "streaks", "gold", "🗓️"],
    ["weeks2_60", "streaks", "platinum", "📆"],
    ["weeks2_70", "streaks", "diamond", "🧿"],
    ["weeks2_80", "streaks", "diamond", "🎯"],
    ["weeks2_120", "streaks", "diamond", "👑"],
    ["fweek2_30", "streaks", "diamond", "🛋️"],
    ["fweek2_40", "streaks", "diamond", "☕"],
    ["fweek2_45", "streaks", "diamond", "🌤️"],
    ["fweek2_60", "streaks", "diamond", "🏖️"],
    ["fweek2_70", "streaks", "diamond", "🎣"],
    ["fweek2_90", "streaks", "diamond", "🧘"],
    ["hrs_day_60", "streaks", "gold", "🕗"],
    ["hrs_day_70", "streaks", "platinum", "🕛"],
    ["hrs_day_90", "streaks", "diamond", "🕕"],
    ["hrs_day_120", "streaks", "diamond", "🌗"],
    ["hrs_day_150", "streaks", "diamond", "🌘"],
    ["hrs_day_175", "streaks", "diamond", "🌑"],
    ["cmb_rhythm_1", "streaks", "gold", "🎵"],
    ["cmb_rhythm_2", "streaks", "platinum", "🎶"],
    ["cmb_rhythm_3", "streaks", "platinum", "🥁"],
    ["cmb_rhythm_4", "streaks", "diamond", "🎼"],
    ["cmb_rhythm_5", "streaks", "diamond", "♾️"],
    ["lm_day_hours_22", "streaks", "diamond", "🕰️"],
    ["lm_day_hours_24", "streaks", "diamond", "🌗"],
    ["cmb_scale_1", "special", "gold", "📐"],
    ["cmb_scale_2", "special", "platinum", "📏"],
    ["cmb_scale_3", "special", "platinum", "🗼"],
    ["cmb_scale_4", "special", "diamond", "🌆"],
    ["cmb_scale_5", "special", "diamond", "🌐"],
    ["w3_four_week_1", "streaks", "gold", "🌅"],
    ["w3_four_week_2", "streaks", "platinum", "🥾"],
    ["w3_four_week_3", "streaks", "platinum", "🎵"],
    ["w3_four_week_4", "streaks", "diamond", "🏔️"],
    ["w3_four_week_5", "streaks", "diamond", "🌠"],
    ["w3_five_week_1", "streaks", "gold", "🌅"],
    ["w3_five_week_2", "streaks", "platinum", "🥾"],
    ["w3_five_week_3", "streaks", "platinum", "🎵"],
    ["w3_five_week_4", "streaks", "diamond", "🏔️"],
    ["w3_five_week_5", "streaks", "diamond", "🌠"],
    ["w3_month15_1", "streaks", "gold", "🌅"],
    ["w3_month15_2", "streaks", "platinum", "🥾"],
    ["w3_month15_3", "streaks", "platinum", "🎵"],
    ["w3_month15_4", "streaks", "diamond", "🏔️"],
    ["w3_month15_5", "streaks", "diamond", "🌠"],
    ["w3_month20_1", "streaks", "gold", "🌅"],
    ["w3_month20_2", "streaks", "platinum", "🥾"],
    ["w3_month20_3", "streaks", "platinum", "🎵"],
    ["w3_month20_4", "streaks", "diamond", "🏔️"],
    ["w3_month20_5", "streaks", "diamond", "🌠"],
    ["w3_week_run_1", "streaks", "gold", "🌅"],
    ["w3_week_run_2", "streaks", "platinum", "🥾"],
    ["w3_week_run_3", "streaks", "platinum", "🎵"],
    ["w3_week_run_4", "streaks", "diamond", "🏔️"],
    ["w3_week_run_5", "streaks", "diamond", "🌠"],
    ["w3_code_days_1", "tools", "gold", "🌅"],
    ["w3_code_days_2", "tools", "platinum", "🥾"],
    ["w3_code_days_3", "tools", "platinum", "🎵"],
    ["w3_code_days_4", "tools", "diamond", "🏔️"],
    ["w3_code_days_5", "tools", "diamond", "🌠"],
    ["w3_code_weeks_1", "tools", "gold", "🌅"],
    ["w3_code_weeks_2", "tools", "platinum", "🥾"],
    ["w3_code_weeks_3", "tools", "platinum", "🎵"],
    ["w3_code_weeks_4", "tools", "diamond", "🏔️"],
    ["w3_code_weeks_5", "tools", "diamond", "🌠"],
    ["w3_project_age_1", "projects", "gold", "🌅"],
    ["w3_project_age_2", "projects", "platinum", "🥾"],
    ["w3_project_age_3", "projects", "platinum", "🎵"],
    ["w3_project_age_4", "projects", "diamond", "🏔️"],
    ["w3_project_age_5", "projects", "diamond", "🌠"],
    ["w3_project90_1", "projects", "gold", "🌅"],
    ["w3_project90_2", "projects", "platinum", "🥾"],
    ["w3_project90_3", "projects", "platinum", "🎵"],
    ["w3_project90_4", "projects", "diamond", "🏔️"],
    ["w3_project90_5", "projects", "diamond", "🌠"],
    ["w3_project180_1", "projects", "gold", "🌅"],
    ["w3_project180_2", "projects", "platinum", "🥾"],
    ["w3_project180_3", "projects", "diamond", "🎵"],
    ["w3_project180_4", "projects", "diamond", "🏔️"],
    ["w3_project365_1", "projects", "gold", "🌅"],
    ["w3_project365_2", "projects", "platinum", "🥾"],
    ["w3_project365_3", "projects", "diamond", "🎵"],
    ["w3_deep_models_1", "models", "gold", "🌅"],
    ["w3_deep_models_2", "models", "platinum", "🥾"],
    ["w3_deep_models_3", "models", "platinum", "🎵"],
    ["w3_deep_models_4", "models", "diamond", "🏔️"],
    ["w3_deep_models_5", "models", "diamond", "🌠"],
    ["w3_ratio_code_1", "efficiency", "gold", "🌅"],
    ["w3_ratio_code_2", "efficiency", "platinum", "🥾"],
    ["w3_ratio_code_3", "efficiency", "platinum", "🎵"],
    ["w3_ratio_code_4", "efficiency", "diamond", "🏔️"],
    ["w3_combo_roots_1", "projects", "gold", "🌱"],
    ["w3_combo_roots_2", "projects", "platinum", "🌳"],
    ["w3_combo_code_1", "tools", "gold", "🛠️"],
    ["w3_combo_code_2", "tools", "platinum", "⚙️"],
    ["w3_combo_year_1", "projects", "gold", "📆"],
    ["w3_combo_year_2", "projects", "diamond", "🏛️"],
    ["w3_combo_week_1", "streaks", "gold", "🗓️"],
    ["w3_combo_week_2", "streaks", "diamond", "📚"],
    ["w3_combo_focus_1", "efficiency", "platinum", "🎯"],
    ["w3_combo_focus_2", "efficiency", "diamond", "💠"],
    ["w3_landmark_100_weeks", "streaks", "diamond", "💯"],
    ["w3_landmark_365_project", "projects", "gold", "🎂"],
    ["w3_landmark_500_code", "tools", "diamond", "🔨"]
  ];
  const unlockedKeys = new Set([
    'tokens_1k', 'tokens_10k', 'tokens_100k', 'tokens_500k', 'tokens_1m',
    'sessions_1', 'sessions_5', 'sessions_10', 'sessions_25',
    'messages_10', 'messages_50', 'messages_100', 'messages_500',
    'cost_1', 'cost_5', 'cost_10',
    'lines_written_100', 'lines_written_1k', 'lines_edited_100', 'lines_edited_1k',
    'lines_deleted_100', 'lines_net_1k',
    'model_sonnet', 'model_opus', 'model_haiku', 'model_diversity_2', 'model_diversity_3',
    'tool_read', 'tool_write', 'tool_edit', 'tool_bash', 'tool_grep', 'tool_glob',
    'tool_diversity_5', 'tool_diversity_10',
    'project_1', 'w3_four_week_1', 'w3_project_age_1'
  ]);
  const achievementsData = achDefs.map(([key, category, tier, emoji]) => ({
    key, category, tier, emoji,
    unlocked: unlockedKeys.has(key),
    unlockedAt: unlockedKeys.has(key) ? days[Math.floor(Math.random() * days.length)] + 'T12:00:00Z' : null
  }));

  // --- Tool stats (enhanced for Tools tab) ---
  // Built-in tools + a few MCP tools with realistic cost/token attribution
  const toolStatsRaw = [
    { name: 'Read', calls: 1240, type: 'built-in' },
    { name: 'Edit', calls: 685, type: 'built-in' },
    { name: 'Bash', calls: 542, type: 'built-in' },
    { name: 'Grep', calls: 418, type: 'built-in' },
    { name: 'Glob', calls: 312, type: 'built-in' },
    { name: 'Write', calls: 248, type: 'built-in' },
    { name: 'Task', calls: 142, type: 'built-in' },
    { name: 'TodoWrite', calls: 96, type: 'built-in' },
    { name: 'WebFetch', calls: 64, type: 'built-in' },
    { name: 'WebSearch', calls: 38, type: 'built-in' },
    { name: 'NotebookEdit', calls: 22, type: 'built-in' },
    { name: 'mcp__github__create_issue', calls: 18, type: 'mcp', server: 'github' },
    { name: 'mcp__github__list_pull_requests', calls: 15, type: 'mcp', server: 'github' },
    { name: 'mcp__github__create_pr_review', calls: 9, type: 'mcp', server: 'github' },
    { name: 'mcp__slack__post_message', calls: 14, type: 'mcp', server: 'slack' },
    { name: 'mcp__slack__search_messages', calls: 7, type: 'mcp', server: 'slack' },
    { name: 'mcp__playwright__browser_navigate', calls: 12, type: 'mcp', server: 'playwright' },
    { name: 'mcp__playwright__browser_snapshot', calls: 8, type: 'mcp', server: 'playwright' }
  ];
  const _toolTotalCalls = toolStatsRaw.reduce((a, t) => a + t.calls, 0);
  const toolStatsData = toolStatsRaw
    .map(t => {
      const costPerCall = t.type === 'mcp' ? 0.018 : 0.012;
      const tokensPerCall = t.type === 'mcp' ? 1850 : 1420;
      const calls = t.calls;
      const tokens = Math.round(calls * tokensPerCall);
      const cost = Math.round(calls * costPerCall * 100) / 100;
      const displayName = t.type === 'mcp' ? t.name.split('__').slice(2).join('__') : t.name;
      return {
        name: t.name,
        displayName,
        type: t.type,
        server: t.server || null,
        calls,
        cost,
        tokens,
        inputTokens: Math.round(tokens * 0.32),
        outputTokens: Math.round(tokens * 0.08),
        cacheReadTokens: Math.round(tokens * 0.55),
        cacheCreateTokens: Math.round(tokens * 0.05),
        messages: Math.max(1, Math.round(calls / 4.5)),
        percentage: Math.round((calls / _toolTotalCalls) * 1000) / 10
      };
    })
    .sort((a, b) => b.cost - a.cost);

  // --- MCP servers (auto-grouped from MCP entries above) ---
  const mcpServersData = (() => {
    const byServer = {};
    for (const t of toolStatsData) {
      if (t.type !== 'mcp') continue;
      const srv = t.server;
      if (!byServer[srv]) byServer[srv] = { name: srv, totalCalls: 0, totalCost: 0, totalTokens: 0, tools: [] };
      byServer[srv].totalCalls += t.calls;
      byServer[srv].totalCost += t.cost;
      byServer[srv].totalTokens += t.tokens;
      byServer[srv].tools.push({ name: t.displayName, calls: t.calls, cost: t.cost, tokens: t.tokens });
    }
    return Object.values(byServer)
      .map(s => ({ ...s, totalCost: Math.round(s.totalCost * 100) / 100 }))
      .sort((a, b) => b.totalCost - a.totalCost);
  })();

  // --- Sub-agent stats ---
  const subagentStatsData = (() => {
    const subMessages = 42;
    const subCost = 1.84;
    const subTokens = 246800;
    const subDaily = days.map((date, i) => {
      const factor = i >= 8 ? (0.4 + Math.random() * 0.7) : 0;
      const msgs = Math.round(4 * factor);
      const tokens = Math.round(28000 * factor);
      const cost = Math.round(0.21 * factor * 100) / 100;
      return msgs > 0 ? { date, messages: msgs, tokens, cost } : null;
    }).filter(Boolean);
    return {
      messages: subMessages,
      tokens: subTokens,
      cost: subCost,
      pctMessages: 5.0,
      pctCost: 8.1,
      daily: subDaily
    };
  })();

  // --- Tool cost daily (stacked area chart input) ---
  // Each day: { date, [toolName]: cost }
  const toolCostDailyData = days.map((date, i) => {
    const factor = 0.5 + Math.sin(i * 0.7) * 0.3 + (i / 15) * 0.3;
    const entry = { date };
    const topTools = ['Read', 'Edit', 'Bash', 'Grep', 'Glob', 'Write'];
    for (const t of topTools) {
      const base = { Read: 1.85, Edit: 1.20, Bash: 0.95, Grep: 0.55, Glob: 0.32, Write: 0.42 }[t];
      entry[t] = Math.round(base * factor * 100) / 100;
    }
    return entry;
  });

  // --- Rate limit events ---
  const rateLimitsData = (() => {
    // 4 hits across the 15-day window, randomly distributed
    const hits = [
      { date: days[3], count: 1 },
      { date: days[6], count: 2 },
      { date: days[11], count: 1 }
    ];
    return { total: hits.reduce((a, h) => a + h.count, 0), daily: hits };
  })();

  // --- Plan usage (Claude.ai plan limits) ---
  // Same shape as GET /api/claude-usage (lib/claude-usage.js createPoller().view()).
  // Synthetic forecast for the demo (shape = /api/usage-limits forecast v1).
  function demoForecast(pct, daysLeft, perDay, status) {
    const HOUR = 3600000, DAY = 24 * HOUR;
    const end = Date.now() + daysLeft * DAY, start = end - 7 * DAY, nowMs = Date.now();
    const iso = (ms) => new Date(ms).toISOString();
    const elapsedDays = (nowMs - start) / DAY;
    const actual = [];
    for (let t = start; t < nowMs; t += 6 * HOUR) actual.push([iso(t), Math.round(pct * (t - start) / (nowMs - start) * 10) / 10]);
    actual.push([iso(nowMs), pct]);
    const forecast = [];
    for (let t = nowMs + 6 * HOUR; t <= end; t += 6 * HOUR) {
      const inc = perDay * (t - nowMs) / DAY;
      forecast.push([iso(t), Math.round((pct + inc) * 10) / 10, Math.round((pct + inc * 0.7) * 10) / 10, Math.round((pct + inc * 1.3) * 10) / 10]);
    }
    const med = pct + perDay * daysLeft;
    const runOut = med >= 100 ? nowMs + ((100 - pct) / perDay) * DAY : null;
    return {
      version: 1, basis: 'calibrated', confidence: 'good', status,
      window: { start: iso(start), end: iso(end) }, now: iso(nowMs),
      pace: { planPercent: Math.round(elapsedDays / 7 * 1000) / 10, deltaPoints: Math.round((pct - elapsedDays / 7 * 100) * 10) / 10 },
      atReset: { median: Math.round(med * 10) / 10, low: Math.round((pct + perDay * daysLeft * 0.7) * 10) / 10, high: Math.round((pct + perDay * daysLeft * 1.3) * 10) / 10 },
      exhaustsAt: runOut ? { median: iso(runOut), early: iso(runOut - 0.4 * DAY), late: iso(runOut + 0.5 * DAY) } : null,
      k: 0.0123, notes: ['chat_invisible'],
      series: { actual, measured: actual.filter((_, i) => i % 2 === 1).slice(-6), forecast,
        ghosts: [{ start: iso(start - 7 * DAY), points: Array.from({ length: 29 }, (_, i) => [i * 360, Math.min(95, i * 3.2)]) }] }
    };
  }

  const claudeUsageData = {
    enabled: true,
    status: 'ok',
    error: null,
    fetchedAt: new Date(Date.now() - 90 * 1000).toISOString(),
    intervalMinutes: 5,
    data: {
      source: 'limits',
      limits: [
        { id: 'session', kind: 'session', name: 'session', group: 'session', percentUsed: 38,
          resetsAt: new Date(Date.now() + (3 * 60 + 24) * 60000).toISOString() },
        { id: 'weekly_all', kind: 'weekly_all', name: 'weekly_all', group: 'weekly', percentUsed: 56,
          resetsAt: new Date(Date.now() + 4 * 86400000).toISOString(), forecast: demoForecast(56, 4, 14, 'exhausts') },
        { id: 'weekly_scoped:fable', kind: 'weekly_scoped', name: 'weekly_scoped', group: 'weekly', percentUsed: 41,
          scopeLabel: 'Fable', resetsAt: new Date(Date.now() + 4 * 86400000).toISOString(), forecast: demoForecast(41, 4, 7, 'reserve') }
      ],
      extraUsage: { enabled: false, used: 0, limit: 50, currency: 'EUR', percentUsed: 0, disabledReason: null },
      breakdown: [{ key: 'claude_code', label: 'Claude Code', percent: 91 }, { key: 'chat', label: 'Chat', percent: 9 }]
    }
  };

  // --- GitHub: stats (heatmap, commits, repos, PRs, languages) ---
  const githubStatsData = (() => {
    // 365-day heatmap; commits cluster around weekdays + last 60 days higher
    const heatmap = [];
    const heatmapStart = new Date(now);
    heatmapStart.setDate(heatmapStart.getDate() - 364);
    for (let i = 0; i < 365; i++) {
      const d = new Date(heatmapStart);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay();
      const recencyBoost = i / 365;
      const weekdayBoost = (dayOfWeek >= 1 && dayOfWeek <= 5) ? 1 : 0.4;
      const r = Math.random();
      let count = 0;
      if (r < 0.30 * weekdayBoost + 0.20 * recencyBoost) count = 1 + Math.floor(Math.random() * 3);
      if (r < 0.12 * weekdayBoost + 0.18 * recencyBoost) count = 4 + Math.floor(Math.random() * 4);
      if (r < 0.04 * weekdayBoost + 0.10 * recencyBoost) count = 8 + Math.floor(Math.random() * 6);
      heatmap.push({
        date: d.toISOString().slice(0, 10),
        count,
        color: count === 0 ? '#161b22' : count < 4 ? '#0e4429' : count < 7 ? '#006d32' : count < 10 ? '#26a641' : '#39d353'
      });
    }
    const commitDaily = heatmap.filter(d => d.count > 0).map(d => ({ date: d.date, commits: d.count }));
    const totalContributions = heatmap.reduce((s, d) => s + d.count, 0);
    const commitCount = commitDaily.reduce((s, d) => s + d.commits, 0);

    const repoNames = [
      ['token-tracker', 'JavaScript', '#f1e05a', 142, 18],
      ['claude-remote', 'JavaScript', '#f1e05a', 89, 11],
      ['smart-home-dashboard', 'HTML', '#e34c26', 67, 8],
      ['go-sling', 'Go', '#00ADD8', 54, 6],
      ['hue-controller', 'JavaScript', '#f1e05a', 38, 4],
      ['lichtwerk-controller', 'JavaScript', '#f1e05a', 31, 3],
      ['yamaha-controller', 'JavaScript', '#f1e05a', 24, 2],
      ['fog-controller', 'JavaScript', '#f1e05a', 19, 2],
      ['raspi-monitor', 'TypeScript', '#3178c6', 47, 5],
      ['playground', 'HTML', '#e34c26', 12, 1],
      ['weather-station', 'Python', '#3572A5', 28, 3],
      ['dotfiles', 'Shell', '#89e051', 15, 2]
    ];
    const repos = repoNames.map(([name, lang, color, stars, forks], i) => ({
      name,
      nameWithOwner: 'demo-user/' + name,
      stars,
      forks,
      language: lang,
      languageColor: color,
      updatedAt: new Date(now - i * 3 * 86400000).toISOString(),
      isPrivate: i >= 9
    }));
    const totalStars = repos.reduce((s, r) => s + r.stars, 0);
    const totalForks = repos.reduce((s, r) => s + r.forks, 0);

    const langMap = {};
    for (const r of repos) {
      if (!langMap[r.language]) langMap[r.language] = { name: r.language, count: 0, color: r.languageColor };
      langMap[r.language].count++;
    }
    const languages = Object.values(langMap).sort((a, b) => b.count - a.count);

    // PR stats — 28 total PRs (20 merged, 5 open, 3 closed)
    const prStats = {
      total: 28,
      open: 5,
      merged: 20,
      closed: 3,
      totalAdditions: 12480,
      totalDeletions: 4720,
      netLines: 7760,
      totalChangedFiles: 184,
      codeByState: {
        merged: { additions: 9450, deletions: 3580 },
        open: { additions: 2240, deletions: 820 },
        closed: { additions: 790, deletions: 320 }
      }
    };

    return {
      heatmap,
      totalContributions,
      commitCount,
      prContributions: 28,
      repos,
      repoCount: repos.length,
      totalStars,
      totalForks,
      prStats,
      languages,
      commitDaily,
      _age: 12,
      _cached: true
    };
  })();

  // --- GitHub: billing (Actions minutes, storage, packages) ---
  const githubBillingData = {
    actions: {
      plan: 'Pro',
      totalMinutesUsed: 1842,
      includedMinutes: 3000,
      percentUsed: 61.4,
      minutesUsedBreakdown: {
        UBUNTU: 1420,
        MACOS: 380,
        WINDOWS: 42
      }
    },
    storage: {
      estimatedStorageGB: 0.84,
      includedStorageGB: 2.0,
      daysLeftInCycle: 12
    },
    packages: {
      totalGigabytesBandwidthUsed: 0.18,
      includedGigabytesBandwidth: 2.0
    },
    resetDate: (() => {
      const d = new Date(now); d.setDate(d.getDate() + 12); return d.toISOString().slice(0, 10);
    })()
  };

  // --- GitHub: actions usage (per-repo workflow minutes) ---
  const githubActionsUsageData = {
    repos: [
      { name: 'token-tracker', totalMinutes: 620, workflows: [
        { name: 'Deploy to VPS', billableMinutes: 420 },
        { name: 'Tests', billableMinutes: 200 }
      ]},
      { name: 'smart-home-dashboard', totalMinutes: 380, workflows: [
        { name: 'Build & Deploy', billableMinutes: 380 }
      ]},
      { name: 'claude-remote', totalMinutes: 260, workflows: [
        { name: 'Tests', billableMinutes: 180 },
        { name: 'Lint', billableMinutes: 80 }
      ]},
      { name: 'go-sling', totalMinutes: 195, workflows: [
        { name: 'Cross-compile', billableMinutes: 195 }
      ]},
      { name: 'raspi-monitor', totalMinutes: 140, workflows: [
        { name: 'CI', billableMinutes: 140 }
      ]},
      { name: 'playground', totalMinutes: 92, workflows: [
        { name: 'Deploy', billableMinutes: 92 }
      ]},
      { name: 'weather-station', totalMinutes: 64, workflows: [
        { name: 'Python tests', billableMinutes: 64 }
      ]}
    ]
  };

  // --- GitHub: code stats (LOC across top repos) ---
  const githubCodeStatsData = (() => {
    const weekly = [];
    const weeks = 52;
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weeks * 7);
    for (let i = 0; i < weeks; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i * 7);
      const factor = 0.3 + Math.sin(i * 0.3) * 0.4 + (i / weeks) * 0.5;
      weekly.push({
        week: d.toISOString().slice(0, 10),
        additions: Math.round(620 * factor),
        deletions: Math.round(280 * factor)
      });
    }
    return { weekly, repos: 8, _age: 12, _cached: true };
  })();

  // --- GitHub: code frequency (per-repo weekly additions/deletions) ---
  const githubCodeFrequencyData = (() => {
    const weeks = 52;
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weeks * 7);
    const data = [];
    for (let i = 0; i < weeks; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i * 7);
      const factor = 0.4 + Math.sin(i * 0.4) * 0.5 + (i / weeks) * 0.4;
      data.push({
        week: d.toISOString().slice(0, 10),
        additions: Math.round(180 * factor),
        deletions: Math.round(90 * factor)
      });
    }
    return data;
  })();

  // --- Anthropic API dashboard data ---
  const anthropicDashboardData = (() => {
    // Generate 30 days of API usage
    const apiDays = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      apiDays.push(d.toISOString().slice(0, 10));
    }
    const apiModels = [
      { id: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5' },
      { id: 'claude-opus-4-6', label: 'Opus 4.6' },
      { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' }
    ];
    const dailyCosts = apiDays.map((date, i) => {
      const factor = 0.4 + Math.sin(i * 0.5) * 0.3 + (i / 30) * 0.4;
      const entry = { date, total: 0 };
      for (const m of apiModels) {
        const base = m.label.includes('Sonnet') ? 4.2 : m.label.includes('Opus') ? 6.8 : 0.6;
        const c = Math.round(base * factor * 100) / 100;
        entry[m.label] = c;
        entry.total += c;
      }
      entry.total = Math.round(entry.total * 100) / 100;
      return entry;
    });
    const dailyTokens = apiDays.map((date, i) => {
      const factor = 0.4 + Math.sin(i * 0.5) * 0.3 + (i / 30) * 0.4;
      return {
        date,
        input: Math.round(180000 * factor),
        output: Math.round(64000 * factor),
        cacheRead: Math.round(820000 * factor),
        cacheCreate: Math.round(42000 * factor)
      };
    });
    const totalCost = Math.round(dailyCosts.reduce((s, d) => s + d.total, 0) * 100) / 100;
    const totalInput = dailyTokens.reduce((s, d) => s + d.input, 0);
    const totalOutput = dailyTokens.reduce((s, d) => s + d.output, 0);
    const totalCacheRead = dailyTokens.reduce((s, d) => s + d.cacheRead, 0);
    const totalCacheCreate = dailyTokens.reduce((s, d) => s + d.cacheCreate, 0);
    const totalTokens = totalInput + totalOutput + totalCacheRead + totalCacheCreate;
    const activeDays = dailyCosts.filter(d => d.total > 0).length;
    const modelBreakdown = apiModels.map(m => {
      const cost = Math.round(dailyCosts.reduce((s, d) => s + (d[m.label] || 0), 0) * 100) / 100;
      const shareFactor = m.label.includes('Sonnet') ? 0.50 : m.label.includes('Opus') ? 0.42 : 0.08;
      return {
        model: m.label,
        input: Math.round(totalInput * shareFactor),
        output: Math.round(totalOutput * shareFactor),
        cacheRead: Math.round(totalCacheRead * shareFactor),
        cacheCreate: Math.round(totalCacheCreate * shareFactor),
        cost
      };
    });
    // Per-API-key data: 2 keys (matches lib/anthropic-api.js schema)
    const apiKeys = [
      { keyId: 'apikey_01ABCDEFGHJKLMNPQR', keyName: 'prod-app', share: 0.72 },
      { keyId: 'apikey_01ZYXWVUTSRQPONMLK', keyName: 'dev-experiments', share: 0.28 }
    ];
    const keyTotals = apiKeys.map(k => {
      const tokens = Math.round(totalTokens * k.share);
      const input = Math.round(totalInput * k.share);
      const output = Math.round(totalOutput * k.share);
      const cacheRead = Math.round(totalCacheRead * k.share);
      const cacheCreate = Math.round(totalCacheCreate * k.share);
      const calculatedCost = Math.round(totalCost * k.share * 100) / 100;
      return {
        keyId: k.keyId,
        keyName: k.keyName,
        totalTokens: tokens,
        totalInput: input,
        totalOutput: output,
        totalCacheRead: cacheRead,
        totalCacheCreate: cacheCreate,
        calculatedCost,
        lastUsed: apiDays[apiDays.length - 1 - Math.floor(Math.random() * 3)]
      };
    });
    const keyBreakdown = [];
    for (const k of apiKeys) {
      for (const m of apiModels) {
        const mb = modelBreakdown.find(x => x.model === m.label);
        keyBreakdown.push({
          keyId: k.keyId,
          keyName: k.keyName,
          model: m.label,
          input: Math.round(mb.input * k.share),
          output: Math.round(mb.output * k.share),
          cacheRead: Math.round(mb.cacheRead * k.share),
          cacheCreate: Math.round(mb.cacheCreate * k.share),
          calculatedCost: Math.round(mb.cost * k.share * 100) / 100
        });
      }
    }
    const dailyTokensByKey = apiDays.map((date, i) => {
      const byKey = {};
      const dt = dailyTokens[i];
      const dc = dailyCosts[i];
      for (const k of apiKeys) {
        byKey[k.keyId] = {
          keyName: k.keyName,
          input: Math.round(dt.input * k.share),
          output: Math.round(dt.output * k.share),
          cacheRead: Math.round(dt.cacheRead * k.share),
          cacheCreate: Math.round(dt.cacheCreate * k.share),
          total: Math.round((dt.input + dt.output + dt.cacheRead + dt.cacheCreate) * k.share),
          calculatedCost: Math.round(dc.total * k.share * 100) / 100
        };
      }
      return { date, byKey };
    });

    return {
      totalCost,
      totalTokens,
      totalInput,
      totalOutput,
      totalCacheRead,
      totalCacheCreate,
      avgCostPerDay: activeDays > 0 ? Math.round((totalCost / activeDays) * 100) / 100 : 0,
      cacheEfficiency: totalTokens > 0 ? Math.round((totalCacheRead / totalTokens) * 1000) / 10 : 0,
      dailyCosts,
      dailyTokens,
      modelBreakdown,
      keyTotals,
      keyBreakdown,
      dailyTokensByKey,
      _age: 8,
      _cached: true
    };
  })();

  // --- Anthropic budget (set for demo) ---
  const anthropicBudgetData = { budget: 250 };

  // --- Project detail (dynamic factory: called with query params) ---
  function buildProjectDetail(params) {
    const name = params.name || projects[0];
    const matchingSessions = sessionsData.filter(s => s.project === name);
    const inputT = matchingSessions.reduce((a, s) => a + s.inputTokens, 0);
    const outputT = matchingSessions.reduce((a, s) => a + s.outputTokens, 0);
    const cacheR = matchingSessions.reduce((a, s) => a + s.cacheReadTokens, 0);
    const cacheC = matchingSessions.reduce((a, s) => a + s.cacheCreateTokens, 0);
    const cost = matchingSessions.reduce((a, s) => a + s.cost, 0);
    const messages = matchingSessions.reduce((a, s) => a + s.messages, 0);
    const linesAdded = matchingSessions.reduce((a, s) => a + s.linesAdded, 0);
    const linesRemoved = matchingSessions.reduce((a, s) => a + s.linesRemoved, 0);
    const linesWritten = matchingSessions.reduce((a, s) => a + s.linesWritten, 0);

    // Daily breakdown
    const dailyByDate = {};
    for (const s of matchingSessions) {
      const date = s.firstTs.slice(0, 10);
      if (!dailyByDate[date]) {
        dailyByDate[date] = { date, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0, cost: 0, messages: 0, linesAdded: 0, linesRemoved: 0, linesWritten: 0 };
      }
      const d = dailyByDate[date];
      d.inputTokens += s.inputTokens;
      d.outputTokens += s.outputTokens;
      d.cacheReadTokens += s.cacheReadTokens;
      d.cacheCreateTokens += s.cacheCreateTokens;
      d.cost += s.cost;
      d.messages += s.messages;
      d.linesAdded += s.linesAdded;
      d.linesRemoved += s.linesRemoved;
      d.linesWritten += s.linesWritten;
    }
    const dailyArr = Object.values(dailyByDate).sort((a, b) => a.date.localeCompare(b.date));

    // Model breakdown
    const modelMap = {};
    for (const s of matchingSessions) {
      const lbl = s.models[0];
      if (!modelMap[lbl]) modelMap[lbl] = { name: lbl, messages: 0, tokens: 0, cost: 0 };
      modelMap[lbl].messages += s.messages;
      modelMap[lbl].tokens += s.inputTokens + s.outputTokens + s.cacheReadTokens + s.cacheCreateTokens;
      modelMap[lbl].cost += s.cost;
    }
    const modelArr = Object.values(modelMap).map(m => ({ ...m, cost: Math.round(m.cost * 100) / 100 })).sort((a, b) => b.tokens - a.tokens);

    // Active time approx: messages * 1.4 min avg, capped sensibly
    const totalDurationMin = matchingSessions.reduce((a, s) => a + s.durationMin, 0);
    const totalActiveMin = Math.min(totalDurationMin, Math.round(messages * 1.4));

    return {
      name,
      totalTokens: inputT + outputT + cacheR + cacheC,
      inputTokens: inputT, outputTokens: outputT,
      cacheReadTokens: cacheR, cacheCreateTokens: cacheC,
      cost: Math.round(cost * 100) / 100,
      messages,
      sessions: matchingSessions.length,
      linesAdded, linesRemoved, linesWritten,
      firstTs: matchingSessions[0]?.firstTs || null,
      lastTs: matchingSessions[matchingSessions.length - 1]?.lastTs || null,
      totalDurationMin,
      totalActiveMin,
      models: modelArr,
      tools: [
        { name: 'Read', calls: Math.round(messages * 1.6) },
        { name: 'Edit', calls: Math.round(messages * 0.9) },
        { name: 'Bash', calls: Math.round(messages * 0.7) },
        { name: 'Grep', calls: Math.round(messages * 0.5) },
        { name: 'Glob', calls: Math.round(messages * 0.4) },
        { name: 'Write', calls: Math.round(messages * 0.3) }
      ],
      daily: dailyArr,
      sessionList: matchingSessions.slice(0, 50)
    };
  }

  // --- Devices (empty for demo — no devices configured) ---
  const devicesData = [];

  // --- Usage trends (now-anchored comparisons for the overview trend cards) ---
  const trendsData = (() => {
    const now = new Date();
    const hourShape = (h) => (h >= 9 && h <= 19) ? 0.3 + Math.sin((h - 9) / 10 * Math.PI) : (h >= 7 && h <= 23 ? 0.15 : 0.02);
    const mkBucket = (scale) => {
      const tokens = Math.round(scale * (0.75 + Math.random() * 0.5));
      const tokensNoCache = Math.round(tokens * 0.04);
      const cost = Math.round(tokens / 1e6 * 0.9 * 100) / 100;
      return { tokens, tokensNoCache, cost, costNoCache: Math.round(cost * 0.32 * 100) / 100 };
    };
    const mkHourly = (scale, upToHour) => Array.from({ length: 24 }, (_, h) =>
      (upToHour !== undefined && h > upToHour) ? { tokens: 0, tokensNoCache: 0, cost: 0, costNoCache: 0 } : mkBucket(scale * hourShape(h)));
    const mkDaily = (n, scale, upToDay) => Array.from({ length: n }, (_, i) =>
      (upToDay !== undefined && i >= upToDay) ? { tokens: 0, tokensNoCache: 0, cost: 0, costNoCache: 0 } : mkBucket(scale * (i % 7 >= 5 ? 0.45 : 1)));
    const sumOf = (arr, msgsPerM = 2.6, actPerM = 0.55) => {
      const s = { tokens: 0, tokensNoCache: 0, cost: 0, costNoCache: 0, messages: 0, activeMin: 0 };
      for (const b of arr) { s.tokens += b.tokens; s.tokensNoCache += b.tokensNoCache; s.cost += b.cost; s.costNoCache += b.costNoCache; }
      s.cost = Math.round(s.cost * 100) / 100;
      s.costNoCache = Math.round(s.costNoCache * 100) / 100;
      s.messages = Math.round(s.tokens / 1e6 * msgsPerM);
      s.activeMin = Math.round(s.tokens / 1e6 * actPerM);
      return s;
    };
    const h = now.getHours();
    const dow = (now.getDay() + 6) % 7;
    const dom = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();

    const todayCur = mkHourly(140e6, h);
    const todayPrev = mkHourly(115e6);
    const weekCur = mkDaily(7, 1.9e9, dow + 1);
    const weekPrev = mkDaily(7, 1.55e9);
    const monthCur = mkDaily(daysInMonth, 1.8e9, dom);
    const monthPrev = mkDaily(daysInPrevMonth, 1.45e9);
    const rollCur = mkDaily(7, 1.85e9);
    const rollPrev = mkDaily(7, 1.5e9);

    // 90-day series with a gentle upward trend + weekend dips
    const day90 = Array.from({ length: 90 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (89 - i));
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      const b = mkBucket(1.35e9 * (0.6 + (i / 89) * 0.8) * (weekend ? 0.4 : 1));
      return {
        date: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
        ...b,
        messages: Math.round(b.tokens / 1e6 * 2.6)
      };
    });
    const mkMom = (scale) => { const b = mkBucket(scale); return { ...b, messages: Math.round(b.tokens / 1e6 * 2.6) }; };
    const momentum = {
      windowDays: 7,
      projects: [
        { name: 'my-webapp', cur: mkMom(5.4e9), prev: mkMom(3.1e9) },
        { name: 'api-server', cur: mkMom(2.8e9), prev: mkMom(4.2e9) },
        { name: 'mobile-app', cur: mkMom(1.9e9), prev: mkMom(1.2e9) }
      ],
      models: [
        { name: 'Claude Sonnet 4.5', cur: mkMom(5.1e9), prev: mkMom(5.8e9) },
        { name: 'Claude Opus 4.6', cur: mkMom(4.2e9), prev: mkMom(2.1e9) },
        { name: 'Claude Haiku 4.5', cur: mkMom(0.8e9), prev: mkMom(0.6e9) }
      ]
    };

    const cutSum = (arr, n) => sumOf(arr.slice(0, n));
    return {
      generatedAt: now.toISOString(),
      daily90: day90,
      momentum,
      today: { current: sumOf(todayCur), prevSame: cutSum(todayPrev, h + 1), prevFull: sumOf(todayPrev), series: { cur: todayCur, prev: todayPrev } },
      week: { current: sumOf(weekCur), prevSame: cutSum(weekPrev, dow + 1), prevFull: sumOf(weekPrev), series: { cur: weekCur, prev: weekPrev } },
      month: {
        current: sumOf(monthCur), prevSame: cutSum(monthPrev, Math.min(dom, daysInPrevMonth)), prevFull: sumOf(monthPrev),
        elapsedFraction: Math.min(1, Math.max(0.03, dom / daysInMonth)),
        series: { cur: monthCur, prev: monthPrev }
      },
      rolling7: { current: sumOf(rollCur), prevSame: sumOf(rollPrev), prevFull: sumOf(rollPrev), series: { cur: rollCur, prev: rollPrev } }
    };
  })();

  // Build lookup table keyed by API endpoint path
  return {
    'overview': overview,
    'daily': dailyData,
    'sessions': sessionsData,
    'projects': projectsData,
    'models': modelsData,
    'tools': toolsData,
    'hourly': hourlyData,
    'daily-by-model': dailyByModelData,
    'hourly-by-model': Array.from({ length: 24 }, (_, h) => {
      const entry = { date: String(h).padStart(2, '0') + ':00' };
      for (const m of models) {
        const base = m.id.includes('sonnet') ? 4000 : m.id.includes('opus') ? 2500 : 1200;
        const activity = (h >= 9 && h <= 18) ? 1 + Math.sin((h - 9) / 9 * Math.PI) : (h >= 7 && h <= 22 ? 0.2 : 0);
        entry[m.label] = Math.round(base * activity * (0.7 + Math.random() * 0.6));
      }
      return entry;
    }),
    'daily-cost-breakdown': dailyCostBreakdownData,
    'cumulative-cost': cumulativeCostData,
    'day-of-week': dayOfWeekData,
    'hourly-weekday': hourlyWeekdayData,
    'cache-efficiency': cacheEfficiencyData,
    'stop-reasons': stopReasonsData,
    'session-efficiency': sessionEfficiencyData,
    'active-sessions': activeSessionsData,
    'productivity': (() => {
      const dailyProd = dailyData.map(d => {
        const dayLines = (d.linesWritten || 0) + (d.linesAdded || 0);
        const dayHours = 2 + Math.random() * 4;
        return {
          date: d.date,
          linesPerHour: dayHours > 0 ? Math.round(dayLines / dayHours) : 0,
          costPerLine: dayLines > 0 ? Math.round(d.cost / dayLines * 1000) / 1000 : 0
        };
      });
      return {
        tokensPerMin: 842,
        linesPerHour: 156,
        msgsPerSession: 20.2,
        costPerLine: 0.003,
        cacheSavings: 8.45,
        codeRatio: 34.8,
        codingHours: 56.3,
        totalLines: 8660,
        tokensPerLine: 285,
        toolsPerTurn: 2.4,
        linesPerTurn: 3.8,
        ioRatio: 12.5,
        trends: { tokensPerMin: 12, linesPerHour: -5, costPerLine: -8 },
        dailyProductivity: dailyProd,
        stopReasons: stopReasonsData
      };
    })(),
    'efficiency-trend': (() => {
      const daily = dailyData.map(d => {
        const lines = (d.linesWritten || 0) + (d.linesAdded || 0);
        return {
          date: d.date,
          tokensPerLine: lines > 0 ? Math.round(d.outputTokens / lines) : 0,
          linesPerTurn: d.messages > 0 ? Math.round((lines / d.messages) * 10) / 10 : 0,
          toolsPerTurn: d.messages > 0 ? Math.round((2.5 * d.messages / d.messages) * 10) / 10 : 0,
          ioRatio: d.inputTokens > 0 ? Math.round((d.outputTokens / d.inputTokens) * 1000) / 10 : 0
        };
      });
      const rolling = daily.map((entry, i) => {
        const w = daily.slice(Math.max(0, i - 6), i + 1);
        const avg = (f) => { const v = w.filter(x => x[f] > 0).map(x => x[f]); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length * 10) / 10 : 0; };
        return { date: entry.date, tokensPerLine: avg('tokensPerLine'), linesPerTurn: avg('linesPerTurn'), toolsPerTurn: avg('toolsPerTurn'), ioRatio: avg('ioRatio') };
      });
      return { daily, rolling };
    })(),
    'model-efficiency': [
      { model: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5', messages: 520, totalLines: 5200, tokensPerLine: 240, costPerLine: 0.002, linesPerTurn: 4.2, toolsPerTurn: 2.8, ioRatio: 14.2 },
      { model: 'claude-opus-4-6', label: 'Opus 4.6', messages: 280, totalLines: 3100, tokensPerLine: 380, costPerLine: 0.005, linesPerTurn: 3.1, toolsPerTurn: 2.1, ioRatio: 10.8 },
      { model: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', messages: 47, totalLines: 360, tokensPerLine: 120, costPerLine: 0.001, linesPerTurn: 2.6, toolsPerTurn: 1.9, ioRatio: 18.5 }
    ],
    'session-depth': (() => {
      const projects = ['token/tracker', 'claude/remote', 'smart-home', 'website'];
      return Array.from({ length: 30 }, (_, i) => {
        const msgs = 5 + Math.floor(Math.random() * 80);
        const lines = Math.floor(msgs * (1 + Math.random() * 4));
        return {
          id: 'sess-' + i,
          project: projects[i % projects.length],
          messages: msgs,
          durationMin: msgs * 2 + Math.floor(Math.random() * 60),
          totalLines: lines,
          tokensPerLine: 150 + Math.floor(Math.random() * 300),
          costPerLine: Math.round((0.001 + Math.random() * 0.008) * 1000) / 1000,
          linesPerTurn: Math.round((lines / msgs) * 10) / 10,
          toolsPerTurn: Math.round((1.5 + Math.random() * 2) * 10) / 10
        };
      });
    })(),
    'global-averages': {
      you: { totalTokens: 6994380, totalCost: 22.71, totalSessions: 42, totalMessages: 847, totalLines: 8660, cacheEfficiency: 62.4 },
      avg: { totalTokens: 5200000, totalCost: 18.50, totalSessions: 35, totalMessages: 680, totalLines: 6200, cacheEfficiency: 55.1 },
      userCount: 8
    },
    'stats-cache': { error: 'Not available in demo mode' },
    'achievements': achievementsData,
    'tool-stats': toolStatsData,
    'mcp-servers': mcpServersData,
    'subagent-stats': subagentStatsData,
    'tool-cost-daily': toolCostDailyData,
    'rate-limits': rateLimitsData,
    'usage-limits': {
      claude: claudeUsageData,
      codex: {
        enabled: true, status: 'ok', error: null,
        fetchedAt: new Date(Date.now() - 40 * 60000).toISOString(),
        data: {
          source: 'codex-logs', plan: 'plus', credits: null, reached: null, extraUsage: null, breakdown: null,
          limits: [
            { id: 'codex:300', kind: 'session', name: 'codex', limitId: 'codex', windowMinutes: 300, percentUsed: 62,
              resetsAt: new Date(Date.now() + 2 * 3600000).toISOString(), reset: false },
            { id: 'codex:10080', kind: 'weekly', name: 'codex', limitId: 'codex', windowMinutes: 10080, percentUsed: 27,
              resetsAt: new Date(Date.now() + 5 * 86400000).toISOString(), reset: false }
          ]
        }
      },
      antigravity: {
        enabled: true, status: 'ok', error: null,
        fetchedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        data: { source: 'antigravity-logs', limits: [], extraUsage: null, breakdown: null,
          lastExhaustedAt: new Date(Date.now() - 2 * 86400000).toISOString(), percentAvailable: false }
      }
    },
    'trends': trendsData,
    'github/stats': githubStatsData,
    'github/billing': githubBillingData,
    'github/actions-usage': githubActionsUsageData,
    'github/code-stats': githubCodeStatsData,
    'github/code-frequency': githubCodeFrequencyData,
    'anthropic/dashboard': anthropicDashboardData,
    'anthropic/budget': anthropicBudgetData,
    'devices': devicesData,
    'project-detail': buildProjectDetail
  };
})();
