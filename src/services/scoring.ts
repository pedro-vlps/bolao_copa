import { MatchStage, MatchStatus } from "../domain.js";

type MatchLike = {
  stage: MatchStage;
  status: MatchStatus;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  winnerTeamId: string | null;
  qualifiedTeamId: string | null;
};

type PredictionLike = {
  homeScore: number;
  awayScore: number;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  predictedQualifiedTeamId: string | null;
};

export const isKnockoutStage = (stage: MatchStage) => stage !== MatchStage.GROUP_STAGE;

const getMatchOutcome = (homeScore: number, awayScore: number) => {
  if (homeScore > awayScore) {
    return "HOME";
  }

  if (awayScore > homeScore) {
    return "AWAY";
  }

  return "DRAW";
};

export const resolveActualQualifiedTeamId = (match: MatchLike) => {
  if (match.qualifiedTeamId) {
    return match.qualifiedTeamId;
  }

  if (match.winnerTeamId) {
    return match.winnerTeamId;
  }

  if (match.homeScore === null || match.awayScore === null) {
    return null;
  }

  if (match.homeScore > match.awayScore) {
    return match.homeTeamId;
  }

  if (match.awayScore > match.homeScore) {
    return match.awayTeamId;
  }

  if (match.homePenaltyScore === null || match.awayPenaltyScore === null) {
    return null;
  }

  if (match.homePenaltyScore > match.awayPenaltyScore) {
    return match.homeTeamId;
  }

  if (match.awayPenaltyScore > match.homePenaltyScore) {
    return match.awayTeamId;
  }

  return null;
};

export const resolvePredictedQualifiedTeamId = (
  match: Pick<MatchLike, "stage" | "homeTeamId" | "awayTeamId">,
  prediction: PredictionLike
) => {
  if (prediction.predictedQualifiedTeamId) {
    return prediction.predictedQualifiedTeamId;
  }

  if (!isKnockoutStage(match.stage)) {
    return null;
  }

  if (prediction.homeScore > prediction.awayScore) {
    return match.homeTeamId;
  }

  if (prediction.awayScore > prediction.homeScore) {
    return match.awayTeamId;
  }

  if (prediction.homePenaltyScore === null || prediction.awayPenaltyScore === null) {
    return null;
  }

  if (prediction.homePenaltyScore > prediction.awayPenaltyScore) {
    return match.homeTeamId;
  }

  if (prediction.awayPenaltyScore > prediction.homePenaltyScore) {
    return match.awayTeamId;
  }

  return null;
};

export const calculatePredictionPoints = (match: MatchLike, prediction: PredictionLike) => {
  if (match.status !== MatchStatus.FINISHED || match.homeScore === null || match.awayScore === null) {
    return 0;
  }

  const exactRegularScore =
    prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore;
  const penaltiesWerePlayed = match.homePenaltyScore !== null || match.awayPenaltyScore !== null;
  const exactPenaltyScore =
    !penaltiesWerePlayed ||
    (prediction.homePenaltyScore === match.homePenaltyScore &&
      prediction.awayPenaltyScore === match.awayPenaltyScore);

  if (!isKnockoutStage(match.stage)) {
    if (exactRegularScore) {
      return 3;
    }

    const actualOutcome = getMatchOutcome(match.homeScore, match.awayScore);
    const predictedOutcome = getMatchOutcome(prediction.homeScore, prediction.awayScore);
    return actualOutcome === predictedOutcome ? 1 : 0;
  }

  const actualQualifiedTeamId = resolveActualQualifiedTeamId(match);
  const predictedQualifiedTeamId = resolvePredictedQualifiedTeamId(match, prediction);

  if (
    exactRegularScore &&
    exactPenaltyScore &&
    actualQualifiedTeamId !== null &&
    predictedQualifiedTeamId === actualQualifiedTeamId
  ) {
    return 3;
  }

  return predictedQualifiedTeamId !== null && predictedQualifiedTeamId === actualQualifiedTeamId ? 1 : 0;
};
