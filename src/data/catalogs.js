import { INITIAL_SUBJECTS } from "./subjects";
import { INDUSTRIAL_SUBJECTS } from "./industrial";
import { MECANICA_SUBJECTS } from "./mecanica";
import { ELECTROMECANICA_SUBJECTS } from "./electromecanica";
const subject = (id, name, year, prereqs = []) => ({ id, name, year, prereqs, credits: 0, status: "pending", grade: null });
const electronica = [
  subject("I1101","Análisis Matemático I",1),subject("I1102","Fundamentos de Programación",1),subject("I1104","Sistemas de Representación",1),subject("I1105","Electrónica General",1),subject("I1103","Organización de Empresas",1),subject("I0100","Álgebra y Geometría Analítica",1,["I1101"]),subject("I0106","Física I",1,["I1101"]),subject("I1114","Electrónica Digital",1),subject("I1112","Química General",1,["I1101"]),subject("I1115","Programación Avanzada",1,["I1102"]),
  subject("I1201","Análisis Matemático II A",2,["I1101","I0100"]),subject("I1202","Física II A",2,["I0106"]),subject("I1203","Fundamentos de Economía",2),subject("I1205","Instalación y Mantenimiento",2,["I1105"]),subject("I1206","Electrónica Analógica I",2,["I1105"]),subject("I1211","Análisis Matemático II B",2,["I1201"]),subject("I1212","Física II B",2,["I0106"]),subject("I0401","Seguridad, Higiene y Medio Ambiente",2),subject("I0360","Electromagnetismo",2,["I1202"]),subject("I1216","Sistemas Embebidos I",2,["I1114","I1115"]),
  subject("I1307","Señales y Sistemas",3,["I1211"]),subject("I1308","Tecnología Electrónica",3,["I1206"]),subject("I0328","Mediciones Eléctricas",3,["I1202"]),subject("I0367","Propagación y Antenas",3,["I0360"]),subject("I0452","Teoría de Circuitos I",3,["I1202"]),subject("I0304","Probabilidad y Estadística",3,["I0100"]),subject("I1322","Mediciones Electrónicas",3,["I1328"]),subject("I0350","Máquinas Eléctricas",3,["I0452"]),subject("I0454","Sistemas de Comunicaciones I",3,["I0367","I1307"]),subject("I1324","Sistemas Embebidos II",3,["I1216"]),
  subject("I1405","Procesamiento Digital de Señales",4,["I1307","I1324"]),subject("I1401","Metodología de la Investigación",4,["I0304"]),subject("I1406","Electrónica Analógica II",4,["I1206"]),subject("I0438","Teoría de Control",4,["I1307","I1324"]),subject("I1416","Electrónica de Potencia",4,["I1406"]),subject("I0465","Sistemas de Comunicaciones II",4,["I0454"]),subject("I0464","Teoría de Circuitos II",4,["I0452"]),subject("I1419","Diseño de Equipos",4,["I1405","I1406"]),subject("I1420","Control Aplicado",4,["I0348"]),
  subject("I1504","Electrónica Avanzada I",5,["I1406"]),subject("I0539","Microondas y Radar",5,["I0465"]),subject("I1521","Proyecto Electrónico Integrador (Anual)",5,["I1419"]),subject("I1402","Gestión de la Calidad",5,["I0304"]),subject("I1","Electiva I",5),subject("I1517","Electrónica Avanzada II",5,["I1504"]),subject("I1B","Electiva II",5),subject("I0500","Legislación y Ejercicio Profesional",5),subject("I1415","Gestión y Evaluación de Proyectos",5,["I1103"]),subject("I0555","Práctica Profesional Supervisada",5),
  subject("I1130","Emprendedorismo I","Talleres"),subject("I1131","Emprendedorismo II","Talleres",["I1130"]),subject("I0303","Inglés I","Talleres"),subject("I0446","Inglés II","Talleres",["I0303"]),subject("I1230","Comunicación Efectiva I","Talleres"),subject("I1231","Comunicación Efectiva II","Talleres",["I1230"]),subject("I1330","Trabajo Colaborativo I","Talleres"),subject("I1332","Trabajo Colaborativo II","Talleres",["I1330"])
];

// El catálogo y el progreso se guardan por carrera.  Así se puede ampliar el
// tracker sin mezclar el recorrido académico de estudiantes de carreras distintas.
export const CAREER_CATALOGS = [
  {
    id: "sistemas",
    name: "Ingeniería en Sistemas",
    shortName: "Sistemas",
    degree: "Ingeniero en Sistemas",
    officialTotal: 53,
    sourceUrl: "https://udemm.edu.ar/carreras/ingenieria-en-sistemas/correlatividades-ingenieria-en-sistemas/",
    subjects: INITIAL_SUBJECTS,
    available: true,
  },
  {
    id: "electronica",
    name: "Ingeniería Electrónica",
    shortName: "Electrónica",
    degree: "Ingeniero Electrónico",
    officialTotal: 54,
    sourceUrl: "https://udemm.edu.ar/carreras/ingenieria-electronica/correlatividades-ingenieria-electronica/",
    subjects: electronica.map((subject) => (
      subject.id === "I1" || subject.id === "I1B" ? { ...subject, isElectiveSlot: true } : subject
    )),
    electiveOptions: { I1: ["Redes de Comunicación", "Base de Datos II", "Marketing Digital y Analítica Web"], I1B: ["Instalaciones Eléctricas", "Fundamentos de Bases de Datos", "Base de Datos I", "Comercialización"] },
    available: true,
  },
  {
    id: "industrial",
    name: "Ingeniería Industrial",
    shortName: "Industrial",
    degree: "Ingeniero Industrial",
    officialTotal: 54,
    sourceUrl: "https://udemm.edu.ar/carreras/ingenieria-industrial/correlatividades-ingenieria-industrial/",
    subjects: INDUSTRIAL_SUBJECTS,
    electiveOptions: { I1: ["Redes de Comunicación", "Simulación", "Energías Alternativas", "Sistemas Embebidos I", "Paradigmas de Programación", "Seguridad Informática", "Inteligencia Artificial"] },
    available: true,
  },
  {
    id: "mecanica",
    name: "Ingeniería Mecánica",
    shortName: "Mecánica",
    degree: "Ingeniero Mecánico",
    officialTotal: 51,
    sourceUrl: "https://udemm.edu.ar/carreras/ingenieria-mecanica/correlatividades-ingenieria-mecanica/",
    subjects: MECANICA_SUBJECTS,
    electiveOptions: { I1: ["Instalaciones Eléctricas", "Mediciones Eléctricas", "Marketing Digital y Analítica Web"], I1B: ["Planificación y Control de la Producción", "Comercialización", "Contabilidad y Costos Industriales"] },
    available: true,
  },
  {
    id: "electromecanica",
    name: "Ingeniería Electromecánica",
    shortName: "Electromecánica",
    degree: "Ingeniero Electromecánico",
    officialTotal: 54,
    sourceUrl: "https://udemm.edu.ar/carreras/ingenieria-electromecanica/correlatividades-ingenieria-electromecanica/",
    subjects: ELECTROMECANICA_SUBJECTS,
    electiveOptions: { I1: ["Estabilidad II", "Tecnología del Calor", "Planificación y Control de la Producción", "Comercialización", "Contabilidad y Costos Industriales", "Logística Industrial"] },
    available: true,
  },
];

export const getCareerCatalog = (careerId) =>
  CAREER_CATALOGS.find((career) => career.id === careerId) || CAREER_CATALOGS[0];

export const progressStorageKey = (careerId) => `udemm_tracker_subjects_${careerId}`;
