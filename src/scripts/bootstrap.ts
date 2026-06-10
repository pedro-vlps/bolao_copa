import { WORLD_CUP_2026 } from "../data/worldCup2026.js";
import { initDatabase } from "../lib/db.js";
import { seedWorldCup2026 } from "./seedWorldCup.js";

initDatabase();

const result = seedWorldCup2026();

if (result.seeded) {
  console.log(`Torneio ${WORLD_CUP_2026.name} semeado no banco.`);
} else {
  console.log(`Banco ja inicializado; seed de ${WORLD_CUP_2026.name} mantido sem alteracoes.`);
}
