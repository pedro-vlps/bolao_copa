const STORAGE_KEYS = {
  user: "bolao:user",
  activeGroup: "bolao:activeGroup",
  stage: "bolao:stage",
  groupRound: "bolao:groupRound"
};

const STAGE_LABELS = {
  ALL: "Todos",
  GROUP_STAGE: "Fase de grupos",
  ROUND_OF_32: "16 avos",
  ROUND_OF_16: "Oitavas",
  QUARTER_FINAL: "Quartas",
  SEMI_FINAL: "Semis",
  THIRD_PLACE: "3o lugar",
  FINAL: "Final"
};

const GROUP_STAGE_ROUND_LABELS = {
  1: "1a rodada da fase de grupos",
  2: "2a rodada da fase de grupos",
  3: "3a rodada da fase de grupos"
};

const storedUser = readStorage(STORAGE_KEYS.user);
const storedActiveGroup = readStorage(STORAGE_KEYS.activeGroup);
const storedStageFilter = readStorage(STORAGE_KEYS.stage);
const storedGroupRoundFilter = readStorage(STORAGE_KEYS.groupRound);

const state = {
  tournament: null,
  matches: [],
  currentUser: storedUser,
  activeGroup: storedActiveGroup,
  stageFilter:
    storedStageFilter === "ALL" && storedGroupRoundFilter === null
      ? "GROUP_STAGE"
      : (storedStageFilter ?? "GROUP_STAGE"),
  groupRoundFilter: storedGroupRoundFilter ?? "1",
  predictions: {
    matches: [],
    groups: []
  }
};

const elements = {
  summaryGrid: document.querySelector("#summary-grid"),
  userStatus: document.querySelector("#user-status"),
  userProfileCard: document.querySelector("#user-profile-card"),
  userProfileName: document.querySelector("#user-profile-name"),
  userProfileEmail: document.querySelector("#user-profile-email"),
  activeGroup: document.querySelector("#active-group"),
  leaderboard: document.querySelector("#leaderboard-panel"),
  groupPredictions: document.querySelector("#group-predictions"),
  matchesList: document.querySelector("#matches-list"),
  stageFilters: document.querySelector("#stage-filters"),
  roundFilters: document.querySelector("#round-filters"),
  toastRegion: document.querySelector("#toast-region"),
  userForm: document.querySelector("#user-form"),
  logoutButton: document.querySelector("#logout-button"),
  createGroupForm: document.querySelector("#create-group-form"),
  joinGroupForm: document.querySelector("#join-group-form")
};

boot();

async function boot() {
  bindEvents();

  try {
    const tournaments = await fetchJson("/tournaments");
    state.tournament = tournaments.find((item) => item.slug === "copa-do-mundo-2026") ?? tournaments[0] ?? null;

    if (!state.tournament) {
      throw new Error("Nenhum torneio encontrado no banco.");
    }

    const [overview, matches] = await Promise.all([
      fetchJson(`/tournaments/${state.tournament.slug}/overview`),
      fetchJson(`/matches?tournamentSlug=${state.tournament.slug}`)
    ]);

    state.tournament = overview;
    state.matches = matches;

    if (state.currentUser?.id) {
      await loadUserPredictions();
    }

    await refreshLeaderboard();
    renderAll();
  } catch (error) {
    notify(error.message || "Nao foi possivel carregar a aplicacao.", true);
  }
}

function bindEvents() {
  elements.userForm.addEventListener("submit", onUserSubmit);
  elements.logoutButton.addEventListener("click", onLogout);
  elements.createGroupForm.addEventListener("submit", onCreateGroupSubmit);
  elements.joinGroupForm.addEventListener("submit", onJoinGroupSubmit);
  elements.activeGroup.addEventListener("click", onActiveGroupClick);
  elements.stageFilters.addEventListener("click", onStageFilterClick);
  elements.roundFilters.addEventListener("click", onRoundFilterClick);
  elements.matchesList.addEventListener("submit", onMatchPredictionSubmit);
  elements.groupPredictions.addEventListener("submit", onGroupPredictionSubmit);
}

async function onUserSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const payload = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim() || undefined
  };

  if (!payload.name) {
    notify("Informe seu nome para criar o perfil.", true);
    return;
  }

  try {
    const user = await fetchJson("/users", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    state.currentUser = user;
    persistStorage(STORAGE_KEYS.user, user);
    await loadUserPredictions();
    await refreshLeaderboard();
    renderIdentity();
    renderGroupPredictions();
    renderMatches();
    notify("Perfil salvo. Agora voce ja pode palpitar.");
  } catch (error) {
    notify(error.message || "Nao foi possivel criar o perfil.", true);
  }
}

async function onCreateGroupSubmit(event) {
  event.preventDefault();

  if (!state.currentUser?.id) {
    notify("Crie seu perfil antes de montar um grupo.", true);
    return;
  }

  const formData = new FormData(event.currentTarget);
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    notify("Escolha um nome para o grupo.", true);
    return;
  }

  try {
    const group = await fetchJson("/pool-groups", {
      method: "POST",
      body: JSON.stringify({
        name,
        ownerId: state.currentUser.id,
        tournamentSlug: state.tournament.slug
      })
    });

    state.activeGroup = group;
    persistStorage(STORAGE_KEYS.activeGroup, group);
    await refreshLeaderboard();
    renderIdentity();
    notify(`Grupo criado. Convite: ${group.inviteCode}`);
    event.currentTarget.reset();
  } catch (error) {
    notify(error.message || "Nao foi possivel criar o grupo.", true);
  }
}

async function onJoinGroupSubmit(event) {
  event.preventDefault();

  if (!state.currentUser?.id) {
    notify("Crie seu perfil antes de entrar em um grupo.", true);
    return;
  }

  const formData = new FormData(event.currentTarget);
  const inviteCode = String(formData.get("inviteCode") || "").trim().toUpperCase();

  if (!inviteCode) {
    notify("Digite um codigo de convite.", true);
    return;
  }

  try {
    const membership = await fetchJson("/pool-groups/join", {
      method: "POST",
      body: JSON.stringify({
        inviteCode,
        userId: state.currentUser.id
      })
    });

    state.activeGroup = {
      id: membership.poolGroupId,
      inviteCode: membership.inviteCode,
      name: "Grupo conectado"
    };

    persistStorage(STORAGE_KEYS.activeGroup, state.activeGroup);
    await refreshLeaderboard();
    renderIdentity();
    notify("Entrada no grupo confirmada.");
    event.currentTarget.reset();
  } catch (error) {
    notify(error.message || "Nao foi possivel entrar no grupo.", true);
  }
}

async function onActiveGroupClick(event) {
  const button = event.target.closest("#leave-group-button");
  if (!button) {
    return;
  }

  if (!state.currentUser?.id || !state.activeGroup?.id) {
    notify("Nenhum grupo ativo para sair.", true);
    return;
  }

  try {
    const result = await fetchJson(`/pool-groups/${state.activeGroup.id}/leave`, {
      method: "POST",
      body: JSON.stringify({
        userId: state.currentUser.id
      })
    });

    state.activeGroup = null;
    clearStorage(STORAGE_KEYS.activeGroup);
    renderIdentity();
    renderLeaderboard(null);

    if (result.groupDeleted) {
      notify("Voce saiu e o grupo foi encerrado porque nao havia outros participantes.");
      return;
    }

    notify("Voce saiu do grupo com sucesso.");
  } catch (error) {
    notify(error.message || "Nao foi possivel sair do grupo.", true);
  }
}

function onLogout() {
  state.currentUser = null;
  state.activeGroup = null;
  state.predictions = {
    matches: [],
    groups: []
  };

  clearStorage(STORAGE_KEYS.user);
  clearStorage(STORAGE_KEYS.activeGroup);
  elements.userForm.reset();

  renderIdentity();
  renderLeaderboard(null);
  renderGroupPredictions();
  renderMatches();
  notify("Voce saiu do perfil atual.");
}

function onStageFilterClick(event) {
  const button = event.target.closest("[data-stage]");
  if (!button) {
    return;
  }

  state.stageFilter = button.dataset.stage;

  if (state.stageFilter === "GROUP_STAGE" && !["1", "2", "3"].includes(String(state.groupRoundFilter))) {
    state.groupRoundFilter = "1";
    persistStorage(STORAGE_KEYS.groupRound, state.groupRoundFilter);
  }

  persistStorage(STORAGE_KEYS.stage, state.stageFilter);
  renderStageFilters();
  renderRoundFilters();
  renderMatches();
}

function onRoundFilterClick(event) {
  const button = event.target.closest("[data-round]");
  if (!button) {
    return;
  }

  state.groupRoundFilter = button.dataset.round;
  persistStorage(STORAGE_KEYS.groupRound, state.groupRoundFilter);
  renderRoundFilters();
  renderMatches();
}

async function onMatchPredictionSubmit(event) {
  event.preventDefault();

  if (!state.currentUser?.id) {
    notify("Crie seu perfil antes de enviar palpites.", true);
    return;
  }

  const form = event.target.closest("form");
  if (!form) {
    return;
  }

  const formData = new FormData(form);
  const matchId = form.dataset.matchId;
  const match = state.matches.find((item) => item.id === matchId);

  if (!match) {
    notify("Partida nao encontrada para esse palpite.", true);
    return;
  }

  const payload = {
    userId: state.currentUser.id,
    matchId,
    homeScore: Number(formData.get("homeScore")),
    awayScore: Number(formData.get("awayScore")),
    homePenaltyScore: normalizeNullableNumber(formData.get("homePenaltyScore")),
    awayPenaltyScore: normalizeNullableNumber(formData.get("awayPenaltyScore"))
  };

  if (Number.isNaN(payload.homeScore) || Number.isNaN(payload.awayScore)) {
    notify("Preencha os gols dos dois times.", true);
    return;
  }

  if (match.stage !== "GROUP_STAGE" && payload.homeScore === payload.awayScore) {
    if (payload.homePenaltyScore === null || payload.awayPenaltyScore === null) {
      notify("Empates no mata-mata precisam de penaltis.", true);
      return;
    }
  }

  try {
    await fetchJson("/predictions/matches", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    await loadUserPredictions();
    await refreshLeaderboard();
    renderMatches();
    notify(`Palpite salvo para o jogo ${match.matchNumber}.`);
  } catch (error) {
    notify(error.message || "Nao foi possivel salvar o palpite.", true);
  }
}

async function onGroupPredictionSubmit(event) {
  event.preventDefault();

  if (!state.currentUser?.id) {
    notify("Crie seu perfil antes de palpitar nos grupos.", true);
    return;
  }

  const form = event.target.closest("form");
  if (!form) {
    return;
  }

  const tournamentGroupId = form.dataset.groupId;
  const selects = [...form.querySelectorAll("select")];
  const placements = selects.map((select) => select.value).filter(Boolean);

  if (placements.length !== 4) {
    notify("Defina as quatro posicoes do grupo.", true);
    return;
  }

  if (new Set(placements).size !== placements.length) {
    notify("Cada posicao precisa ter um time diferente.", true);
    return;
  }

  try {
    await fetchJson("/predictions/groups", {
      method: "POST",
      body: JSON.stringify({
        userId: state.currentUser.id,
        tournamentGroupId,
        placements
      })
    });

    await loadUserPredictions();
    renderGroupPredictions();
    notify("Palpite do grupo salvo.");
  } catch (error) {
    notify(error.message || "Nao foi possivel salvar o grupo.", true);
  }
}

async function loadUserPredictions() {
  if (!state.currentUser?.id) {
    state.predictions = { matches: [], groups: [] };
    return;
  }

  const predictions = await fetchJson(
    `/predictions/users/${state.currentUser.id}?tournamentSlug=${state.tournament.slug}`
  );

  state.predictions = {
    matches: predictions.matchPredictions,
    groups: predictions.groupPredictions
  };
}

async function refreshLeaderboard() {
  if (!state.activeGroup?.id) {
    renderLeaderboard(null);
    return;
  }

  try {
    const leaderboard = await fetchJson(`/pool-groups/${state.activeGroup.id}/leaderboard`);
    state.activeGroup = {
      id: leaderboard.group.id,
      name: leaderboard.group.name,
      inviteCode: leaderboard.group.inviteCode,
      tournament: leaderboard.group.tournament
    };
    persistStorage(STORAGE_KEYS.activeGroup, state.activeGroup);
    renderLeaderboard(leaderboard);
  } catch (_error) {
    renderLeaderboard(null);
    notify("Nao foi possivel atualizar o ranking do grupo.", true);
  }
}

function renderAll() {
  renderSummary();
  renderIdentity();
  renderStageFilters();
  renderRoundFilters();
  renderGroupPredictions();
  renderMatches();
}

function renderSummary() {
  if (!state.tournament) {
    return;
  }

  const items = [
    { label: "Ano", value: state.tournament.year },
    { label: "Grupos", value: state.tournament.groups.length },
    { label: "Partidas", value: state.tournament.counts.matches },
    { label: "Bolao", value: state.tournament.name }
  ];

  elements.summaryGrid.innerHTML = items
    .map(
      (item) => `
        <div class="summary-item">
          <p class="summary-label">${item.label}</p>
          <p class="summary-value">${item.value}</p>
        </div>
      `
    )
    .join("");
}

function renderIdentity() {
  if (state.currentUser?.id) {
    elements.userStatus.textContent = "Perfil ativo";
    elements.userForm.classList.add("is-hidden");
    elements.userProfileCard.classList.remove("is-hidden");
    elements.userProfileName.textContent = state.currentUser.name;
    elements.userProfileEmail.textContent = state.currentUser.email || "Sem e-mail informado";
  } else {
    elements.userStatus.textContent = "Nao conectado";
    elements.userForm.classList.remove("is-hidden");
    elements.userProfileCard.classList.add("is-hidden");
  }

  if (state.activeGroup?.id) {
    elements.activeGroup.innerHTML = `
      <div class="group-card">
        <p class="group-name">${escapeHtml(state.activeGroup.name || "Grupo conectado")}</p>
        <p class="group-meta">Convite atual</p>
        <div class="invite-chip">${escapeHtml(state.activeGroup.inviteCode || "sem codigo")}</div>
        <button class="button button-secondary group-exit-button" id="leave-group-button" type="button">
          Sair do grupo
        </button>
      </div>
    `;
  } else {
    elements.activeGroup.innerHTML = `<p class="empty-state">Crie um grupo ou use um convite para entrar em uma disputa.</p>`;
  }
}

function renderLeaderboard(leaderboard) {
  if (!leaderboard) {
    elements.leaderboard.innerHTML = `<p class="empty-state">Crie ou entre em um grupo para ver o ranking.</p>`;
    return;
  }

  elements.leaderboard.innerHTML = leaderboard.leaderboard
    .map(
      (entry, index) => `
        <article class="leader-row">
          <div class="leader-rank">${index + 1}</div>
          <div>
            <p class="leader-name">${escapeHtml(entry.name)}</p>
            <span class="leader-role">${entry.role === "OWNER" ? "Dono do grupo" : "Participante"}</span>
          </div>
          <div class="leader-points">
            <span class="leader-points-label">Pontos</span>
            <strong class="leader-points-value">${entry.points}</strong>
          </div>
        </article>
      `
    )
    .join("");
}

function renderStageFilters() {
  const stages = ["ALL", ...new Set(state.matches.map((match) => match.stage))];
  elements.stageFilters.innerHTML = stages
    .map(
      (stage) => `
        <button
          class="filter-button ${stage === state.stageFilter ? "is-active" : ""}"
          type="button"
          data-stage="${stage}"
        >
          ${STAGE_LABELS[stage] || stage}
        </button>
      `
    )
    .join("");
}

function renderRoundFilters() {
  if (state.stageFilter !== "GROUP_STAGE") {
    elements.roundFilters.innerHTML = "";
    return;
  }

  const rounds = [
    { value: "1", label: "1a rodada" },
    { value: "2", label: "2a rodada" },
    { value: "3", label: "3a rodada" }
  ];

  elements.roundFilters.innerHTML = rounds
    .map(
      (round) => `
        <button
          class="filter-button ${round.value === String(state.groupRoundFilter) ? "is-active" : ""}"
          type="button"
          data-round="${round.value}"
        >
          ${round.label}
        </button>
      `
    )
    .join("");
}

function renderGroupPredictions() {
  if (!state.tournament) {
    return;
  }

  const predictionMap = new Map();
  for (const prediction of state.predictions.groups) {
    if (!predictionMap.has(prediction.groupId)) {
      predictionMap.set(prediction.groupId, []);
    }
    predictionMap.get(prediction.groupId).push(prediction);
  }

  elements.groupPredictions.innerHTML = state.tournament.groups
    .map((group) => {
      const saved = predictionMap.get(group.id) ?? [];
      const initialOrder = saved.length
        ? saved
            .slice()
            .sort((left, right) => left.predictedPosition - right.predictedPosition)
            .map((item) => item.teamId)
        : group.teams.map((team) => team.id);

      const rows = [1, 2, 3, 4]
        .map((position, index) => {
          const currentTeamId = initialOrder[index] ?? "";
          return `
            <div class="prediction-row">
              <span>${position}o lugar</span>
              <select name="position-${position}" ${state.currentUser?.id ? "" : "disabled"}>
                ${group.teams
                  .map(
                    (team) => `
                      <option value="${team.id}" ${team.id === currentTeamId ? "selected" : ""}>
                        ${escapeHtml(team.name)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </div>
          `;
        })
        .join("");

      return `
        <details class="group-card-prediction accordion-card">
          <summary class="accordion-summary">
            <div class="accordion-summary-copy">
              <p class="group-name">${escapeHtml(group.name)}</p>
              <p class="accordion-summary-meta">${group.teams.map((team) => team.code).join(" - ")}</p>
            </div>
            <div class="accordion-summary-side">
              ${saved.length === 4 ? `<span class="score-chip">Salvo</span>` : `<span class="pill pill-outline">Abrir</span>`}
              <div class="group-code">${group.code}</div>
              <span class="accordion-chevron">v</span>
            </div>
          </summary>
          <div class="accordion-content">
            <form class="prediction-grid" data-group-id="${group.id}">
              ${rows}
              <button class="button button-secondary" type="submit" ${state.currentUser?.id ? "" : "disabled"}>
                Salvar grupo
              </button>
            </form>
          </div>
        </details>
      `;
    })
    .join("");
}

function renderMatches() {
  let filteredMatches =
    state.stageFilter === "ALL"
      ? state.matches
      : state.matches.filter((match) => match.stage === state.stageFilter);

  if (state.stageFilter === "GROUP_STAGE") {
    filteredMatches = filteredMatches.filter(
      (match) => String(match.matchday ?? "") === String(state.groupRoundFilter)
    );
  }

  if (filteredMatches.length === 0) {
    elements.matchesList.innerHTML = `<p class="empty-state">Nenhuma partida encontrada para esse filtro.</p>`;
    return;
  }

  const matchPredictions = new Map(
    state.predictions.matches.map((prediction) => [prediction.match.id, prediction])
  );

  const groupedMatches = filteredMatches.reduce((groups, match) => {
    const sectionKey = getMatchSectionKey(match);
    const sectionLabel = getMatchSectionLabel(match);
    const existingGroup = groups.find((group) => group.key === sectionKey);

    if (existingGroup) {
      existingGroup.matches.push(match);
      return groups;
    }

    groups.push({
      key: sectionKey,
      label: sectionLabel,
      matches: [match]
    });

    return groups;
  }, []);

  groupedMatches.sort((left, right) => {
    const leftOrder = getMatchSectionOrder(left.matches[0]);
    const rightOrder = getMatchSectionOrder(right.matches[0]);
    return leftOrder - rightOrder;
  });

  elements.matchesList.innerHTML = groupedMatches
    .map((section) => {
      const matchesMarkup = section.matches
        .map((match) => {
          const prediction = matchPredictions.get(match.id);
          const locked = new Date(match.kickoffAt).getTime() <= Date.now();
          const homeName = match.homeTeam?.name || match.homeTeamLabel || "A definir";
          const awayName = match.awayTeam?.name || match.awayTeamLabel || "A definir";
          const canPredict =
            state.currentUser?.id &&
            (!locked && (match.stage === "GROUP_STAGE" || (match.homeTeam && match.awayTeam)));
          const summaryStatus = prediction
            ? `${prediction.homeScore} x ${prediction.awayScore}${prediction.homePenaltyScore !== null && prediction.awayPenaltyScore !== null ? ` - pen ${prediction.homePenaltyScore}-${prediction.awayPenaltyScore}` : ""}`
            : locked
              ? "Fechado"
              : "Abrir";

          return `
            <details class="match-card accordion-card">
              <summary class="accordion-summary">
                <div class="accordion-summary-copy">
                  <p class="match-title">Jogo ${match.matchNumber} - ${escapeHtml(homeName)} x ${escapeHtml(awayName)}</p>
                  <p class="accordion-summary-meta">
                    ${match.group ? `${escapeHtml(match.group.name)} - ` : ""}${formatDate(match.kickoffAt)}
                  </p>
                </div>
                <div class="accordion-summary-side">
                  ${prediction ? `<span class="score-chip">${prediction.pointsAwarded} pts</span>` : `<span class="match-status-chip">${escapeHtml(summaryStatus)}</span>`}
                  <span class="accordion-chevron">v</span>
                </div>
              </summary>

              <div class="accordion-content">
                <form class="match-form" data-match-id="${match.id}">
                  <div class="teams-grid">
                    <div class="team-box">
                      <strong>${escapeHtml(homeName)}</strong>
                      <span>${match.homeTeam?.code || escapeHtml(match.sourceHome || "slot")}</span>
                    </div>
                    <div class="team-box">
                      <strong>${escapeHtml(awayName)}</strong>
                      <span>${match.awayTeam?.code || escapeHtml(match.sourceAway || "slot")}</span>
                    </div>
                  </div>

                  <div class="score-grid">
                    <label>
                      <span>Gols ${escapeHtml(match.homeTeam?.shortName || homeName)}</span>
                      <input
                        min="0"
                        name="homeScore"
                        type="number"
                        value="${prediction?.homeScore ?? ""}"
                        ${canPredict ? "" : "disabled"}
                      />
                    </label>
                    <label>
                      <span>Gols ${escapeHtml(match.awayTeam?.shortName || awayName)}</span>
                      <input
                        min="0"
                        name="awayScore"
                        type="number"
                        value="${prediction?.awayScore ?? ""}"
                        ${canPredict ? "" : "disabled"}
                      />
                    </label>
                  </div>

                  ${
                    match.stage !== "GROUP_STAGE"
                      ? `
                        <div class="score-grid penalty-grid">
                          <label>
                            <span>Penaltis casa</span>
                            <input
                              min="0"
                              name="homePenaltyScore"
                              type="number"
                              value="${prediction?.homePenaltyScore ?? ""}"
                              ${canPredict ? "" : "disabled"}
                            />
                          </label>
                          <label>
                            <span>Penaltis fora</span>
                            <input
                              min="0"
                              name="awayPenaltyScore"
                              type="number"
                              value="${prediction?.awayPenaltyScore ?? ""}"
                              ${canPredict ? "" : "disabled"}
                            />
                          </label>
                          <p class="inline-note">
                            Empates no mata-mata exigem penaltis. Participantes ainda indefinidos ficam bloqueados.
                          </p>
                        </div>
                      `
                      : ""
                  }

                  <div class="match-footer">
                    <div>
                      ${
                        locked
                          ? `<span class="lock-note">Fechado para edicao</span>`
                          : `<span class="subtle">Prazo: ${formatTime(match.kickoffAt)}</span>`
                      }
                    </div>
                    <button class="button button-primary" type="submit" ${canPredict ? "" : "disabled"}>
                      Salvar palpite
                    </button>
                  </div>
                </form>
              </div>
            </details>
          `;
        })
        .join("");

      return `
        <section class="match-section">
          <div class="match-section-head">
            <h3>${escapeHtml(section.label)}</h3>
            <span>${section.matches.length} jogo${section.matches.length > 1 ? "s" : ""}</span>
          </div>
          <div class="match-section-list">${matchesMarkup}</div>
        </section>
      `;
    })
    .join("");
}

function getMatchSectionKey(match) {
  if (match.stage === "GROUP_STAGE") {
    return `GROUP_STAGE-${match.matchday ?? 0}`;
  }

  return `${match.stage}-${match.roundName}`;
}

function getMatchSectionLabel(match) {
  if (match.stage === "GROUP_STAGE") {
    return GROUP_STAGE_ROUND_LABELS[match.matchday] ?? `Rodada ${match.matchday ?? "?"} da fase de grupos`;
  }

  return match.roundName;
}

function getMatchSectionOrder(match) {
  if (match.stage === "GROUP_STAGE") {
    return match.matchday ?? 0;
  }

  const orderMap = {
    ROUND_OF_32: 10,
    ROUND_OF_16: 11,
    QUARTER_FINAL: 12,
    SEMI_FINAL: 13,
    THIRD_PLACE: 14,
    FINAL: 15
  };

  return orderMap[match.stage] ?? 99;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Erro na comunicacao com a API.");
  }

  return data;
}

function notify(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast ${isError ? "is-error" : ""}`;
  toast.textContent = message;
  elements.toastRegion.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3400);
}

function normalizeNullableNumber(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  const number = Number(normalized);
  return Number.isNaN(number) ? null : number;
}

function readStorage(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function clearStorage(key) {
  window.localStorage.removeItem(key);
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(isoDate));
}

function formatTime(isoDate) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "short",
    dateStyle: "short"
  }).format(new Date(isoDate));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
