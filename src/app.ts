import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

import cors from "cors";
import express from "express";
import { z } from "zod";

import { GroupMemberRole, MatchStage, MatchStatus, TournamentStatus } from "./domain.js";
import { all, get, initDatabase, now, run, transaction, type NamedParams } from "./lib/db.js";
import {
  calculatePredictionPoints,
  isKnockoutStage,
  resolvePredictedQualifiedTeamId
} from "./services/scoring.js";
import { calculateGroupStandings } from "./services/standings.js";

initDatabase();

const createSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const createInviteCode = () => randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

const MATCH_SELECT = `
  SELECT
    m.id,
    m.tournament_id,
    m.match_number,
    m.stage,
    m.round_name,
    m.stage_order,
    m.matchday,
    m.tournament_group_id,
    m.kickoff_at,
    m.home_team_id,
    m.away_team_id,
    m.home_team_label,
    m.away_team_label,
    m.source_home,
    m.source_away,
    m.home_score,
    m.away_score,
    m.home_penalty_score,
    m.away_penalty_score,
    m.winner_team_id,
    m.qualified_team_id,
    m.status,
    tg.id AS group_id,
    tg.code AS group_code,
    tg.name AS group_name,
    ht.id AS home_join_id,
    ht.name AS home_name,
    ht.short_name AS home_short_name,
    ht.code AS home_code,
    at.id AS away_join_id,
    at.name AS away_name,
    at.short_name AS away_short_name,
    at.code AS away_code,
    qt.id AS qualified_join_id,
    qt.name AS qualified_name,
    qt.short_name AS qualified_short_name,
    qt.code AS qualified_code
  FROM matches m
  JOIN tournaments t ON t.id = m.tournament_id
  LEFT JOIN tournament_groups tg ON tg.id = m.tournament_group_id
  LEFT JOIN teams ht ON ht.id = m.home_team_id
  LEFT JOIN teams at ON at.id = m.away_team_id
  LEFT JOIN teams qt ON qt.id = m.qualified_team_id
`;

const loadMatch = (matchId: string) =>
  get<any>(`${MATCH_SELECT} WHERE m.id = :matchId`, { matchId });

const loadMatches = (filters: {
  tournamentSlug?: string;
  stage?: string;
  groupCode?: string;
  status?: string;
}) => {
  const conditions: string[] = [];
  const params: NamedParams = {};

  if (filters.tournamentSlug) {
    conditions.push("t.slug = :tournamentSlug");
    params.tournamentSlug = filters.tournamentSlug;
  }

  if (filters.stage) {
    conditions.push("m.stage = :stage");
    params.stage = filters.stage;
  }

  if (filters.groupCode) {
    conditions.push("tg.code = :groupCode");
    params.groupCode = filters.groupCode;
  }

  if (filters.status) {
    conditions.push("m.status = :status");
    params.status = filters.status;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return all<any>(
    `${MATCH_SELECT} ${whereClause} ORDER BY datetime(m.kickoff_at) ASC, m.match_number ASC`,
    params
  );
};

const serializeMatch = (match: any) => ({
  id: match.id,
  matchNumber: match.match_number,
  stage: match.stage,
  roundName: match.round_name,
  matchday: match.matchday,
  group: match.group_id
    ? {
        id: match.group_id,
        code: match.group_code,
        name: match.group_name
      }
    : null,
  kickoffAt: match.kickoff_at,
  status: match.status,
  homeTeam: match.home_join_id
    ? {
        id: match.home_join_id,
        name: match.home_name,
        shortName: match.home_short_name,
        code: match.home_code
      }
    : null,
  awayTeam: match.away_join_id
    ? {
        id: match.away_join_id,
        name: match.away_name,
        shortName: match.away_short_name,
        code: match.away_code
      }
    : null,
  homeTeamLabel: match.home_team_label,
  awayTeamLabel: match.away_team_label,
  sourceHome: match.source_home,
  sourceAway: match.source_away,
  score: {
    home: match.home_score,
    away: match.away_score,
    homePenalty: match.home_penalty_score,
    awayPenalty: match.away_penalty_score
  },
  qualifiedTeam: match.qualified_join_id
    ? {
        id: match.qualified_join_id,
        name: match.qualified_name,
        shortName: match.qualified_short_name,
        code: match.qualified_code
      }
    : null
});

const upsertMatchPredictionSchema = z.object({
  userId: z.string().min(1),
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  homePenaltyScore: z.number().int().min(0).nullable().optional(),
  awayPenaltyScore: z.number().int().min(0).nullable().optional(),
  predictedQualifiedTeamId: z.string().min(1).nullable().optional()
});

const updateResultSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  homePenaltyScore: z.number().int().min(0).nullable().optional(),
  awayPenaltyScore: z.number().int().min(0).nullable().optional()
});

export const app = express();
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const publicDirectory = path.resolve(currentDirectory, "..", "..", "public");

app.use(cors());
app.use(express.json());
app.use(express.static(publicDirectory));

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/tournaments", (_request, response, next) => {
  try {
    const tournaments = all<any>(
      `
        SELECT
          t.*,
          (SELECT COUNT(*) FROM tournament_groups g WHERE g.tournament_id = t.id) AS groups_count,
          (SELECT COUNT(*) FROM matches m WHERE m.tournament_id = t.id) AS matches_count,
          (SELECT COUNT(*) FROM pool_groups pg WHERE pg.tournament_id = t.id) AS pool_groups_count
        FROM tournaments t
        ORDER BY year DESC, name ASC
      `
    );

    response.json(
      tournaments.map((tournament) => ({
        id: tournament.id,
        slug: tournament.slug,
        name: tournament.name,
        year: tournament.year,
        status: tournament.status,
        counts: {
          groups: tournament.groups_count,
          matches: tournament.matches_count,
          poolGroups: tournament.pool_groups_count
        }
      }))
    );
  } catch (error) {
    next(error);
  }
});

app.get("/tournaments/:slug/overview", (request, response, next) => {
  try {
    const tournament = get<any>("SELECT * FROM tournaments WHERE slug = :slug", {
      slug: request.params.slug
    });

    if (!tournament) {
      response.status(404).json({ message: "Torneio nao encontrado." });
      return;
    }

    const groups = all<any>(
      `
        SELECT
          g.id AS group_id,
          g.code AS group_code,
          g.name AS group_name,
          tt.slot_code,
          tt.seed_number,
          tm.id AS team_id,
          tm.name AS team_name,
          tm.short_name AS team_short_name,
          tm.code AS team_code,
          tm.confederation
        FROM tournament_groups g
        JOIN tournament_teams tt ON tt.tournament_group_id = g.id
        JOIN teams tm ON tm.id = tt.team_id
        WHERE g.tournament_id = :tournamentId
        ORDER BY g.sort_order ASC, tt.seed_number ASC
      `,
      { tournamentId: tournament.id }
    );

    const grouped = new Map<string, any>();
    for (const row of groups) {
      if (!grouped.has(row.group_id)) {
        grouped.set(row.group_id, {
          id: row.group_id,
          code: row.group_code,
          name: row.group_name,
          teams: []
        });
      }

      grouped.get(row.group_id).teams.push({
        id: row.team_id,
        slotCode: row.slot_code,
        name: row.team_name,
        shortName: row.team_short_name,
        code: row.team_code,
        confederation: row.confederation
      });
    }

    const counts = get<any>(
      `
        SELECT
          (SELECT COUNT(*) FROM matches m WHERE m.tournament_id = :tournamentId) AS matches_count,
          (SELECT COUNT(*) FROM pool_groups pg WHERE pg.tournament_id = :tournamentId) AS pool_groups_count
      `,
      { tournamentId: tournament.id }
    );

    response.json({
      id: tournament.id,
      slug: tournament.slug,
      name: tournament.name,
      year: tournament.year,
      status: tournament.status,
      groups: Array.from(grouped.values()),
      counts: {
        matches: counts?.matches_count ?? 0,
        poolGroups: counts?.pool_groups_count ?? 0
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/tournaments/:slug/groups/:code/standings", (request, response, next) => {
  try {
    const group = get<any>(
      `
        SELECT g.*
        FROM tournament_groups g
        JOIN tournaments t ON t.id = g.tournament_id
        WHERE t.slug = :slug AND g.code = :code
      `,
      {
        slug: request.params.slug,
        code: request.params.code.toUpperCase()
      }
    );

    if (!group) {
      response.status(404).json({ message: "Grupo nao encontrado." });
      return;
    }

    const teams = all<any>(
      `
        SELECT tm.id, tm.name, tm.code
        FROM tournament_teams tt
        JOIN teams tm ON tm.id = tt.team_id
        WHERE tt.tournament_group_id = :groupId
        ORDER BY tt.seed_number ASC
      `,
      { groupId: group.id }
    );

    const matches = all<any>(
      `
        SELECT
          m.home_score,
          m.away_score,
          ht.id AS home_team_id,
          ht.name AS home_team_name,
          ht.code AS home_team_code,
          at.id AS away_team_id,
          at.name AS away_team_name,
          at.code AS away_team_code
        FROM matches m
        LEFT JOIN teams ht ON ht.id = m.home_team_id
        LEFT JOIN teams at ON at.id = m.away_team_id
        WHERE m.tournament_group_id = :groupId AND m.status = :status
      `,
      { groupId: group.id, status: MatchStatus.FINISHED }
    );

    const standings = calculateGroupStandings(
      teams,
      matches.map((match) => ({
        homeTeam: match.home_team_id
          ? {
              id: match.home_team_id,
              name: match.home_team_name,
              code: match.home_team_code
            }
          : null,
        awayTeam: match.away_team_id
          ? {
              id: match.away_team_id,
              name: match.away_team_name,
              code: match.away_team_code
            }
          : null,
        homeScore: match.home_score,
        awayScore: match.away_score
      }))
    );

    response.json({
      group: {
        id: group.id,
        code: group.code,
        name: group.name
      },
      standings
    });
  } catch (error) {
    next(error);
  }
});

app.get("/matches", (request, response, next) => {
  try {
    const querySchema = z.object({
      tournamentSlug: z.string().optional(),
      stage: z.string().optional(),
      groupCode: z.string().optional(),
      status: z.string().optional()
    });

    const query = querySchema.parse(request.query);

    const matches = loadMatches({
      tournamentSlug: query.tournamentSlug,
      stage: query.stage,
      groupCode: query.groupCode?.toUpperCase(),
      status: query.status
    });

    response.json(matches.map(serializeMatch));
  } catch (error) {
    next(error);
  }
});

app.post("/users", (request, response, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email().optional()
    });

    const body = schema.parse(request.body);
    const userId = randomUUID();
    const timestamp = now();

    run(
      `
        INSERT INTO users (id, name, email, created_at, updated_at)
        VALUES (:id, :name, :email, :created_at, :updated_at)
      `,
      {
        id: userId,
        name: body.name,
        email: body.email ?? null,
        created_at: timestamp,
        updated_at: timestamp
      }
    );

    response.status(201).json(
      get<any>("SELECT id, name, email, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = :id", {
        id: userId
      })
    );
  } catch (error) {
    next(error);
  }
});

app.post("/pool-groups", (request, response, next) => {
  try {
    const schema = z.object({
      name: z.string().min(3),
      ownerId: z.string().min(1),
      tournamentSlug: z.string().min(1)
    });

    const body = schema.parse(request.body);
    const owner = get<any>("SELECT * FROM users WHERE id = :id", { id: body.ownerId });
    const tournament = get<any>("SELECT * FROM tournaments WHERE slug = :slug", {
      slug: body.tournamentSlug
    });

    if (!owner) {
      response.status(404).json({ message: "Usuario dono nao encontrado." });
      return;
    }

    if (!tournament) {
      response.status(404).json({ message: "Torneio nao encontrado." });
      return;
    }

    const groupId = randomUUID();
    const timestamp = now();

    transaction(() => {
      run(
        `
          INSERT INTO pool_groups (id, name, slug, invite_code, owner_id, tournament_id, created_at, updated_at)
          VALUES (:id, :name, :slug, :invite_code, :owner_id, :tournament_id, :created_at, :updated_at)
        `,
        {
          id: groupId,
          name: body.name,
          slug: `${createSlug(body.name)}-${createInviteCode().toLowerCase()}`,
          invite_code: createInviteCode(),
          owner_id: owner.id,
          tournament_id: tournament.id,
          created_at: timestamp,
          updated_at: timestamp
        }
      );

      run(
        `
          INSERT INTO group_members (id, user_id, pool_group_id, role, joined_at)
          VALUES (:id, :user_id, :pool_group_id, :role, :joined_at)
        `,
        {
          id: randomUUID(),
          user_id: owner.id,
          pool_group_id: groupId,
          role: GroupMemberRole.OWNER,
          joined_at: timestamp
        }
      );
    });

    response.status(201).json(
      get<any>(
        `
          SELECT
            pg.id,
            pg.name,
            pg.slug,
            pg.invite_code AS inviteCode,
            t.id AS tournamentId,
            t.slug AS tournamentSlug,
            t.name AS tournamentName
          FROM pool_groups pg
          JOIN tournaments t ON t.id = pg.tournament_id
          WHERE pg.id = :id
        `,
        { id: groupId }
      )
    );
  } catch (error) {
    next(error);
  }
});

app.post("/pool-groups/join", (request, response, next) => {
  try {
    const schema = z.object({
      inviteCode: z.string().min(6),
      userId: z.string().min(1)
    });

    const body = schema.parse(request.body);
    const poolGroup = get<any>("SELECT * FROM pool_groups WHERE invite_code = :invite_code", {
      invite_code: body.inviteCode.toUpperCase()
    });
    const user = get<any>("SELECT * FROM users WHERE id = :id", { id: body.userId });

    if (!poolGroup) {
      response.status(404).json({ message: "Codigo de convite invalido." });
      return;
    }

    if (!user) {
      response.status(404).json({ message: "Usuario nao encontrado." });
      return;
    }

    run(
      `
        INSERT INTO group_members (id, user_id, pool_group_id, role, joined_at)
        VALUES (:id, :user_id, :pool_group_id, :role, :joined_at)
        ON CONFLICT(user_id, pool_group_id) DO NOTHING
      `,
      {
        id: randomUUID(),
        user_id: user.id,
        pool_group_id: poolGroup.id,
        role: GroupMemberRole.MEMBER,
        joined_at: now()
      }
    );

    response.status(201).json({
      userId: user.id,
      poolGroupId: poolGroup.id,
      inviteCode: poolGroup.invite_code
    });
  } catch (error) {
    next(error);
  }
});

app.get("/pool-groups/:id/leaderboard", (request, response, next) => {
  try {
    const poolGroup = get<any>(
      `
        SELECT
          pg.*,
          t.name AS tournament_name,
          t.slug AS tournament_slug
        FROM pool_groups pg
        JOIN tournaments t ON t.id = pg.tournament_id
        WHERE pg.id = :id
      `,
      { id: request.params.id }
    );

    if (!poolGroup) {
      response.status(404).json({ message: "Grupo nao encontrado." });
      return;
    }

    const members = all<any>(
      `
        SELECT
          gm.user_id,
          gm.role,
          u.name
        FROM group_members gm
        JOIN users u ON u.id = gm.user_id
        WHERE gm.pool_group_id = :pool_group_id
      `,
      { pool_group_id: poolGroup.id }
    );

    const totals = all<any>(
      `
        SELECT
          mp.user_id,
          COALESCE(SUM(mp.points_awarded), 0) AS total_points
        FROM group_members gm
        JOIN matches m ON m.tournament_id = :tournament_id
        LEFT JOIN match_predictions mp ON mp.user_id = gm.user_id AND mp.match_id = m.id
        WHERE gm.pool_group_id = :pool_group_id
        GROUP BY mp.user_id
      `,
      {
        pool_group_id: poolGroup.id,
        tournament_id: poolGroup.tournament_id
      }
    );

    const pointsByUser = new Map<string, number>();
    for (const row of totals) {
      if (row.user_id) {
        pointsByUser.set(row.user_id, Number(row.total_points));
      }
    }

    response.json({
      group: {
        id: poolGroup.id,
        name: poolGroup.name,
        inviteCode: poolGroup.invite_code,
        tournament: {
          slug: poolGroup.tournament_slug,
          name: poolGroup.tournament_name
        }
      },
      leaderboard: members
        .map((member) => ({
          userId: member.user_id,
          name: member.name,
          role: member.role,
          points: pointsByUser.get(member.user_id) ?? 0
        }))
        .sort((left, right) => right.points - left.points || left.name.localeCompare(right.name))
    });
  } catch (error) {
    next(error);
  }
});

app.post("/predictions/matches", (request, response, next) => {
  try {
    const body = upsertMatchPredictionSchema.parse(request.body);
    const user = get<any>("SELECT * FROM users WHERE id = :id", { id: body.userId });
    const match = loadMatch(body.matchId);

    if (!user) {
      response.status(404).json({ message: "Usuario nao encontrado." });
      return;
    }

    if (!match) {
      response.status(404).json({ message: "Partida nao encontrada." });
      return;
    }

    if (new Date() >= new Date(match.kickoff_at)) {
      response.status(409).json({ message: "Palpite bloqueado. A partida ja comecou." });
      return;
    }

    if (isKnockoutStage(match.stage) && body.homeScore === body.awayScore) {
      if (body.homePenaltyScore === undefined || body.awayPenaltyScore === undefined) {
        response.status(400).json({
          message: "Partidas de mata-mata empatadas exigem placar de penaltis."
        });
        return;
      }
    }

    if (isKnockoutStage(match.stage)) {
      const predictedQualifiedTeamId = resolvePredictedQualifiedTeamId(
        {
          stage: match.stage,
          homeTeamId: match.home_team_id,
          awayTeamId: match.away_team_id
        },
        {
          homeScore: body.homeScore,
          awayScore: body.awayScore,
          homePenaltyScore: body.homePenaltyScore ?? null,
          awayPenaltyScore: body.awayPenaltyScore ?? null,
          predictedQualifiedTeamId: body.predictedQualifiedTeamId ?? null
        }
      );

      if (predictedQualifiedTeamId === null) {
        response.status(400).json({
          message: "Nao foi possivel determinar quem se classificou com esse palpite."
        });
        return;
      }
    }

    const payload = {
      homeScore: body.homeScore,
      awayScore: body.awayScore,
      homePenaltyScore: body.homePenaltyScore ?? null,
      awayPenaltyScore: body.awayPenaltyScore ?? null,
      predictedQualifiedTeamId: body.predictedQualifiedTeamId ?? null
    };

    const pointsAwarded = calculatePredictionPoints(
      {
        stage: match.stage,
        status: match.status,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        homeScore: match.home_score,
        awayScore: match.away_score,
        homePenaltyScore: match.home_penalty_score,
        awayPenaltyScore: match.away_penalty_score,
        winnerTeamId: match.winner_team_id,
        qualifiedTeamId: match.qualified_team_id
      },
      payload
    );

    run(
      `
        INSERT INTO match_predictions (
          id, user_id, match_id, home_score, away_score, home_penalty_score,
          away_penalty_score, predicted_qualified_team_id, points_awarded, created_at, updated_at
        )
        VALUES (
          :id, :user_id, :match_id, :home_score, :away_score, :home_penalty_score,
          :away_penalty_score, :predicted_qualified_team_id, :points_awarded, :created_at, :updated_at
        )
        ON CONFLICT(user_id, match_id) DO UPDATE SET
          home_score = excluded.home_score,
          away_score = excluded.away_score,
          home_penalty_score = excluded.home_penalty_score,
          away_penalty_score = excluded.away_penalty_score,
          predicted_qualified_team_id = excluded.predicted_qualified_team_id,
          points_awarded = excluded.points_awarded,
          updated_at = excluded.updated_at
      `,
      {
        id: randomUUID(),
        user_id: user.id,
        match_id: match.id,
        home_score: payload.homeScore,
        away_score: payload.awayScore,
        home_penalty_score: payload.homePenaltyScore,
        away_penalty_score: payload.awayPenaltyScore,
        predicted_qualified_team_id: payload.predictedQualifiedTeamId,
        points_awarded: pointsAwarded,
        created_at: now(),
        updated_at: now()
      }
    );

    response.status(201).json(
      get<any>(
        `
          SELECT
            id,
            user_id AS userId,
            match_id AS matchId,
            home_score AS homeScore,
            away_score AS awayScore,
            home_penalty_score AS homePenaltyScore,
            away_penalty_score AS awayPenaltyScore,
            predicted_qualified_team_id AS predictedQualifiedTeamId,
            points_awarded AS pointsAwarded
          FROM match_predictions
          WHERE user_id = :user_id AND match_id = :match_id
        `,
        {
          user_id: user.id,
          match_id: match.id
        }
      )
    );
  } catch (error) {
    next(error);
  }
});

app.post("/predictions/groups", (request, response, next) => {
  try {
    const schema = z.object({
      userId: z.string().min(1),
      tournamentGroupId: z.string().min(1),
      placements: z.array(z.string().min(1)).length(4)
    });

    const body = schema.parse(request.body);

    if (new Set(body.placements).size !== 4) {
      response.status(400).json({ message: "Cada posicao do grupo precisa de um time diferente." });
      return;
    }

    const user = get<any>("SELECT * FROM users WHERE id = :id", { id: body.userId });
    const tournamentGroup = get<any>("SELECT * FROM tournament_groups WHERE id = :id", {
      id: body.tournamentGroupId
    });

    if (!user) {
      response.status(404).json({ message: "Usuario nao encontrado." });
      return;
    }

    if (!tournamentGroup) {
      response.status(404).json({ message: "Grupo do torneio nao encontrado." });
      return;
    }

    const validTeams = all<any>(
      "SELECT team_id FROM tournament_teams WHERE tournament_group_id = :groupId",
      { groupId: body.tournamentGroupId }
    );
    const validTeamIds = new Set(validTeams.map((team) => team.team_id));

    if (body.placements.some((teamId) => !validTeamIds.has(teamId))) {
      response.status(400).json({ message: "Os times enviados nao pertencem a esse grupo." });
      return;
    }

    transaction(() => {
      run(
        "DELETE FROM group_predictions WHERE user_id = :userId AND tournament_group_id = :groupId",
        {
          userId: user.id,
          groupId: tournamentGroup.id
        }
      );

      for (const [index, teamId] of body.placements.entries()) {
        run(
          `
            INSERT INTO group_predictions (
              id, user_id, tournament_group_id, team_id, predicted_position, created_at, updated_at
            )
            VALUES (:id, :user_id, :tournament_group_id, :team_id, :predicted_position, :created_at, :updated_at)
          `,
          {
            id: randomUUID(),
            user_id: user.id,
            tournament_group_id: tournamentGroup.id,
            team_id: teamId,
            predicted_position: index + 1,
            created_at: now(),
            updated_at: now()
          }
        );
      }
    });

    response.status(201).json(
      all<any>(
        `
          SELECT
            gp.id,
            gp.predicted_position AS predictedPosition,
            tm.id AS teamId,
            tm.name AS teamName,
            tm.code AS teamCode
          FROM group_predictions gp
          JOIN teams tm ON tm.id = gp.team_id
          WHERE gp.user_id = :userId AND gp.tournament_group_id = :groupId
          ORDER BY gp.predicted_position ASC
        `,
        {
          userId: user.id,
          groupId: tournamentGroup.id
        }
      )
    );
  } catch (error) {
    next(error);
  }
});

app.get("/predictions/users/:userId", (request, response, next) => {
  try {
    const querySchema = z.object({
      tournamentSlug: z.string().optional()
    });

    const query = querySchema.parse(request.query);
    const user = get<any>("SELECT * FROM users WHERE id = :id", { id: request.params.userId });

    if (!user) {
      response.status(404).json({ message: "Usuario nao encontrado." });
      return;
    }

    const predictionRows = all<any>(
      `
        SELECT
          mp.*,
          t.slug AS tournament_slug,
          qt.name AS predicted_qualified_team_name,
          qt.code AS predicted_qualified_team_code
        FROM match_predictions mp
        JOIN matches m ON m.id = mp.match_id
        JOIN tournaments t ON t.id = m.tournament_id
        LEFT JOIN teams qt ON qt.id = mp.predicted_qualified_team_id
        WHERE mp.user_id = :userId
          ${query.tournamentSlug ? "AND t.slug = :tournamentSlug" : ""}
        ORDER BY datetime(m.kickoff_at) ASC
      `,
      query.tournamentSlug
        ? {
            userId: user.id,
            tournamentSlug: query.tournamentSlug
          }
        : { userId: user.id }
    );

    const matchPredictions = predictionRows.map((prediction) => {
      const match = loadMatch(prediction.match_id);
      return {
        id: prediction.id,
        match: match ? serializeMatch(match) : null,
        homeScore: prediction.home_score,
        awayScore: prediction.away_score,
        homePenaltyScore: prediction.home_penalty_score,
        awayPenaltyScore: prediction.away_penalty_score,
        predictedQualifiedTeam: prediction.predicted_qualified_team_name
          ? {
              id: prediction.predicted_qualified_team_id,
              name: prediction.predicted_qualified_team_name,
              code: prediction.predicted_qualified_team_code
            }
          : null,
        pointsAwarded: prediction.points_awarded
      };
    });

    const groupPredictions = all<any>(
      `
        SELECT
          gp.id,
          gp.predicted_position AS predictedPosition,
          tg.id AS groupId,
          tg.code AS groupCode,
          tg.name AS groupName,
          tm.id AS teamId,
          tm.name AS teamName,
          tm.code AS teamCode
        FROM group_predictions gp
        JOIN tournament_groups tg ON tg.id = gp.tournament_group_id
        JOIN tournaments t ON t.id = tg.tournament_id
        JOIN teams tm ON tm.id = gp.team_id
        WHERE gp.user_id = :userId
          ${query.tournamentSlug ? "AND t.slug = :tournamentSlug" : ""}
        ORDER BY tg.sort_order ASC, gp.predicted_position ASC
      `,
      query.tournamentSlug
        ? {
            userId: user.id,
            tournamentSlug: query.tournamentSlug
          }
        : { userId: user.id }
    );

    response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      matchPredictions,
      groupPredictions
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/matches/:id/result", (request, response, next) => {
  try {
    const body = updateResultSchema.parse(request.body);
    const match = loadMatch(request.params.id);

    if (!match) {
      response.status(404).json({ message: "Partida nao encontrada." });
      return;
    }

    if (isKnockoutStage(match.stage) && body.homeScore === body.awayScore) {
      if (body.homePenaltyScore === undefined || body.awayPenaltyScore === undefined) {
        response.status(400).json({ message: "Empates no mata-mata exigem placar de penaltis." });
        return;
      }
    }

    let winnerTeamId: string | null = null;
    let qualifiedTeamId: string | null = null;

    if (body.homeScore > body.awayScore) {
      winnerTeamId = match.home_team_id;
      qualifiedTeamId = match.home_team_id;
    } else if (body.awayScore > body.homeScore) {
      winnerTeamId = match.away_team_id;
      qualifiedTeamId = match.away_team_id;
    } else if (isKnockoutStage(match.stage)) {
      const homePenaltyScore = body.homePenaltyScore ?? null;
      const awayPenaltyScore = body.awayPenaltyScore ?? null;

      if (homePenaltyScore === null || awayPenaltyScore === null || homePenaltyScore === awayPenaltyScore) {
        response.status(400).json({ message: "Os penaltis precisam definir um classificado no mata-mata." });
        return;
      }

      if (homePenaltyScore > awayPenaltyScore) {
        winnerTeamId = match.home_team_id;
        qualifiedTeamId = match.home_team_id;
      } else {
        winnerTeamId = match.away_team_id;
        qualifiedTeamId = match.away_team_id;
      }
    }

    run(
      `
        UPDATE matches
        SET
          home_score = :home_score,
          away_score = :away_score,
          home_penalty_score = :home_penalty_score,
          away_penalty_score = :away_penalty_score,
          winner_team_id = :winner_team_id,
          qualified_team_id = :qualified_team_id,
          status = :status,
          updated_at = :updated_at
        WHERE id = :id
      `,
      {
        id: match.id,
        home_score: body.homeScore,
        away_score: body.awayScore,
        home_penalty_score: body.homePenaltyScore ?? null,
        away_penalty_score: body.awayPenaltyScore ?? null,
        winner_team_id: winnerTeamId,
        qualified_team_id: isKnockoutStage(match.stage) ? qualifiedTeamId : null,
        status: MatchStatus.FINISHED,
        updated_at: now()
      }
    );

    const updatedMatch = loadMatch(match.id);
    const predictions = all<any>("SELECT * FROM match_predictions WHERE match_id = :matchId", {
      matchId: match.id
    });

    for (const prediction of predictions) {
      const pointsAwarded = calculatePredictionPoints(
        {
          stage: updatedMatch.stage,
          status: updatedMatch.status,
          homeTeamId: updatedMatch.home_team_id,
          awayTeamId: updatedMatch.away_team_id,
          homeScore: updatedMatch.home_score,
          awayScore: updatedMatch.away_score,
          homePenaltyScore: updatedMatch.home_penalty_score,
          awayPenaltyScore: updatedMatch.away_penalty_score,
          winnerTeamId: updatedMatch.winner_team_id,
          qualifiedTeamId: updatedMatch.qualified_team_id
        },
        {
          homeScore: prediction.home_score,
          awayScore: prediction.away_score,
          homePenaltyScore: prediction.home_penalty_score,
          awayPenaltyScore: prediction.away_penalty_score,
          predictedQualifiedTeamId: prediction.predicted_qualified_team_id
        }
      );

      run(
        "UPDATE match_predictions SET points_awarded = :points, updated_at = :updated_at WHERE id = :id",
        {
          id: prediction.id,
          points: pointsAwarded,
          updated_at: now()
        }
      );
    }

    response.json(serializeMatch(updatedMatch));
  } catch (error) {
    next(error);
  }
});

app.patch("/matches/:id/participants", (request, response, next) => {
  try {
    const schema = z.object({
      homeTeamId: z.string().nullable().optional(),
      awayTeamId: z.string().nullable().optional(),
      homeTeamLabel: z.string().nullable().optional(),
      awayTeamLabel: z.string().nullable().optional()
    });

    const body = schema.parse(request.body);
    const match = loadMatch(request.params.id);

    if (!match) {
      response.status(404).json({ message: "Partida nao encontrada." });
      return;
    }

    run(
      `
        UPDATE matches
        SET
          home_team_id = :home_team_id,
          away_team_id = :away_team_id,
          home_team_label = :home_team_label,
          away_team_label = :away_team_label,
          updated_at = :updated_at
        WHERE id = :id
      `,
      {
        id: match.id,
        home_team_id: body.homeTeamId ?? match.home_team_id,
        away_team_id: body.awayTeamId ?? match.away_team_id,
        home_team_label: body.homeTeamLabel ?? match.home_team_label,
        away_team_label: body.awayTeamLabel ?? match.away_team_label,
        updated_at: now()
      }
    );

    response.json(serializeMatch(loadMatch(match.id)));
  } catch (error) {
    next(error);
  }
});

app.post("/admin/tournaments/:slug/live", (request, response, next) => {
  try {
    run(
      "UPDATE tournaments SET status = :status, updated_at = :updated_at WHERE slug = :slug",
      {
        slug: request.params.slug,
        status: TournamentStatus.LIVE,
        updated_at: now()
      }
    );

    response.json(get<any>("SELECT * FROM tournaments WHERE slug = :slug", { slug: request.params.slug }));
  } catch (error) {
    next(error);
  }
});

app.get("*", (request, response, next) => {
  if (request.path.startsWith("/health") || request.path.startsWith("/tournaments") || request.path.startsWith("/matches") || request.path.startsWith("/users") || request.path.startsWith("/pool-groups") || request.path.startsWith("/predictions") || request.path.startsWith("/admin")) {
    next();
    return;
  }

  response.sendFile(path.join(publicDirectory, "index.html"));
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    response.status(400).json({
      message: "Dados invalidos.",
      issues: error.flatten()
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    message: "Erro interno do servidor."
  });
});
