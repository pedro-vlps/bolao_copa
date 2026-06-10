type GroupTeam = {
  id: string;
  name: string;
  code: string;
};

type MatchTeam = {
  id: string;
  name: string;
  code: string;
};

type GroupMatch = {
  homeTeam: MatchTeam | null;
  awayTeam: MatchTeam | null;
  homeScore: number | null;
  awayScore: number | null;
};

type StandingRow = {
  teamId: string;
  teamName: string;
  teamCode: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export const calculateGroupStandings = (teams: GroupTeam[], matches: GroupMatch[]) => {
  const table = new Map<string, StandingRow>();

  for (const team of teams) {
    table.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      teamCode: team.code,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    });
  }

  for (const match of matches) {
    if (
      !match.homeTeam ||
      !match.awayTeam ||
      match.homeScore === null ||
      match.awayScore === null
    ) {
      continue;
    }

    const home = table.get(match.homeTeam.id);
    const away = table.get(match.awayTeam.id);

    if (!home || !away) {
      continue;
    }

    home.played += 1;
    away.played += 1;

    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.wins += 1;
      away.losses += 1;
      home.points += 3;
    } else if (match.awayScore > match.homeScore) {
      away.wins += 1;
      home.losses += 1;
      away.points += 3;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const row of table.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
  }

  return Array.from(table.values()).sort((left, right) => {
    if (right.points !== left.points) {
      return right.points - left.points;
    }

    if (right.goalDifference !== left.goalDifference) {
      return right.goalDifference - left.goalDifference;
    }

    if (right.goalsFor !== left.goalsFor) {
      return right.goalsFor - left.goalsFor;
    }

    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }

    return left.teamName.localeCompare(right.teamName);
  });
};
