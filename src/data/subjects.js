export const INITIAL_SUBJECTS = [
  // --- PRIMER AÑO ---
  { id: "11101", name: "Análisis Matemático I", year: 1, prereqs: [], credits: 6, status: "approved", grade: 9 },
  { id: "11102", name: "Fundamentos de Programación", year: 1, prereqs: [], credits: 5, status: "approved", grade: 9 },
  { id: "10129", name: "Matemática Discreta", year: 1, prereqs: [], credits: 4, status: "approved", grade: 8 },
  { id: "11103", name: "Organización de Empresas", year: 1, prereqs: [], credits: 4, status: "approved", grade: 8 },
  { id: "10100", name: "Álgebra y Geometría Analítica", year: 1, prereqs: ["11101"], credits: 5, status: "approved", grade: 9 },
  { id: "10106", name: "Física I", year: 1, prereqs: ["11101"], credits: 6, status: "approved", grade: null },
  { id: "10113", name: "Arquitectura de Computadoras", year: 1, prereqs: [], credits: 4, status: "approved", grade: null },
  { id: "11209", name: "Estructuras de Datos y Algoritmos", year: 1, prereqs: ["11102", "10129"], credits: 5, status: "approved", grade: 9 },

  // --- SEGUNDO AÑO ---
  { id: "11201", name: "Análisis Matemático IIA", year: 2, prereqs: ["11101"], credits: 5, status: "approved", grade: null },
  { id: "11202", name: "Física II A", year: 2, prereqs: ["10106"], credits: 5, status: "approved", grade: null },
  { id: "11203", name: "Fundamentos de Economía", year: 2, prereqs: [], credits: 4, status: "approved", grade: null },
  { id: "10232", name: "Sintaxis y Semántica del Lenguaje", year: 2, prereqs: ["11209"], credits: 4, status: "approved", grade: 9 },
  { id: "10210", name: "Análisis de Sistemas I", year: 2, prereqs: ["11103", "11209", "10100"], credits: 6, status: "approved", grade: null },
  { id: "11211", name: "Análisis Matemático II B", year: 2, prereqs: ["11201"], credits: 4, status: "approved", grade: null },
  { id: "10211", name: "Análisis de Sistemas II", year: 2, prereqs: ["10210"], credits: 6, status: "approved", grade: null },
  { id: "10310", name: "Comunicaciones", year: 2, prereqs: ["11209", "10113", "11202"], credits: 5, status: "approved", grade: null },
  { id: "10226", name: "Paradigmas de Programación", year: 2, prereqs: ["10232"], credits: 5, status: "pending", grade: null },
  { id: "11221", name: "Base de Datos I", year: 2, prereqs: ["10210"], credits: 5, status: "pending", grade: null },

  // --- TERCER AÑO ---
  { id: "11312", name: "Base de Datos II", year: 3, prereqs: ["11221"], credits: 5, status: "pending", grade: null },
  { id: "11313", name: "Programación Avanzada I", year: 3, prereqs: ["10226"], credits: 5, status: "pending", grade: null },
  { id: "10312", name: "Diseño de Sistemas I", year: 3, prereqs: ["10211", "11221"], credits: 6, status: "pending", grade: null },
  { id: "10304", name: "Probabilidad y Estadística", year: 3, prereqs: ["10100"], credits: 4, status: "approved", grade: 8 },
  { id: "11315", name: "Redes de Comunicación", year: 3, prereqs: ["10310"], credits: 5, status: "pending", grade: null },
  { id: "10233", name: "Sistemas Operativos", year: 3, prereqs: ["11315"], credits: 5, status: "pending", grade: null },
  { id: "10313", name: "Diseño de Sistemas II", year: 3, prereqs: ["11313", "11312", "10312"], credits: 6, status: "pending", grade: null },
  { id: "11329", name: "Programación Avanzada II", year: 3, prereqs: ["11313"], credits: 5, status: "pending", grade: null },
  { id: "10376", name: "Ingeniería de Software I", year: 3, prereqs: ["10226", "10312"], credits: 5, status: "pending", grade: null },
  { id: "11331", name: "Arquitectura de Computación en la Nube", year: 3, prereqs: ["11312", "11315"], credits: 5, status: "pending", grade: null },

  // --- CUARTO AÑO ---
  { id: "10487", name: "Desarrollo Avanzado de Software", year: 4, prereqs: ["11329", "10376"], credits: 5, status: "pending", grade: null },
  { id: "10420", name: "Investigación Operativa", year: 4, prereqs: ["10304"], credits: 5, status: "approved", grade: null },
  { id: "10486", name: "Seguridad Informática", year: 4, prereqs: ["10233", "11331"], credits: 5, status: "pending", grade: null },
  { id: "11402", name: "Gestión de la Calidad", year: 4, prereqs: ["10304"], credits: 4, status: "approved", grade: 9 },
  { id: "10485", name: "Ingeniería de Software II", year: 4, prereqs: ["10376", "10313"], credits: 5, status: "pending", grade: null },
  { id: "11316", name: "Teoría y Sistemas de Control", year: 4, prereqs: ["11202", "11211"], credits: 4, status: "pending", grade: null },
  { id: "11427", name: "Sistemas de Gestión", year: 4, prereqs: ["10420"], credits: 5, status: "pending", grade: null },
  { id: "10507", name: "Inteligencia Artificial", year: 4, prereqs: ["10487", "11312"], credits: 5, status: "pending", grade: null },
  { id: "10432", name: "Simulación", year: 4, prereqs: ["10304", "11211"], credits: 4, status: "pending", grade: null },
  { id: "11415", name: "Gestión y Evaluación de Proyectos", year: 4, prereqs: ["11402", "11203", "10485"], credits: 5, status: "pending", grade: null },

  // --- QUINTO AÑO ---
  { id: "11511", name: "Proyectos de Tecnología Informática", year: 5, prereqs: ["11415", "10486", "10485"], credits: 5, status: "pending", grade: null },
  { id: "17", name: "Electiva I: Comercialización", year: 5, prereqs: [], credits: 4, isElectiveSlot: true, status: "approved", grade: 7 },
  { id: "11512", name: "Inteligencia de Negocios", year: 5, prereqs: ["10432", "10507"], credits: 5, status: "pending", grade: null },
  { id: "10503", name: "Administración Gerencial", year: 5, prereqs: ["11427", "11415"], credits: 4, status: "pending", grade: null },
  { id: "11525", name: "Proyecto Integrador de Sistemas (Anual)", year: 5, prereqs: ["11511", "10503"], credits: 12, status: "pending", grade: null },
  { id: "11", name: "Electiva II: Sistemas de Representación", year: 5, prereqs: [], credits: 4, isElectiveSlot: true, status: "approved", grade: null },
  { id: "11520", name: "Auditoría Operativa", year: 5, prereqs: ["11427"], credits: 4, status: "pending", grade: null },
  { id: "10401", name: "Seguridad, Higiene y Medio Ambiente", year: 5, prereqs: [], credits: 3, status: "approved", grade: null },
  { id: "10500", name: "Legislación y Ejercicio Profesional", year: 5, prereqs: [], credits: 3, status: "approved", grade: null },

  // --- TALLERES ---
  { id: "11130", name: "Emprendedorismo I", year: "Talleres", prereqs: [], credits: 2, status: "approved", grade: 8 },
  { id: "11131", name: "Emprendedorismo II", year: "Talleres", prereqs: ["11130"], credits: 2, status: "pending", grade: null },
  { id: "10303", name: "Inglés I", year: "Talleres", prereqs: [], credits: 2, status: "approved", grade: null },
  { id: "10446", name: "Inglés II", year: "Talleres", prereqs: ["10303"], credits: 2, status: "approved", grade: 8 },
  { id: "11230", name: "Comunicación Efectiva I", year: "Talleres", prereqs: [], credits: 2, status: "pending", grade: null },
  { id: "11231", name: "Comunicación Efectiva II", year: "Talleres", prereqs: ["11230"], credits: 2, status: "pending", grade: null },
  { id: "11330", name: "Trabajo Colaborativo I", year: "Talleres", prereqs: [], credits: 2, status: "pending", grade: null },
  { id: "11332", name: "Trabajo Colaborativo II", year: "Talleres", prereqs: ["11330"], credits: 2, status: "pending", grade: null },

  // --- OTROS ---
  { id: "10555", name: "Práctica Profesional Supervisada", year: "Otros", prereqs: [], credits: 4, status: "pending", grade: null }
];

export const ELECTIVES_I = [
  { id: "17", name: "Electiva I: Comercialización", credits: 4 },
  { id: "17_emb", name: "Electiva I: Sistemas Embebidos", credits: 4 },
  { id: "17_eco", name: "Electiva I: Ecosistema Digital", credits: 4 },
  { id: "17_red", name: "Electiva I: Seguridad en Redes", credits: 4 }
];

export const ELECTIVES_II = [
  { id: "11", name: "Electiva II: Sistemas de Representación", credits: 4 },
  { id: "11_sim", name: "Electiva II: Modelos de Simulación Avanzada", credits: 4 },
  { id: "11_rob", name: "Electiva II: Robótica", credits: 4 },
  { id: "11_dat", name: "Electiva II: Gestión de Datos", credits: 4 }
];
