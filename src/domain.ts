export const MatchStage = {
  GROUP_STAGE: "GROUP_STAGE",
  ROUND_OF_32: "ROUND_OF_32",
  ROUND_OF_16: "ROUND_OF_16",
  QUARTER_FINAL: "QUARTER_FINAL",
  SEMI_FINAL: "SEMI_FINAL",
  THIRD_PLACE: "THIRD_PLACE",
  FINAL: "FINAL"
} as const;

export type MatchStage = (typeof MatchStage)[keyof typeof MatchStage];

export const MatchStatus = {
  SCHEDULED: "SCHEDULED",
  LIVE: "LIVE",
  FINISHED: "FINISHED"
} as const;

export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

export const TournamentStatus = {
  UPCOMING: "UPCOMING",
  LIVE: "LIVE",
  FINISHED: "FINISHED"
} as const;

export type TournamentStatus = (typeof TournamentStatus)[keyof typeof TournamentStatus];

export const GroupMemberRole = {
  OWNER: "OWNER",
  MEMBER: "MEMBER"
} as const;

export type GroupMemberRole = (typeof GroupMemberRole)[keyof typeof GroupMemberRole];
