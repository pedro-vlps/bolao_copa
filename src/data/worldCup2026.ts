import { MatchStage } from "../domain.js";

type TeamSeed = {
  name: string;
  shortName: string;
  code: string;
  confederation: string;
  seedNumber: number;
};

type GroupSeed = {
  code: string;
  name: string;
  startDate: string;
  teams: TeamSeed[];
};

type MatchSeed = {
  matchNumber: number;
  stage: MatchStage;
  roundName: string;
  stageOrder: number;
  matchday?: number;
  groupCode?: string;
  kickoffAt: string;
  homeSlotCode?: string;
  awaySlotCode?: string;
  homeTeamLabel?: string;
  awayTeamLabel?: string;
  sourceHome?: string;
  sourceAway?: string;
};

const kickoff = (date: string, hour: number) =>
  new Date(`${date}T${hour.toString().padStart(2, "0")}:00:00.000Z`).toISOString();

export const WORLD_CUP_2026 = {
  slug: "copa-do-mundo-2026",
  name: "Copa do Mundo 2026",
  year: 2026,
  groups: [
    {
      code: "A",
      name: "Grupo A",
      startDate: "2026-06-11",
      teams: [
        { name: "Mexico", shortName: "Mexico", code: "MEX", confederation: "CONCACAF", seedNumber: 1 },
        { name: "South Africa", shortName: "South Africa", code: "RSA", confederation: "CAF", seedNumber: 2 },
        { name: "South Korea", shortName: "South Korea", code: "KOR", confederation: "AFC", seedNumber: 3 },
        { name: "Czechia", shortName: "Czechia", code: "CZE", confederation: "UEFA", seedNumber: 4 }
      ]
    },
    {
      code: "B",
      name: "Grupo B",
      startDate: "2026-06-12",
      teams: [
        { name: "Canada", shortName: "Canada", code: "CAN", confederation: "CONCACAF", seedNumber: 1 },
        { name: "Bosnia and Herzegovina", shortName: "Bosnia", code: "BIH", confederation: "UEFA", seedNumber: 2 },
        { name: "Qatar", shortName: "Qatar", code: "QAT", confederation: "AFC", seedNumber: 3 },
        { name: "Switzerland", shortName: "Switzerland", code: "SUI", confederation: "UEFA", seedNumber: 4 }
      ]
    },
    {
      code: "C",
      name: "Grupo C",
      startDate: "2026-06-13",
      teams: [
        { name: "Brazil", shortName: "Brazil", code: "BRA", confederation: "CONMEBOL", seedNumber: 1 },
        { name: "Morocco", shortName: "Morocco", code: "MAR", confederation: "CAF", seedNumber: 2 },
        { name: "Haiti", shortName: "Haiti", code: "HAI", confederation: "CONCACAF", seedNumber: 3 },
        { name: "Scotland", shortName: "Scotland", code: "SCO", confederation: "UEFA", seedNumber: 4 }
      ]
    },
    {
      code: "D",
      name: "Grupo D",
      startDate: "2026-06-12",
      teams: [
        { name: "United States", shortName: "United States", code: "USA", confederation: "CONCACAF", seedNumber: 1 },
        { name: "Paraguay", shortName: "Paraguay", code: "PAR", confederation: "CONMEBOL", seedNumber: 2 },
        { name: "Australia", shortName: "Australia", code: "AUS", confederation: "AFC", seedNumber: 3 },
        { name: "Turkey", shortName: "Turkey", code: "TUR", confederation: "UEFA", seedNumber: 4 }
      ]
    },
    {
      code: "E",
      name: "Grupo E",
      startDate: "2026-06-14",
      teams: [
        { name: "Germany", shortName: "Germany", code: "GER", confederation: "UEFA", seedNumber: 1 },
        { name: "Curacao", shortName: "Curacao", code: "CUW", confederation: "CONCACAF", seedNumber: 2 },
        { name: "Ivory Coast", shortName: "Ivory Coast", code: "CIV", confederation: "CAF", seedNumber: 3 },
        { name: "Ecuador", shortName: "Ecuador", code: "ECU", confederation: "CONMEBOL", seedNumber: 4 }
      ]
    },
    {
      code: "F",
      name: "Grupo F",
      startDate: "2026-06-14",
      teams: [
        { name: "Netherlands", shortName: "Netherlands", code: "NED", confederation: "UEFA", seedNumber: 1 },
        { name: "Japan", shortName: "Japan", code: "JPN", confederation: "AFC", seedNumber: 2 },
        { name: "Sweden", shortName: "Sweden", code: "SWE", confederation: "UEFA", seedNumber: 3 },
        { name: "Tunisia", shortName: "Tunisia", code: "TUN", confederation: "CAF", seedNumber: 4 }
      ]
    },
    {
      code: "G",
      name: "Grupo G",
      startDate: "2026-06-15",
      teams: [
        { name: "Belgium", shortName: "Belgium", code: "BEL", confederation: "UEFA", seedNumber: 1 },
        { name: "Egypt", shortName: "Egypt", code: "EGY", confederation: "CAF", seedNumber: 2 },
        { name: "Iran", shortName: "Iran", code: "IRN", confederation: "AFC", seedNumber: 3 },
        { name: "New Zealand", shortName: "New Zealand", code: "NZL", confederation: "OFC", seedNumber: 4 }
      ]
    },
    {
      code: "H",
      name: "Grupo H",
      startDate: "2026-06-15",
      teams: [
        { name: "Spain", shortName: "Spain", code: "ESP", confederation: "UEFA", seedNumber: 1 },
        { name: "Cape Verde", shortName: "Cape Verde", code: "CPV", confederation: "CAF", seedNumber: 2 },
        { name: "Saudi Arabia", shortName: "Saudi Arabia", code: "KSA", confederation: "AFC", seedNumber: 3 },
        { name: "Uruguay", shortName: "Uruguay", code: "URU", confederation: "CONMEBOL", seedNumber: 4 }
      ]
    },
    {
      code: "I",
      name: "Grupo I",
      startDate: "2026-06-16",
      teams: [
        { name: "France", shortName: "France", code: "FRA", confederation: "UEFA", seedNumber: 1 },
        { name: "Senegal", shortName: "Senegal", code: "SEN", confederation: "CAF", seedNumber: 2 },
        { name: "Iraq", shortName: "Iraq", code: "IRQ", confederation: "AFC", seedNumber: 3 },
        { name: "Norway", shortName: "Norway", code: "NOR", confederation: "UEFA", seedNumber: 4 }
      ]
    },
    {
      code: "J",
      name: "Grupo J",
      startDate: "2026-06-16",
      teams: [
        { name: "Argentina", shortName: "Argentina", code: "ARG", confederation: "CONMEBOL", seedNumber: 1 },
        { name: "Algeria", shortName: "Algeria", code: "ALG", confederation: "CAF", seedNumber: 2 },
        { name: "Austria", shortName: "Austria", code: "AUT", confederation: "UEFA", seedNumber: 3 },
        { name: "Jordan", shortName: "Jordan", code: "JOR", confederation: "AFC", seedNumber: 4 }
      ]
    },
    {
      code: "K",
      name: "Grupo K",
      startDate: "2026-06-17",
      teams: [
        { name: "Portugal", shortName: "Portugal", code: "POR", confederation: "UEFA", seedNumber: 1 },
        { name: "DR Congo", shortName: "DR Congo", code: "COD", confederation: "CAF", seedNumber: 2 },
        { name: "Uzbekistan", shortName: "Uzbekistan", code: "UZB", confederation: "AFC", seedNumber: 3 },
        { name: "Colombia", shortName: "Colombia", code: "COL", confederation: "CONMEBOL", seedNumber: 4 }
      ]
    },
    {
      code: "L",
      name: "Grupo L",
      startDate: "2026-06-17",
      teams: [
        { name: "England", shortName: "England", code: "ENG", confederation: "UEFA", seedNumber: 1 },
        { name: "Croatia", shortName: "Croatia", code: "CRO", confederation: "UEFA", seedNumber: 2 },
        { name: "Ghana", shortName: "Ghana", code: "GHA", confederation: "CAF", seedNumber: 3 },
        { name: "Panama", shortName: "Panama", code: "PAN", confederation: "CONCACAF", seedNumber: 4 }
      ]
    }
  ] satisfies GroupSeed[]
};

const groupMatchPatterns = [
  { matchday: 1, homeSeed: 1, awaySeed: 2, hour: 16 },
  { matchday: 1, homeSeed: 3, awaySeed: 4, hour: 20 },
  { matchday: 2, homeSeed: 1, awaySeed: 3, hour: 16 },
  { matchday: 2, homeSeed: 4, awaySeed: 2, hour: 20 },
  { matchday: 3, homeSeed: 4, awaySeed: 1, hour: 18 },
  { matchday: 3, homeSeed: 2, awaySeed: 3, hour: 18 }
];

const groupDayOffsets = {
  1: 0,
  2: 5,
  3: 11
} as const;

const groupStageMatches: MatchSeed[] = WORLD_CUP_2026.groups.flatMap((group, groupIndex) =>
  groupMatchPatterns.map((pattern, patternIndex) => ({
    matchNumber: groupIndex * 6 + patternIndex + 1,
    stage: MatchStage.GROUP_STAGE,
    roundName: "Fase de grupos",
    stageOrder: 1,
    matchday: pattern.matchday,
    groupCode: group.code,
    kickoffAt: kickoff(
      new Date(
        new Date(`${group.startDate}T00:00:00.000Z`).getTime() +
          groupDayOffsets[pattern.matchday as 1 | 2 | 3] * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .slice(0, 10),
      pattern.hour
    ),
    homeSlotCode: `${group.code}${pattern.homeSeed}`,
    awaySlotCode: `${group.code}${pattern.awaySeed}`
  }))
);

const knockoutMatches: MatchSeed[] = [
  {
    matchNumber: 73,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-06-28", 16),
    homeTeamLabel: "1A",
    awayTeamLabel: "Melhor 3o de C/E/F/H/I",
    sourceHome: "1A",
    sourceAway: "3C/3E/3F/3H/3I"
  },
  {
    matchNumber: 74,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-06-28", 20),
    homeTeamLabel: "1B",
    awayTeamLabel: "Melhor 3o de E/F/G/I/J",
    sourceHome: "1B",
    sourceAway: "3E/3F/3G/3I/3J"
  },
  {
    matchNumber: 75,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-06-29", 16),
    homeTeamLabel: "2A",
    awayTeamLabel: "2B",
    sourceHome: "2A",
    sourceAway: "2B"
  },
  {
    matchNumber: 76,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-06-29", 20),
    homeTeamLabel: "1C",
    awayTeamLabel: "2F",
    sourceHome: "1C",
    sourceAway: "2F"
  },
  {
    matchNumber: 77,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-06-30", 16),
    homeTeamLabel: "1F",
    awayTeamLabel: "2C",
    sourceHome: "1F",
    sourceAway: "2C"
  },
  {
    matchNumber: 78,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-06-30", 20),
    homeTeamLabel: "1D",
    awayTeamLabel: "Melhor 3o de B/E/F/I/J",
    sourceHome: "1D",
    sourceAway: "3B/3E/3F/3I/3J"
  },
  {
    matchNumber: 79,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-07-01", 16),
    homeTeamLabel: "1E",
    awayTeamLabel: "Melhor 3o de A/B/C/D/F",
    sourceHome: "1E",
    sourceAway: "3A/3B/3C/3D/3F"
  },
  {
    matchNumber: 80,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-07-01", 20),
    homeTeamLabel: "2D",
    awayTeamLabel: "2G",
    sourceHome: "2D",
    sourceAway: "2G"
  },
  {
    matchNumber: 81,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-07-02", 16),
    homeTeamLabel: "1G",
    awayTeamLabel: "Melhor 3o de A/E/H/I/J",
    sourceHome: "1G",
    sourceAway: "3A/3E/3H/3I/3J"
  },
  {
    matchNumber: 82,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-07-02", 20),
    homeTeamLabel: "2E",
    awayTeamLabel: "2I",
    sourceHome: "2E",
    sourceAway: "2I"
  },
  {
    matchNumber: 83,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-07-03", 16),
    homeTeamLabel: "1I",
    awayTeamLabel: "Melhor 3o de C/D/F/G/H",
    sourceHome: "1I",
    sourceAway: "3C/3D/3F/3G/3H"
  },
  {
    matchNumber: 84,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-07-03", 20),
    homeTeamLabel: "1H",
    awayTeamLabel: "2J",
    sourceHome: "1H",
    sourceAway: "2J"
  },
  {
    matchNumber: 85,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-07-04", 16),
    homeTeamLabel: "1J",
    awayTeamLabel: "2H",
    sourceHome: "1J",
    sourceAway: "2H"
  },
  {
    matchNumber: 86,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-07-04", 20),
    homeTeamLabel: "1K",
    awayTeamLabel: "Melhor 3o de D/E/I/J/L",
    sourceHome: "1K",
    sourceAway: "3D/3E/3I/3J/3L"
  },
  {
    matchNumber: 87,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-07-05", 16),
    homeTeamLabel: "1L",
    awayTeamLabel: "Melhor 3o de E/H/I/J/K",
    sourceHome: "1L",
    sourceAway: "3E/3H/3I/3J/3K"
  },
  {
    matchNumber: 88,
    stage: MatchStage.ROUND_OF_32,
    roundName: "16 avos de final",
    stageOrder: 2,
    kickoffAt: kickoff("2026-07-05", 20),
    homeTeamLabel: "2K",
    awayTeamLabel: "2L",
    sourceHome: "2K",
    sourceAway: "2L"
  },
  { matchNumber: 89, stage: MatchStage.ROUND_OF_16, roundName: "Oitavas de final", stageOrder: 3, kickoffAt: kickoff("2026-07-06", 16), homeTeamLabel: "Vencedor J73", awayTeamLabel: "Vencedor J74", sourceHome: "W73", sourceAway: "W74" },
  { matchNumber: 90, stage: MatchStage.ROUND_OF_16, roundName: "Oitavas de final", stageOrder: 3, kickoffAt: kickoff("2026-07-06", 20), homeTeamLabel: "Vencedor J75", awayTeamLabel: "Vencedor J76", sourceHome: "W75", sourceAway: "W76" },
  { matchNumber: 91, stage: MatchStage.ROUND_OF_16, roundName: "Oitavas de final", stageOrder: 3, kickoffAt: kickoff("2026-07-07", 16), homeTeamLabel: "Vencedor J77", awayTeamLabel: "Vencedor J78", sourceHome: "W77", sourceAway: "W78" },
  { matchNumber: 92, stage: MatchStage.ROUND_OF_16, roundName: "Oitavas de final", stageOrder: 3, kickoffAt: kickoff("2026-07-07", 20), homeTeamLabel: "Vencedor J79", awayTeamLabel: "Vencedor J80", sourceHome: "W79", sourceAway: "W80" },
  { matchNumber: 93, stage: MatchStage.ROUND_OF_16, roundName: "Oitavas de final", stageOrder: 3, kickoffAt: kickoff("2026-07-08", 16), homeTeamLabel: "Vencedor J81", awayTeamLabel: "Vencedor J82", sourceHome: "W81", sourceAway: "W82" },
  { matchNumber: 94, stage: MatchStage.ROUND_OF_16, roundName: "Oitavas de final", stageOrder: 3, kickoffAt: kickoff("2026-07-08", 20), homeTeamLabel: "Vencedor J83", awayTeamLabel: "Vencedor J84", sourceHome: "W83", sourceAway: "W84" },
  { matchNumber: 95, stage: MatchStage.ROUND_OF_16, roundName: "Oitavas de final", stageOrder: 3, kickoffAt: kickoff("2026-07-09", 16), homeTeamLabel: "Vencedor J85", awayTeamLabel: "Vencedor J86", sourceHome: "W85", sourceAway: "W86" },
  { matchNumber: 96, stage: MatchStage.ROUND_OF_16, roundName: "Oitavas de final", stageOrder: 3, kickoffAt: kickoff("2026-07-09", 20), homeTeamLabel: "Vencedor J87", awayTeamLabel: "Vencedor J88", sourceHome: "W87", sourceAway: "W88" },
  { matchNumber: 97, stage: MatchStage.QUARTER_FINAL, roundName: "Quartas de final", stageOrder: 4, kickoffAt: kickoff("2026-07-11", 16), homeTeamLabel: "Vencedor J89", awayTeamLabel: "Vencedor J90", sourceHome: "W89", sourceAway: "W90" },
  { matchNumber: 98, stage: MatchStage.QUARTER_FINAL, roundName: "Quartas de final", stageOrder: 4, kickoffAt: kickoff("2026-07-11", 20), homeTeamLabel: "Vencedor J91", awayTeamLabel: "Vencedor J92", sourceHome: "W91", sourceAway: "W92" },
  { matchNumber: 99, stage: MatchStage.QUARTER_FINAL, roundName: "Quartas de final", stageOrder: 4, kickoffAt: kickoff("2026-07-12", 16), homeTeamLabel: "Vencedor J93", awayTeamLabel: "Vencedor J94", sourceHome: "W93", sourceAway: "W94" },
  { matchNumber: 100, stage: MatchStage.QUARTER_FINAL, roundName: "Quartas de final", stageOrder: 4, kickoffAt: kickoff("2026-07-12", 20), homeTeamLabel: "Vencedor J95", awayTeamLabel: "Vencedor J96", sourceHome: "W95", sourceAway: "W96" },
  { matchNumber: 101, stage: MatchStage.SEMI_FINAL, roundName: "Semifinal", stageOrder: 5, kickoffAt: kickoff("2026-07-15", 20), homeTeamLabel: "Vencedor J97", awayTeamLabel: "Vencedor J98", sourceHome: "W97", sourceAway: "W98" },
  { matchNumber: 102, stage: MatchStage.SEMI_FINAL, roundName: "Semifinal", stageOrder: 5, kickoffAt: kickoff("2026-07-16", 20), homeTeamLabel: "Vencedor J99", awayTeamLabel: "Vencedor J100", sourceHome: "W99", sourceAway: "W100" },
  { matchNumber: 103, stage: MatchStage.THIRD_PLACE, roundName: "Disputa de 3o lugar", stageOrder: 6, kickoffAt: kickoff("2026-07-18", 20), homeTeamLabel: "Perdedor J101", awayTeamLabel: "Perdedor J102", sourceHome: "L101", sourceAway: "L102" },
  { matchNumber: 104, stage: MatchStage.FINAL, roundName: "Final", stageOrder: 7, kickoffAt: kickoff("2026-07-19", 20), homeTeamLabel: "Vencedor J101", awayTeamLabel: "Vencedor J102", sourceHome: "W101", sourceAway: "W102" }
];

export const worldCup2026Matches = [...groupStageMatches, ...knockoutMatches] satisfies MatchSeed[];
