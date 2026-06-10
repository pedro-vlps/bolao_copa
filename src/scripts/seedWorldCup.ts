import { randomUUID } from "node:crypto";

import { MatchStage, MatchStatus, TournamentStatus } from "../domain.js";
import { WORLD_CUP_2026, worldCup2026Matches } from "../data/worldCup2026.js";
import { get, now, run, transaction } from "../lib/db.js";

type SeedOptions = {
  resetTournament?: boolean;
};

export const seedWorldCup2026 = (options: SeedOptions = {}) => {
  return transaction(() => {
    if (options.resetTournament) {
      run("DELETE FROM group_members");
      run("DELETE FROM pool_groups");
      run("DELETE FROM match_predictions");
      run("DELETE FROM group_predictions");
      run("DELETE FROM matches");
      run("DELETE FROM tournament_teams");
      run("DELETE FROM tournament_groups");
      run("DELETE FROM tournaments WHERE slug = :slug", { slug: WORLD_CUP_2026.slug });
    }

    const existingTournament = get<{ id: string }>(
      "SELECT id FROM tournaments WHERE slug = :slug",
      { slug: WORLD_CUP_2026.slug }
    );

    if (existingTournament) {
      return {
        seeded: false,
        reason: "existing"
      };
    }

    const tournamentId = randomUUID();
    const timestamp = now();

    run(
      `
        INSERT INTO tournaments (id, slug, name, year, status, created_at, updated_at)
        VALUES (:id, :slug, :name, :year, :status, :created_at, :updated_at)
      `,
      {
        id: tournamentId,
        slug: WORLD_CUP_2026.slug,
        name: WORLD_CUP_2026.name,
        year: WORLD_CUP_2026.year,
        status: TournamentStatus.UPCOMING,
        created_at: timestamp,
        updated_at: timestamp
      }
    );

    const groupIds = new Map<string, string>();
    const slotToTeamId = new Map<string, string>();

    for (const [index, group] of WORLD_CUP_2026.groups.entries()) {
      const groupId = randomUUID();
      groupIds.set(group.code, groupId);

      run(
        `
          INSERT INTO tournament_groups (id, tournament_id, code, name, sort_order, created_at, updated_at)
          VALUES (:id, :tournament_id, :code, :name, :sort_order, :created_at, :updated_at)
        `,
        {
          id: groupId,
          tournament_id: tournamentId,
          code: group.code,
          name: group.name,
          sort_order: index + 1,
          created_at: timestamp,
          updated_at: timestamp
        }
      );

      for (const team of group.teams) {
        const existingTeam = get<{ id: string }>("SELECT id FROM teams WHERE code = :code", {
          code: team.code
        });
        const teamId = existingTeam?.id ?? randomUUID();

        if (existingTeam) {
          run(
            `
              UPDATE teams
              SET name = :name, short_name = :short_name, confederation = :confederation, updated_at = :updated_at
              WHERE id = :id
            `,
            {
              id: teamId,
              name: team.name,
              short_name: team.shortName,
              confederation: team.confederation,
              updated_at: timestamp
            }
          );
        } else {
          run(
            `
              INSERT INTO teams (id, name, short_name, code, confederation, created_at, updated_at)
              VALUES (:id, :name, :short_name, :code, :confederation, :created_at, :updated_at)
            `,
            {
              id: teamId,
              name: team.name,
              short_name: team.shortName,
              code: team.code,
              confederation: team.confederation,
              created_at: timestamp,
              updated_at: timestamp
            }
          );
        }

        const slotCode = `${group.code}${team.seedNumber}`;
        slotToTeamId.set(slotCode, teamId);

        run(
          `
            INSERT INTO tournament_teams (
              id, tournament_id, team_id, tournament_group_id, slot_code, seed_number, created_at, updated_at
            )
            VALUES (
              :id, :tournament_id, :team_id, :tournament_group_id, :slot_code, :seed_number, :created_at, :updated_at
            )
          `,
          {
            id: randomUUID(),
            tournament_id: tournamentId,
            team_id: teamId,
            tournament_group_id: groupId,
            slot_code: slotCode,
            seed_number: team.seedNumber,
            created_at: timestamp,
            updated_at: timestamp
          }
        );
      }
    }

    for (const match of worldCup2026Matches) {
      run(
        `
          INSERT INTO matches (
            id, tournament_id, match_number, stage, round_name, stage_order, matchday, tournament_group_id,
            kickoff_at, venue, city, home_team_id, away_team_id, home_team_label, away_team_label,
            source_home, source_away, status, created_at, updated_at
          )
          VALUES (
            :id, :tournament_id, :match_number, :stage, :round_name, :stage_order, :matchday, :tournament_group_id,
            :kickoff_at, :venue, :city, :home_team_id, :away_team_id, :home_team_label, :away_team_label,
            :source_home, :source_away, :status, :created_at, :updated_at
          )
        `,
        {
          id: randomUUID(),
          tournament_id: tournamentId,
          match_number: match.matchNumber,
          stage: match.stage,
          round_name: match.roundName,
          stage_order: match.stageOrder,
          matchday: match.matchday ?? null,
          tournament_group_id: match.groupCode ? groupIds.get(match.groupCode) ?? null : null,
          kickoff_at: match.kickoffAt,
          venue: null,
          city: null,
          home_team_id:
            match.stage === MatchStage.GROUP_STAGE && match.homeSlotCode
              ? slotToTeamId.get(match.homeSlotCode) ?? null
              : null,
          away_team_id:
            match.stage === MatchStage.GROUP_STAGE && match.awaySlotCode
              ? slotToTeamId.get(match.awaySlotCode) ?? null
              : null,
          home_team_label: match.homeTeamLabel ?? match.homeSlotCode ?? null,
          away_team_label: match.awayTeamLabel ?? match.awaySlotCode ?? null,
          source_home: match.sourceHome ?? match.homeSlotCode ?? null,
          source_away: match.sourceAway ?? match.awaySlotCode ?? null,
          status: MatchStatus.SCHEDULED,
          created_at: timestamp,
          updated_at: timestamp
        }
      );
    }

    return {
      seeded: true,
      reason: "created"
    };
  });
};
