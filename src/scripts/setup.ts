import { WORLD_CUP_2026, worldCup2026Matches } from "../data/worldCup2026.js";
import { initDatabase } from "../lib/db.js";
import { seedWorldCup2026 } from "./seedWorldCup.js";

const setup = () => {
  initDatabase();
  seedWorldCup2026({ resetTournament: true });
};

setup();

console.log(
  `Banco inicializado com ${WORLD_CUP_2026.groups.length} grupos e ${worldCup2026Matches.length} partidas.`
);
