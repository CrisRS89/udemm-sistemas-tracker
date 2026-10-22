import { MECANICA_SUBJECTS } from "./mecanica";

// Fuente: correlatividades oficiales UdeMM (consultada 2026-10-08).
// Parte de la base común con Mecánica y ajusta las materias propias del plan.
const subject = (id, name, year, prereqs = []) => ({ id, name, year, prereqs, credits: 0, status: "pending", grade: null });
const withoutMechanicalOnly = new Set(["I0356", "I1409", "I1423", "I1523", "I1B"]);

export const ELECTROMECANICA_SUBJECTS = [
  ...MECANICA_SUBJECTS.filter(({ id }) => !withoutMechanicalOnly.has(id)).map((item) => ({ ...item })),
  subject("I0328", "Mediciones Eléctricas", 3, ["I1202"]),
  subject("I1408", "Máquinas Eléctricas II", 4, ["I0350"]),
  subject("I0520", "Máquinas Térmicas", 4, ["I0345"]),
  subject("I1522", "Proyecto Electromecánico Integrador", 5, ["I1404", "I0520"]),
  subject("I1507", "Instalaciones Eléctricas", 5, ["I0206"]),
  subject("I1518", "Redes de Distribución Eléctrica", 5, ["I1507"]),
];
