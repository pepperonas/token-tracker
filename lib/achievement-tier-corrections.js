// Audited tier corrections for active pre-wave-3 achievements.
// Equal or higher thresholds must never have a lower tier.
// A constrained minimum-change pass kept every already-unlocked tier from the
// 2026-10-07 snapshot at or above its previous value.
module.exports = {
  ses_d10_120: 'diamond', // daysAbove10Sessions: platinum → diamond
  ses_d10_150: 'diamond', // daysAbove10Sessions: platinum → diamond
  ld_d1k_200: 'diamond', // daysAbove1kLines: gold → diamond (unlocked)
  ld_d1k_250: 'diamond', // daysAbove1kLines: platinum → diamond
  ld_d1k_300: 'diamond', // daysAbove1kLines: platinum → diamond
  msg_d2k_40: 'diamond', // daysAbove2kMsgs: gold → diamond (unlocked)
  msg_d2k_60: 'diamond', // daysAbove2kMsgs: platinum → diamond
  msg_d500_175: 'diamond', // daysAbove500Msgs: gold → diamond (unlocked)
  msg_d500_250: 'diamond', // daysAbove500Msgs: platinum → diamond
  cost_d50_200: 'diamond', // daysAbove50Cost: platinum → diamond
  cost_d50_250: 'diamond', // daysAbove50Cost: platinum → diamond
  days_5_sessions_50: 'diamond', // daysAbove5Sessions: platinum → diamond (unlocked)
  fweek2_30: 'diamond', // fullWeekendCount: gold → diamond (unlocked)
  fweek2_40: 'diamond', // fullWeekendCount: platinum → diamond
  fweek2_45: 'diamond', // fullWeekendCount: platinum → diamond
  strk2_70: 'diamond', // longestStreak: platinum → diamond
  cost_sess2_6k: 'diamond', // maxCostInSession: gold → diamond
  cost_sess2_8k: 'diamond', // maxCostInSession: platinum → diamond
  cost_day2_2k: 'diamond', // maxDayCost: gold → diamond (unlocked)
  cost_day2_2p5k: 'diamond', // maxDayCost: platinum → diamond
  cost_day2_3k: 'diamond', // maxDayCost: platinum → diamond
  ld_day2_45k: 'diamond', // maxDayLines: gold → diamond (unlocked)
  ld_day2_60k: 'diamond', // maxDayLines: platinum → diamond
  ld_day2_70k: 'diamond', // maxDayLines: platinum → diamond
  ld_sess2_120k: 'diamond', // maxLinesInSession: gold → diamond
  ld_sess2_150k: 'diamond', // maxLinesInSession: platinum → diamond
  msg_sess2_17p5k: 'diamond', // maxMessagesInSession: platinum → diamond
  msg_sess2_20k: 'diamond', // maxMessagesInSession: platinum → diamond
  msg_sess2_25k: 'diamond', // maxMessagesInSession: platinum → diamond
  prj_cost2_12k: 'diamond', // maxProjectCost: gold → diamond (unlocked)
  prj_cost2_15k: 'diamond', // maxProjectCost: platinum → diamond
  prj_msg2_30k: 'diamond', // maxProjectMessages: gold → diamond (unlocked)
  prj_msg2_40k: 'diamond', // maxProjectMessages: platinum → diamond
  prj_msg2_45k: 'diamond', // maxProjectMessages: platinum → diamond
  prj_sess2_600: 'diamond', // maxProjectSessions: gold → diamond (unlocked)
  prj_sess2_800: 'diamond', // maxProjectSessions: platinum → diamond
  prj_sess2_900: 'diamond', // maxProjectSessions: platinum → diamond
  prj_day2_25: 'diamond', // maxProjectsInDay: platinum → diamond
  ses_day2_150: 'diamond', // maxSessionsInDay: gold → diamond (unlocked)
  ses_day2_200: 'diamond', // maxSessionsInDay: platinum → diamond (unlocked)
  ln2_2m: 'diamond', // netLines: gold → diamond (unlocked)
  ln2_2p5m: 'diamond', // netLines: platinum → diamond
  ln2_3m: 'diamond', // netLines: platinum → diamond
  msg_day2_6k: 'diamond', // peakDayMessages: gold → diamond (unlocked)
  msg_day2_8k: 'diamond', // peakDayMessages: platinum → diamond (unlocked)
  msg_day2_9k: 'diamond', // peakDayMessages: platinum → diamond (unlocked)
  prj2_250: 'diamond', // projectCount: platinum → diamond
  project_35: 'diamond', // projectCount: platinum → diamond (unlocked)
  ses_100m_350: 'diamond', // sessionsAbove100Msgs: gold → diamond (unlocked)
  ses_100m_450: 'diamond', // sessionsAbove100Msgs: platinum → diamond
  ses_100m_500: 'diamond', // sessionsAbove100Msgs: platinum → diamond
  ses_500m_120: 'diamond', // sessionsAbove500Msgs: platinum → diamond (unlocked)
  ses_500m_90: 'diamond', // sessionsAbove500Msgs: gold → diamond (unlocked)
  tl_bash_120k: 'diamond', // toolCallsByName.Bash: gold → diamond (unlocked)
  tl_bash_150k: 'diamond', // toolCallsByName.Bash: platinum → diamond (unlocked)
  tool_glob_10k: 'diamond', // toolCallsByName.Glob: gold → diamond
  tool_glob_50k: 'diamond', // toolCallsByName.Glob: platinum → diamond
  tool_grep_50k: 'diamond', // toolCallsByName.Grep: platinum → diamond
  tool_write_50k: 'diamond', // toolCallsByName.Write: platinum → diamond
  tcnt2_120: 'diamond', // toolCount: platinum → diamond
  tcnt2_90: 'diamond', // toolCount: gold → diamond
  ccw2_1p75b: 'diamond', // totalCacheCreateTokens: gold → diamond (unlocked)
  ccw2_2b: 'diamond', // totalCacheCreateTokens: platinum → diamond (unlocked)
  ccw2_2p5b: 'diamond', // totalCacheCreateTokens: platinum → diamond
  cache_read2_120b: 'diamond', // totalCacheReadTokens: platinum → diamond (unlocked)
  cache_read2_90b: 'diamond', // totalCacheReadTokens: gold → diamond (unlocked)
  cost2_70k: 'diamond', // totalCost: gold → diamond (unlocked)
  cost2_80k: 'diamond', // totalCost: platinum → diamond (unlocked)
  cost2_90k: 'diamond', // totalCost: platinum → diamond
  input_50m: 'diamond', // totalInputTokens: platinum → diamond (unlocked)
  la2_1p2m: 'diamond', // totalLinesAdded: platinum → diamond
  la2_800k: 'diamond', // totalLinesAdded: gold → diamond
  ld2_350k: 'diamond', // totalLinesRemoved: gold → diamond
  ld2_450k: 'diamond', // totalLinesRemoved: platinum → diamond
  lw2_1p5m: 'diamond', // totalLinesWritten: gold → diamond (unlocked)
  lw2_1p75m: 'diamond', // totalLinesWritten: platinum → diamond
  messages_20k: 'platinum', // totalMessages: gold → platinum (unlocked)
  messages_25k: 'platinum', // totalMessages: gold → platinum (unlocked)
  msg2_300k: 'diamond', // totalMessages: gold → diamond (unlocked)
  msg2_350k: 'diamond', // totalMessages: platinum → diamond (unlocked)
  msg2_400k: 'diamond', // totalMessages: platinum → diamond
  out2_200m: 'diamond', // totalOutputTokens: gold → diamond (unlocked)
  ses2_4k: 'diamond', // totalSessions: gold → diamond (unlocked)
  ses2_6k: 'diamond', // totalSessions: platinum → diamond
  lm_tokens_100b: 'diamond', // totalTokens: platinum → diamond (unlocked)
  tok2_120b: 'diamond', // totalTokens: platinum → diamond (unlocked)
  tok2_90b: 'diamond', // totalTokens: gold → diamond (unlocked)
  tc2_300k: 'diamond', // totalToolCalls: platinum → diamond (unlocked)
  tc2_350k: 'diamond', // totalToolCalls: platinum → diamond
  tc2_400k: 'diamond', // totalToolCalls: platinum → diamond
  mdl_triple_120: 'diamond', // tripleModelDayCount: platinum → diamond (unlocked)
  mdl_triple_150: 'diamond', // tripleModelDayCount: platinum → diamond
  weeks_active_100: 'diamond', // uniqueWeeksActive: platinum → diamond
  weeks2_45: 'gold', // uniqueWeeksActive: platinum → gold
};
