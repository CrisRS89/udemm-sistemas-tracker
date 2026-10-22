import React, { useState, useEffect, useRef } from "react";
import { 
  ELECTIVES_I, 
  ELECTIVES_II 
} from "./data/subjects";
import { CAREER_CATALOGS, getCareerCatalog, progressStorageKey } from "./data/catalogs";
import { validateCatalog } from "./data/catalogValidation";
import { 
  db, 
  auth,
  googleProvider,
  isConfigured as isFirebaseConfigured, 
  doc, 
  onAuthStateChanged,
  onSnapshot,
  serverTimestamp,
  setDoc,
  signInWithPopup,
  signOut,
} from "./firebase";
import udemmLogo from "../logo/Logotipo UdeMM Universidad Privada.png";
import { 
  GraduationCap, 
  Award, 
  TrendingUp, 
  Sparkles, 
  Cloud,
  CheckCircle2, 
  Lock, 
  Unlock, 
  Settings, 
  Send, 
  BookOpen, 
  Trash2, 
  Search, 
  FileText,
  LogIn,
  LogOut,
} from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./App.css";

// Clave de API de Gemini desde entorno
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const DEFAULT_CAREER_ID = "sistemas";
const PROGRESS_STATUSES = new Set(["pending", "studying", "regular", "approved"]);

const isAvailableCareer = (careerId) =>
  CAREER_CATALOGS.some((career) => career.id === careerId && career.available);

const parseStoredProgress = (rawProgress, fallback) => {
  if (!rawProgress) return fallback;

  try {
    const parsed = JSON.parse(rawProgress);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    // No se reemplaza el valor almacenado: el usuario todavía puede recuperarlo
    // manualmente desde el navegador si alguna vez hubiera quedado corrupto.
    return fallback;
  }
};

const getStoredProgress = (careerId) => {
  const catalog = getCareerCatalog(careerId);
  const ownProgress = localStorage.getItem(progressStorageKey(careerId));
  const legacyProgress = careerId === DEFAULT_CAREER_ID
    ? localStorage.getItem("udemm_tracker_subjects")
    : null;
  return parseStoredProgress(ownProgress || legacyProgress, catalog.subjects);
};

const serializePlan = (subjects, strictMode) => JSON.stringify({ subjects, strictMode });

const parseCloudPlan = (data, careerId) => {
  if (
    data?.version !== 3 ||
    data?.careerId !== careerId ||
    typeof data?.subjectsJson !== "string" ||
    typeof data?.strictMode !== "boolean"
  ) return null;

  try {
    const cloudSubjects = JSON.parse(data.subjectsJson);
    const hasValidProgress = Array.isArray(cloudSubjects) && cloudSubjects.every(
      (subject) => typeof subject?.id === "string" && PROGRESS_STATUSES.has(subject?.status)
    );
    return hasValidProgress ? { subjects: cloudSubjects, strictMode: data.strictMode } : null;
  } catch {
    return null;
  }
};

function App() {
  // --- Estados de la aplicación ---
  const [careerId, setCareerId] = useState(() => {
    const storedCareer = localStorage.getItem("udemm_tracker_career");
    return isAvailableCareer(storedCareer) ? storedCareer : DEFAULT_CAREER_ID;
  });
  const career = getCareerCatalog(careerId);
  const catalogValidation = validateCatalog(career);
  const [subjects, setSubjects] = useState(() => {
    const storedCareer = localStorage.getItem("udemm_tracker_career");
    const savedCareer = isAvailableCareer(storedCareer) ? storedCareer : DEFAULT_CAREER_ID;
    return getStoredProgress(savedCareer);
  });

  const [activeTab, setActiveTab] = useState("kanban"); // "kanban", "map", "ai"
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all"); // "all", "1", "2", "3", "4", "5", "Talleres", "Otros"
  const [availableOnly, setAvailableOnly] = useState(false);
  const [strictMode, setStrictMode] = useState(() => {
    const localStrict = localStorage.getItem("udemm_tracker_strict");
    return localStrict ? JSON.parse(localStrict) === true : true;
  });

  // Estado para sincronización privada, autenticada y en tiempo real.
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [authError, setAuthError] = useState("");
  const [syncStatus, setSyncStatus] = useState(isFirebaseConfigured ? "signed-out" : "local");
  const subjectsRef = useRef(subjects);
  const strictModeRef = useRef(strictMode);
  const cloudReadyRef = useRef(false);
  const resolvedCloudPlansRef = useRef(new Set());

  // Modales
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customGeminiKey, setCustomGeminiKey] = useState(() => {
    return localStorage.getItem("udemm_tracker_gemini_key") || "";
  });

  // Asistente de IA
  const [messages, setMessages] = useState([
    { 
      sender: "assistant", 
      text: "¡Hola! Che, soy tu tutor académico de UdeMM. Decime en qué te puedo ayudar hoy. Puedo armarte una planificación, explicarte correlativas o simular preguntas para que rindas un final. ¿Por dónde empezamos?"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // --- Efecto de Persistencia Local ---
  useEffect(() => {
    subjectsRef.current = subjects;
    strictModeRef.current = strictMode;
    localStorage.setItem(progressStorageKey(careerId), JSON.stringify(subjects));
    // Se conserva la clave anterior como compatibilidad y respaldo de Sistemas.
    if (careerId === "sistemas") localStorage.setItem("udemm_tracker_subjects", JSON.stringify(subjects));
    localStorage.setItem("udemm_tracker_strict", JSON.stringify(strictMode));
  }, [subjects, strictMode, careerId]);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      setAuthError("");
      cloudReadyRef.current = false;
      setSyncStatus(user ? "syncing" : "signed-out");
    });
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser) return undefined;

    cloudReadyRef.current = false;
    setSyncStatus("syncing");
    const planKey = `${currentUser.uid}:${careerId}`;
    const planRef = doc(db, "users", currentUser.uid, "careers", careerId);

    const saveLocalPlan = async () => {
      setSyncStatus("syncing");
      await setDoc(planRef, {
        version: 3,
        careerId,
        subjectsJson: JSON.stringify(subjectsRef.current),
        strictMode: strictModeRef.current,
        updatedAt: serverTimestamp(),
      });
      cloudReadyRef.current = true;
      setSyncStatus("synced");
    };

    return onSnapshot(planRef, async (snapshot) => {
      try {
        if (!snapshot.exists()) {
          await saveLocalPlan();
          resolvedCloudPlansRef.current.add(planKey);
          return;
        }

        const remotePlan = parseCloudPlan(snapshot.data(), careerId);
        if (!remotePlan) {
          cloudReadyRef.current = false;
          setSyncStatus("error");
          setAuthError("El plan guardado en la nube tiene un formato inválido y no fue aplicado.");
          return;
        }

        const localSignature = serializePlan(subjectsRef.current, strictModeRef.current);
        const remoteSignature = serializePlan(remotePlan.subjects, remotePlan.strictMode);
        const firstResolution = !resolvedCloudPlansRef.current.has(planKey);

        if (firstResolution && localSignature !== remoteSignature) {
          resolvedCloudPlansRef.current.add(planKey);
          const useCloud = window.confirm(
            `Encontramos un progreso distinto de ${career.name} en tu cuenta.\n\n` +
            "Aceptar: usar el progreso de la nube.\nCancelar: conservar este dispositivo y subirlo a la nube."
          );

          if (!useCloud) {
            await saveLocalPlan();
            return;
          }
        } else {
          resolvedCloudPlansRef.current.add(planKey);
        }

        if (serializePlan(subjectsRef.current, strictModeRef.current) !== remoteSignature) {
          subjectsRef.current = remotePlan.subjects;
          strictModeRef.current = remotePlan.strictMode;
          setSubjects(remotePlan.subjects);
          setStrictMode(remotePlan.strictMode);
        }
        cloudReadyRef.current = true;
        setSyncStatus("synced");
        setAuthError("");
      } catch (error) {
        console.error("Error al resolver el plan de la nube:", error);
        cloudReadyRef.current = false;
        setSyncStatus("error");
        setAuthError("No pudimos resolver el progreso local y el de la nube.");
      }
    }, (error) => {
      console.error("Error en la sincronización en tiempo real:", error);
      cloudReadyRef.current = false;
      setSyncStatus("error");
      setAuthError("No se pudo acceder a Firestore. Revisá las reglas y la conexión.");
    });
  }, [career.name, careerId, currentUser]);

  const handleCareerChange = (nextCareerId) => {
    const nextCareer = getCareerCatalog(nextCareerId);
    if (!nextCareer.available) return;
    const nextProgress = getStoredProgress(nextCareerId);

    setCareerId(nextCareerId);
    localStorage.setItem("udemm_tracker_career", nextCareerId);
    subjectsRef.current = nextProgress;
    setSubjects(nextProgress);
    cloudReadyRef.current = false;
    setSyncStatus(currentUser ? "syncing" : isFirebaseConfigured ? "signed-out" : "local");
    setSelectedSubject(null);
    setSearchTerm("");
    setYearFilter("all");
    setAvailableOnly(false);
  };

  // Autodesplazamiento del chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // --- Funciones de Lógica Académica ---
  
  // Verifica si una materia tiene sus correlativas cumplidas para un estado objetivo
  const checkPrerequisites = (subject, targetStatus, currentSubjects = subjects) => {
    if (!strictMode) return true;
    if (!subject.prereqs || subject.prereqs.length === 0) return true;

    // Caso especial Proyecto Integrador: requiere todas las de 1º a 4º aprobadas
    if (subject.id === "11525") {
      const priorYearsSubjects = currentSubjects.filter(s => s.id !== "11525" && typeof s.year === "number" && s.year < 5);
      const allPriorApproved = priorYearsSubjects.every(s => s.status === "approved");
      if (!allPriorApproved) return false;
    }

    return subject.prereqs.every(prereqId => {
      const reqSub = currentSubjects.find(s => s.id === prereqId);
      // Una correlativa ausente es un problema de catálogo: no debe habilitar
      // silenciosamente una materia ni producir un avance académico incorrecto.
      if (!reqSub) return false;

      if (targetStatus === "studying" || targetStatus === "regular") {
        // Cursar o regularizar requiere que las previas estén al menos Regulares o Aprobadas
        return reqSub.status === "regular" || reqSub.status === "approved";
      }
      if (targetStatus === "approved") {
        // Aprobar requiere que las previas estén totalmente Aprobadas
        return reqSub.status === "approved";
      }
      return true;
    });
  };

  // Obtiene materias que bloquea esta materia si no se aprueba
  const getSubsequentSubjects = (subjectId) => {
    return subjects.filter(s => s.prereqs && s.prereqs.includes(subjectId));
  };

  const getMissingPrerequisites = (subject) =>
    (subject.prereqs || []).filter((prereqId) => !subjects.some((item) => item.id === prereqId));

  // Mueve una materia a un nuevo estado
  const moveSubject = (subjectId, newStatus, newGrade = null) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    // Validar correlativas
    if (newStatus !== "pending" && !checkPrerequisites(subject, newStatus)) {
      alert(`¡Ojo! No cumplís con las correlativas de "${subject.name}" para moverla a ese estado.`);
      return;
    }

    // Si movemos a pending o studying/regular, la nota se resetea a null
    let gradeValue = newGrade;
    if (newStatus !== "approved") {
      gradeValue = null;
    } else if (newStatus === "approved" && gradeValue === null) {
      // Si aprobamos y no se pasa nota, por defecto queda como equivalencia (null) o solicita nota
      const userGrade = prompt(`Ingresá la nota numérica para "${subject.name}" (1-10) o dejá vacío para Equivalencia:`);
      if (userGrade === "") {
        gradeValue = null;
      } else {
        const parsed = parseInt(userGrade, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 10) {
          alert("Nota inválida. Se registrará como Equivalencia.");
          gradeValue = null;
        } else {
          gradeValue = parsed;
        }
      }
    }

    // Actualizar el estado
    const updatedSubjects = subjects.map(s => {
      if (s.id === subjectId) {
        return { ...s, status: newStatus, grade: gradeValue };
      }
      return s;
    });

    setSubjects(updatedSubjects);
    triggerCloudSync(updatedSubjects);
  };

  // --- Estadísticas ---
  const approvedSubjects = subjects.filter(s => s.status === "approved");
  const approvedCount = approvedSubjects.length;
  const studyingCount = subjects.filter(s => s.status === "studying").length;
  const regularCount = subjects.filter(s => s.status === "regular").length;
  const availableCount = subjects.filter(
    (subject) => subject.status === "pending" && checkPrerequisites(subject, "studying")
  ).length;
  
  // El total oficial pertenece al plan, no al largo del array (que puede incluir electivas).
  const officialTotal = career.officialTotal;
  const progressPercentage = Math.min(Math.round((approvedCount / officialTotal) * 100), 100);

  // Promedio Simple (solo materias con nota numérica aprobadas)
  const gradedSubjects = approvedSubjects.filter(s => s.grade !== null);
  const averageSimple = gradedSubjects.length > 0 
    ? (gradedSubjects.reduce((acc, curr) => acc + curr.grade, 0) / gradedSubjects.length).toFixed(2)
    : "0.00";

  // Promedio Ponderado: (Nota * Créditos) / Créditos de las materias con nota
  const totalWeightedCredits = gradedSubjects.reduce((acc, curr) => acc + curr.credits, 0);
  const weightedSum = gradedSubjects.reduce((acc, curr) => acc + (curr.grade * curr.credits), 0);
  const averageWeighted = totalWeightedCredits > 0
    ? (weightedSum / totalWeightedCredits).toFixed(2)
    : "0.00";

  const equivalenciesCount = approvedSubjects.filter(s => s.grade === null).length;

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e, subjectId) => {
    e.dataTransfer.setData("text/plain", subjectId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove("drag-over");
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    const subjectId = e.dataTransfer.getData("text/plain");
    moveSubject(subjectId, targetStatus);
  };

  // --- Sincronización privada en Firebase ---
  const triggerCloudSync = async (
    updatedSubjects = subjectsRef.current,
    updatedStrictMode = strictModeRef.current
  ) => {
    if (!isFirebaseConfigured || !currentUser || !cloudReadyRef.current) return;

    setSyncStatus("syncing");
    try {
      await setDoc(doc(db, "users", currentUser.uid, "careers", careerId), {
        version: 3,
        careerId,
        subjectsJson: JSON.stringify(updatedSubjects),
        strictMode: updatedStrictMode,
        updatedAt: serverTimestamp(),
      });
      setSyncStatus("synced");
      setAuthError("");
    } catch (error) {
      console.error("Error al sincronizar en la nube:", error);
      setSyncStatus("error");
      setAuthError("No pudimos guardar el último cambio en la nube. Sigue guardado en este dispositivo.");
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured) {
      setShowConfigModal(true);
      return;
    }

    setAuthError("");
    setSyncStatus("syncing");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error);
      setSyncStatus("signed-out");
      const firebaseErrorCode = error?.code || "auth/error-desconocido";
      setAuthError(
        error?.code === "auth/popup-closed-by-user"
          ? "Se cerró la ventana de Google antes de completar el ingreso."
          : `No se pudo iniciar sesión con Google (${firebaseErrorCode}). Revisá Authentication y los dominios autorizados.`
      );
    }
  };

  const handleSignOut = async () => {
    try {
      cloudReadyRef.current = false;
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setAuthError("No se pudo cerrar la sesión.");
    }
  };

  // --- Asistente de IA (Gemini) ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { sender: "user", text: userMessage }]);
    setInputValue("");
    setIsTyping(true);

    // Preparar el contexto académico para el modelo
    const approvedList = subjects
      .filter(s => s.status === "approved")
      .map(s => `- ${s.name} (${s.id}) - Nota: ${s.grade !== null ? s.grade : "Equivalencia"}`)
      .join("\n");

    const studyingList = subjects
      .filter(s => s.status === "studying")
      .map(s => `- ${s.name} (${s.id})`)
      .join("\n");

    const regularList = subjects
      .filter(s => s.status === "regular")
      .map(s => `- ${s.name} (${s.id})`)
      .join("\n");

    // Encontrar materias prontas a cursar (desbloqueadas)
    const unlockedList = subjects
      .filter(s => s.status === "pending" && checkPrerequisites(s, "studying"))
      .map(s => `- ${s.name} (${s.id}) [Año: ${s.year}]`)
      .join("\n");

    const apiKey = customGeminiKey || GEMINI_API_KEY;

    if (apiKey) {
      // --- LLAMADA A LA API DE GEMINI REAL ---
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

        const prompt = `
          Sos un Tutor Académico e Inteligencia Artificial para la carrera de ${career.name} en la Universidad de la Marina Mercante (UdeMM) en Argentina.
          Tenés que comunicarte siempre en español argentino / rioplatense usando el voseo natural (ej: "tutorías", "tenés", "hacé", "mirá", "aprobaste", "che").
          
          Tu tarea es ayudar al estudiante a planificar su carrera, entender el árbol de correlativas, simular preguntas de examen, sugerir qué materias cursar y responder consultas.
          
          Aquí tenés su estado académico real:
          - Total de Materias del Plan: ${officialTotal}.
          - Materias aprobadas actualmente: ${approvedCount}
          - Promedio simple: ${averageSimple}
          - Promedio ponderado: ${averageWeighted}
          - Materias dadas por equivalencia: ${equivalenciesCount}
          
          Lista de materias APROBADAS:
          ${approvedList || "Ninguna aprobada por el momento."}

          Lista de materias CURSANDO actualmente:
          ${studyingList || "Ninguna cursando actualmente."}

          Lista de materias REGULARES (esperando dar el final):
          ${regularList || "Ninguna en regular."}

          Lista de materias DESBLOQUEADAS (listas para cursar, cumplen correlativas):
          ${unlockedList || "No tiene materias disponibles por el momento."}

          El usuario pregunta: "${userMessage}"
          
          Respondé de forma profesional, amigable y bien argenta. Hacé hincapié en consejos reales sobre las correlativas y el avance. No inventes materias fuera del plan oficial de UdeMM que te pasé.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        setMessages(prev => [...prev, { sender: "assistant", text }]);
      } catch (error) {
        console.error("Error con Gemini:", error);
        setMessages(prev => [...prev, { 
          sender: "assistant", 
          text: "Che, me dio un error al llamar a la API de Gemini. Verificá si tu API Key está bien ingresada en la configuración o si tenés problemas de conexión." 
        }]);
      } finally {
        setIsTyping(false);
      }
    } else {
      // --- SIMULADOR DE IA LOCAL EN ESPAÑOL ARGENTINO ---
      setTimeout(() => {
        let aiResponse = "";
        const lowerMsg = userMessage.toLowerCase();

        if (lowerMsg.includes("promedio") || lowerMsg.includes("nota") || lowerMsg.includes("estadísticas")) {
          aiResponse = `¡Che, venís bastante bien! Tenés un promedio simple de **${averageSimple}** y un promedio ponderado de **${averageWeighted}** con **${approvedCount}** materias aprobadas (${equivalenciesCount} por equivalencia). Seguí así metiéndole pila que ya tenés el **${progressPercentage}%** de la carrera adentro.`;
        } else if (lowerMsg.includes("planificar") || lowerMsg.includes("cuatrimestre") || lowerMsg.includes("cursar") || lowerMsg.includes("que sigo")) {
          aiResponse = `Mirá, analizando tu árbol de correlativas desbloqueadas, para el próximo cuatrimestre tenés estas opciones excelentes listas para cursar:\n\n${unlockedList || "- No detecté materias desbloqueadas, revisá el estado de tus previas!"}\n\nMi consejo: priorizá siempre las que destraban más materias a futuro (las troncales como Base de Datos, Programación o Análisis de Sistemas). ¿Te sirve este esquema o preferís algo más tranqui?`;
        } else if (lowerMsg.includes("correlativas") || lowerMsg.includes("traba") || lowerMsg.includes("requisito")) {
          aiResponse = `Che, acordate que en la UdeMM la regla es estricta: para pasar una materia a **Cursando** tenés que tener las previas al menos en estado **Regular**. Pero si la querés pasar a **Aprobada** (meter el final), las previas tienen que estar 100% **Aprobadas**. Si querés planificar a futuro sin estas trabas, podés apagar el 'Modo Estricto de Correlativas' en el menú de configuración (la ruedita de arriba).`;
        } else if (lowerMsg.includes("final") || lowerMsg.includes("examen") || lowerMsg.includes("pregunta") || lowerMsg.includes("simular")) {
          aiResponse = `¡Dale! Vamos a simular un final. Decime de qué materia te gustaría que te tome preguntas (por ejemplo: Matemática Discreta, Sintaxis, o Estructuras de Datos) y te tiro un par de conceptos clave típicos de examen de la UdeMM para ver cómo estás parado.`;
        } else {
          aiResponse = `Mirá, te comento. Tu perfil actual tiene **${approvedCount}** aprobadas y estás cursando **${studyingCount}** materias. Si querés una respuesta ultra personalizada usando modelos de lenguaje de última generación, acordate que podés ingresar tu **Gemini API Key** haciendo clic en el engranaje de configuración arriba a la derecha. ¡Con eso me conecto directo a la nube y te tiro ideas súper precisas!`;
        }

        setMessages(prev => [...prev, { sender: "assistant", text: aiResponse }]);
        setIsTyping(false);
      }, 1200);
    }
  };

  // --- Cambiar electiva ---
  const handleSelectElective = (subjectId, newElectiveId) => {
    const catalogOptions = career.electiveOptions?.[subjectId];
    if (catalogOptions) {
      const selectedName = catalogOptions.find((option) => option === newElectiveId);
      if (!selectedName) return;
      const updated = subjects.map((subject) => subject.id === subjectId ? { ...subject, name: selectedName, electiveChoice: selectedName } : subject);
      setSubjects(updated);
      setSelectedSubject((subject) => subject && subject.id === subjectId ? { ...subject, name: selectedName, electiveChoice: selectedName } : subject);
      triggerCloudSync(updated);
      return;
    }
    const isElectiveI = subjectId === "17" || ELECTIVES_I.some(e => e.id === subjectId);
    const options = isElectiveI ? ELECTIVES_I : ELECTIVES_II;
    const selected = options.find(o => o.id === newElectiveId);
    
    if (!selected) return;

    const updated = subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          id: selected.id,
          name: selected.name,
        };
      }
      return s;
    });

    setSubjects(updated);
    if (selectedSubject && selectedSubject.id === subjectId) {
      setSelectedSubject({ ...selectedSubject, id: selected.id, name: selected.name });
    }
    triggerCloudSync(updated);
  };

  // --- Resetear Proyecto ---
  const handleResetProgress = () => {
    const confirm = window.confirm("¿Estás seguro de que querés resetear tu progreso? Se va a borrar el historial actual de tus materias cursadas.");
    if (confirm) {
      subjectsRef.current = career.subjects;
      setSubjects(career.subjects);
      triggerCloudSync(career.subjects, strictModeRef.current);
      alert("Progreso reseteado exitosamente.");
    }
  };

  const handleStrictModeChange = (enabled) => {
    strictModeRef.current = enabled;
    setStrictMode(enabled);
    triggerCloudSync(subjectsRef.current, enabled);
  };

  // Guardar clave manual
  const handleSaveCustomKey = (key) => {
    setCustomGeminiKey(key);
    localStorage.setItem("udemm_tracker_gemini_key", key);
  };

  const handleExportProgress = () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      careerId,
      careerName: career.name,
      subjects,
      strictMode,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `udemm-tracker-${careerId}-respaldo.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreProgress = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(reader.result);
        const validSubjects = Array.isArray(backup.subjects) && backup.subjects.every(
          (subject) => typeof subject?.id === "string" && typeof subject?.status === "string"
        );
        if (backup.version !== 1 || backup.careerId !== careerId || !validSubjects) {
          throw new Error("El archivo no corresponde a esta carrera o no tiene un formato válido.");
        }
        if (!window.confirm("¿Restaurar este respaldo? Va a reemplazar el progreso actual de esta carrera.")) return;
        subjectsRef.current = backup.subjects;
        setSubjects(backup.subjects);
        const restoredStrictMode = typeof backup.strictMode === "boolean" ? backup.strictMode : strictModeRef.current;
        strictModeRef.current = restoredStrictMode;
        if (typeof backup.strictMode === "boolean") setStrictMode(restoredStrictMode);
        triggerCloudSync(backup.subjects, restoredStrictMode);
        alert("Respaldo restaurado correctamente.");
      } catch (error) {
        alert(error.message || "No se pudo restaurar el respaldo.");
      }
    };
    reader.readAsText(file);
  };

  // --- Filtros de materias ---
  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm);
    const matchesYear = yearFilter === "all" || String(s.year) === yearFilter;
    const matchesAvailability = !availableOnly || (s.status === "pending" && checkPrerequisites(s, "studying"));
    return matchesSearch && matchesYear && matchesAvailability;
  });

  return (
    <div className="app-container animate-fade">
      {/* HEADER */}
      <header className="app-header glass">
        <div className="brand-section">
          <img className="udemm-logo" src={udemmLogo} alt="Universidad de la Marina Mercante" />
          <div>
            <h1 className="brand-title">UdeMM Tracker</h1>
            <label className="career-picker-label">
              <span className="sr-only">Carrera</span>
              <select
                className="career-picker"
                value={careerId}
                onChange={(event) => handleCareerChange(event.target.value)}
                aria-label="Seleccionar carrera"
              >
                {CAREER_CATALOGS.map((option) => (
                  <option key={option.id} value={option.id} disabled={!option.available}>
                    {option.name}{option.available ? "" : " · próximamente"}
                  </option>
                ))}
              </select>
            </label>
            <a className="career-source-link" href={career.sourceUrl} target="_blank" rel="noreferrer">
              Plan oficial · {officialTotal} materias
            </a>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === "kanban" ? "active" : ""}`}
            onClick={() => setActiveTab("kanban")}
          >
            <BookOpen size={16} /> Tablero Kanban
          </button>
          <button 
            className={`tab-btn ${activeTab === "map" ? "active" : ""}`}
            onClick={() => setActiveTab("map")}
          >
            <FileText size={16} /> Mapa de Carrera
          </button>
          <button 
            className={`tab-btn ${activeTab === "ai" ? "active" : ""}`}
            onClick={() => setActiveTab("ai")}
          >
            <Sparkles size={16} /> Asistente IA
          </button>
        </nav>

        {/* ACCIONES DE SINCRONIZACIÓN */}
        <div className="sync-section">
          <div className="sync-status">
            <span className={`led ${syncStatus}`}></span>
            {!authReady
              ? "Verificando sesión..."
              : syncStatus === "syncing"
                ? "Sincronizando..."
                : syncStatus === "synced"
                  ? "Nube privada activa"
                  : syncStatus === "error"
                    ? "Error de nube"
                    : syncStatus === "signed-out"
                      ? "Sin sesión · Modo local"
                      : "Modo local"}
          </div>

          {isFirebaseConfigured && authReady && !currentUser && (
            <button className="action-btn-outline" onClick={handleGoogleSignIn} title="Sincronizar con tu cuenta de Google">
              <LogIn size={16} /> Ingresar con Google
            </button>
          )}

          {currentUser && (
            <button className="cloud-user" onClick={() => setShowConfigModal(true)} title={currentUser.email || "Cuenta conectada"}>
              {currentUser.photoURL
                ? <img src={currentUser.photoURL} alt="" referrerPolicy="no-referrer" />
                : <Cloud size={16} />}
              <span>{currentUser.displayName || currentUser.email || "Cuenta conectada"}</span>
            </button>
          )}

          <button className="action-btn-outline" onClick={() => setShowConfigModal(true)} title="Configuración">
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* DASHBOARD STATS */}
      <section className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper">
            <Award size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{progressPercentage}%</span>
            <span className="stat-label">Carrera Completada ({approvedCount} de {officialTotal})</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper">
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{averageWeighted}</span>
            <span className="stat-label">Promedio Ponderado</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper">
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{averageSimple}</span>
            <span className="stat-label">Promedio Simple ({gradedSubjects.length} materias con nota)</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper">
            <GraduationCap size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{studyingCount} / {regularCount}</span>
            <span className="stat-label">Cursando / Regulares</span>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper">
            <Unlock size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-val">{availableCount}</span>
            <span className="stat-label">Materias disponibles para cursar</span>
          </div>
        </div>
      </section>

      {(catalogValidation.duplicateIds.length > 0 || catalogValidation.missingPrerequisites.length > 0) && (
        <div className="catalog-warning catalog-warning-page" role="alert">
          Este catálogo tiene {catalogValidation.missingPrerequisites.length} correlatividad/es pendiente/s de validación oficial ({[...new Set(catalogValidation.missingPrerequisites.map(({ prerequisite }) => prerequisite))].join(", ")}). Las materias afectadas permanecen bloqueadas.
        </div>
      )}

      {/* VISTA 1: TABLERO KANBAN */}
      {activeTab === "kanban" && (
        <div className="animate-scale">
          {/* BARRA DE FILTROS */}
          <div className="toolbar glass-card" style={{ padding: "0.75rem 1.25rem" }}>
            <div className="search-wrapper">
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Buscar materia por nombre o código..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filters-wrapper">
              <button
                className={`availability-filter ${availableOnly ? "active" : ""}`}
                onClick={() => setAvailableOnly((current) => !current)}
                aria-pressed={availableOnly}
              >
                <Unlock size={15} /> Disponibles ({availableCount})
              </button>
              <select 
                className="select-filter"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="all">Todos los años</option>
                <option value="1">Primer Año</option>
                <option value="2">Segundo Año</option>
                <option value="3">Tercer Año</option>
                <option value="4">Cuarto Año</option>
                <option value="5">Quinto Año</option>
                <option value="Talleres">Talleres</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </div>

          {/* GRILLA KANBAN */}
          <div className="kanban-grid">
            {/* COLUMNA 1: POR CURSAR */}
            <div 
              className="kanban-column"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "pending")}
            >
              <div className="column-header">
                <div className="column-title-wrapper">
                  <span className="column-indicator" style={{ background: "var(--color-pending)" }}></span>
                  <h3 className="column-title">Por Cursar</h3>
                </div>
                <span className="column-badge">{filteredSubjects.filter(s => s.status === "pending").length}</span>
              </div>
              
              <div className="column-cards-container">
                {filteredSubjects.filter(s => s.status === "pending").map(subject => {
                  const isBlocked = strictMode && !checkPrerequisites(subject, "studying");
                  return (
                    <div 
                      key={subject.id}
                      className={`glass-card subject-card ${isBlocked ? "is-blocked" : ""}`}
                      style={{ borderLeftColor: "var(--color-pending)" }}
                      draggable={!isBlocked}
                      onDragStart={(e) => handleDragStart(e, subject.id)}
                      onClick={() => setSelectedSubject(subject)}
                    >
                      <div className="card-top">
                        <span className="card-code">{subject.id}</span>
                        {isBlocked ? <Lock size={13} style={{ color: "var(--text-muted)" }} /> : <Unlock size={13} style={{ color: "var(--color-approved)" }} />}
                      </div>
                      <h4 className="card-name">{subject.name}</h4>
                      <div className="card-meta">
                        <span>Año {subject.year}</span>
                        <span>{subject.credits} Cr.</span>
                      </div>
                      <div className="card-actions-quick" onClick={(e) => e.stopPropagation()}>
                        {!isBlocked && (
                          <button className="quick-move-btn" onClick={() => moveSubject(subject.id, "studying")} title="Mover a Cursando">
                            Cursar →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMNA 2: CURSANDO */}
            <div 
              className="kanban-column"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "studying")}
            >
              <div className="column-header">
                <div className="column-title-wrapper">
                  <span className="column-indicator" style={{ background: "var(--color-studying)" }}></span>
                  <h3 className="column-title">Cursando</h3>
                </div>
                <span className="column-badge">{filteredSubjects.filter(s => s.status === "studying").length}</span>
              </div>
              
              <div className="column-cards-container">
                {filteredSubjects.filter(s => s.status === "studying").map(subject => {
                  return (
                    <div 
                      key={subject.id}
                      className="glass-card subject-card"
                      style={{ borderLeftColor: "var(--color-studying)" }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, subject.id)}
                      onClick={() => setSelectedSubject(subject)}
                    >
                      <div className="card-top">
                        <span className="card-code">{subject.id}</span>
                      </div>
                      <h4 className="card-name">{subject.name}</h4>
                      <div className="card-meta">
                        <span>Año {subject.year}</span>
                        <span>{subject.credits} Cr.</span>
                      </div>
                      <div className="card-actions-quick" onClick={(e) => e.stopPropagation()}>
                        <button className="quick-move-btn" onClick={() => moveSubject(subject.id, "pending")} title="Volver a Por Cursar">
                          ← Volver
                        </button>
                        <button className="quick-move-btn" onClick={() => moveSubject(subject.id, "regular")} title="Pasar a Regular">
                          Regularizar →
                        </button>
                        <button className="quick-move-btn" onClick={() => moveSubject(subject.id, "approved")} title="Pasar a Aprobada">
                          Aprobar →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMNA 3: REGULAR */}
            <div 
              className="kanban-column"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "regular")}
            >
              <div className="column-header">
                <div className="column-title-wrapper">
                  <span className="column-indicator" style={{ background: "var(--color-regular)" }}></span>
                  <h3 className="column-title">Regular</h3>
                </div>
                <span className="column-badge">{filteredSubjects.filter(s => s.status === "regular").length}</span>
              </div>
              
              <div className="column-cards-container">
                {filteredSubjects.filter(s => s.status === "regular").map(subject => {
                  return (
                    <div 
                      key={subject.id}
                      className="glass-card subject-card"
                      style={{ borderLeftColor: "var(--color-regular)" }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, subject.id)}
                      onClick={() => setSelectedSubject(subject)}
                    >
                      <div className="card-top">
                        <span className="card-code">{subject.id}</span>
                      </div>
                      <h4 className="card-name">{subject.name}</h4>
                      <div className="card-meta">
                        <span>Año {subject.year}</span>
                        <span>{subject.credits} Cr.</span>
                      </div>
                      <div className="card-actions-quick" onClick={(e) => e.stopPropagation()}>
                        <button className="quick-move-btn" onClick={() => moveSubject(subject.id, "studying")} title="Volver a Cursando">
                          ← Volver
                        </button>
                        <button className="quick-move-btn" onClick={() => moveSubject(subject.id, "approved")} title="Pasar a Aprobada">
                          Aprobar (Final) →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* COLUMNA 4: APROBADA */}
            <div 
              className="kanban-column"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "approved")}
            >
              <div className="column-header">
                <div className="column-title-wrapper">
                  <span className="column-indicator" style={{ background: "var(--color-approved)" }}></span>
                  <h3 className="column-title">Aprobada</h3>
                </div>
                <span className="column-badge">{filteredSubjects.filter(s => s.status === "approved").length}</span>
              </div>
              
              <div className="column-cards-container">
                {filteredSubjects.filter(s => s.status === "approved").map(subject => {
                  return (
                    <div 
                      key={subject.id}
                      className="glass-card subject-card"
                      style={{ borderLeftColor: "var(--color-approved)" }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, subject.id)}
                      onClick={() => setSelectedSubject(subject)}
                    >
                      <div className="card-top">
                        <span className="card-code">{subject.id}</span>
                        <CheckCircle2 size={13} style={{ color: "var(--color-approved)" }} />
                      </div>
                      <h4 className="card-name">{subject.name}</h4>
                      <div className="card-meta">
                        <span>Año {subject.year}</span>
                        <span className="card-badge" style={{ 
                          background: subject.grade !== null ? "var(--bg-approved)" : "rgba(255, 255, 255, 0.05)",
                          color: subject.grade !== null ? "var(--color-approved)" : "var(--text-secondary)"
                        }}>
                          {subject.grade !== null ? `Nota: ${subject.grade}` : "Equivalencia"}
                        </span>
                      </div>
                      <div className="card-actions-quick" onClick={(e) => e.stopPropagation()}>
                        <button className="quick-move-btn" onClick={() => moveSubject(subject.id, "regular")} title="Volver a Regular">
                          ← Volver
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: MAPA DE CARRERA (ÁRBOL VISUAL) */}
      {activeTab === "map" && (
        <div className="animate-scale glass-card" style={{ padding: "1.5rem" }}>
          {["1", "2", "3", "4", "5", "Talleres", "Otros"].map(year => {
            const yearSubjects = subjects.filter(s => String(s.year) === year);
            if (yearSubjects.length === 0) return null;

            return (
              <div key={year} className="map-view-year">
                <div className="year-title-banner">
                  <GraduationCap size={20} style={{ color: "var(--primary)" }} />
                  <h3 className="year-title-text">
                    {year === "Talleres" ? "Talleres y Seminarios Complementarios" : year === "Otros" ? "Otros Requisitos" : `${year}º Año`}
                  </h3>
                </div>

                <div className="map-grid">
                  {yearSubjects.map(sub => {
                    let borderCol = "var(--color-pending)";
                    if (sub.status === "studying") borderCol = "var(--color-studying)";
                    if (sub.status === "regular") borderCol = "var(--color-regular)";
                    if (sub.status === "approved") borderCol = "var(--color-approved)";

                    const isBlocked = strictMode && sub.status === "pending" && !checkPrerequisites(sub, "studying");

                    return (
                      <div 
                        key={sub.id} 
                        className={`glass-card subject-card ${isBlocked ? "is-blocked" : ""}`}
                        style={{ borderLeftColor: borderCol }}
                        onClick={() => setSelectedSubject(sub)}
                      >
                        <div className="card-top">
                          <span className="card-code">{sub.id}</span>
                          {isBlocked ? <Lock size={12} style={{ color: "var(--text-muted)" }} /> : <Unlock size={12} style={{ color: "var(--color-approved)" }} />}
                        </div>
                        <h4 className="card-name" style={{ fontSize: "0.9rem" }}>{sub.name}</h4>
                        <div className="card-meta" style={{ marginTop: "0.5rem" }}>
                          <span>{sub.credits} Créditos</span>
                          <span style={{ 
                            color: borderCol, 
                            fontWeight: "600",
                            fontSize: "0.75rem",
                            textTransform: "uppercase" 
                          }}>
                            {sub.status === "pending" ? "Pendiente" : sub.status === "studying" ? "Cursando" : sub.status === "regular" ? "Regular" : `Aprobado (${sub.grade !== null ? sub.grade : "Equiv"})`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA 3: ASISTENTE DE IA (GEMINI) */}
      {activeTab === "ai" && (
        <div className="ai-layout animate-scale">
          {/* PANEL IZQUIERDO: ACCIONES RÁPIDAS IA */}
          <div className="ai-sidebar glass-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.75rem" }}>Consultas Rápidas</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Hacé clic en cualquiera de las consultas predefinidas para que la IA las responda al toque:
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button 
                className="action-btn-outline" 
                style={{ justifyContent: "flex-start", textAlign: "left", padding: "0.75rem" }}
                onClick={() => {
                  setInputValue("Planificame las materias para cursar el próximo cuatrimestre, teniendo en cuenta mis correlativas aprobadas.");
                }}
              >
                📅 Planificar mi próximo cuatri
              </button>
              <button 
                className="action-btn-outline" 
                style={{ justifyContent: "flex-start", textAlign: "left", padding: "0.75rem" }}
                onClick={() => {
                  setInputValue("¿Qué materias se me destraban si apruebo las que tengo regulares hoy?");
                }}
              >
                🔓 ¿Qué materias destrabo?
              </button>
              <button 
                className="action-btn-outline" 
                style={{ justifyContent: "flex-start", textAlign: "left", padding: "0.75rem" }}
                onClick={() => {
                  setInputValue("Tomame un examen simulado de 3 preguntas de Matemática Discreta para practicar.");
                }}
              >
                📝 Simular examen de Discreta
              </button>
              <button 
                className="action-btn-outline" 
                style={{ justifyContent: "flex-start", textAlign: "left", padding: "0.75rem" }}
                onClick={() => {
                  setInputValue("¿Cómo encaro mi Práctica Profesional Supervisada (PPS)? ¿Qué requisitos necesito?");
                }}
              >
                💼 Requisitos de la PPS
              </button>
            </div>
            
            <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <Sparkles size={16} style={{ color: "var(--accent)" }} />
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "500" }}>
                  {(customGeminiKey || GEMINI_API_KEY) ? "Modelo: Gemini (Nube)" : "Modelo: Tutor Local (Simulado)"}
                </span>
              </div>
            </div>
          </div>

          {/* PANEL DERECHO: INTERFAZ DE CHAT */}
          <div className="ai-chat-panel glass-card" style={{ padding: "1.25rem" }}>
            <div className="chat-history">
              {messages.map((msg, i) => (
                <div key={i} className={`chat-msg ${msg.sender}`}>
                  <span className="chat-sender">{msg.sender === "user" ? "Vos" : "Asistente Académico"}</span>
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                </div>
              ))}
              
              {isTyping && (
                <div className="chat-msg assistant">
                  <span className="chat-sender">Asistente Académico</span>
                  <div style={{ display: "flex", gap: "0.25rem", padding: "0.25rem 0" }}>
                    <span className="led syncing" style={{ width: "6px", height: "6px" }}></span>
                    <span className="led syncing" style={{ width: "6px", height: "6px", animationDelay: "0.2s" }}></span>
                    <span className="led syncing" style={{ width: "6px", height: "6px", animationDelay: "0.4s" }}></span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-wrapper">
              <input 
                type="text" 
                className="chat-input"
                placeholder="Escribile al tutor académico..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button type="submit" className="action-btn">
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: INSPECTOR DE MATERIA */}
      {selectedSubject && (
        <div className="modal-overlay" onClick={() => setSelectedSubject(null)}>
          <div className="modal-content animate-scale" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                  CÓDIGO: {selectedSubject.id}
                </span>
                <h3 className="modal-title">{selectedSubject.name}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedSubject(null)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Información básica */}
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className="glass-card" style={{ flex: 1, padding: "0.75rem", textAlign: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Año del plan</span>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: "700", marginTop: "0.25rem" }}>
                    {selectedSubject.year}
                  </h4>
                </div>
                <div className="glass-card" style={{ flex: 1, padding: "0.75rem", textAlign: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Créditos</span>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: "700", marginTop: "0.25rem" }}>
                    {selectedSubject.credits}
                  </h4>
                </div>
                <div className="glass-card" style={{ flex: 1, padding: "0.75rem", textAlign: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Estado</span>
                  <h4 style={{ 
                    fontSize: "0.95rem", 
                    fontWeight: "700", 
                    marginTop: "0.25rem",
                    color: selectedSubject.status === "approved" ? "var(--color-approved)" : selectedSubject.status === "regular" ? "var(--color-regular)" : selectedSubject.status === "studying" ? "var(--color-studying)" : "var(--text-secondary)"
                  }}>
                    {selectedSubject.status === "pending" ? "Por Cursar" : selectedSubject.status === "studying" ? "Cursando" : selectedSubject.status === "regular" ? "Regular" : "Aprobada"}
                  </h4>
                </div>
              </div>

              {/* Selector de Electiva (si aplica) */}
              {selectedSubject.isElectiveSlot && (careerId === "sistemas" || career.electiveOptions?.[selectedSubject.id]) && (
                <div className="form-group">
                  <label className="form-label">Personalizá tu materia Electiva:</label>
                  <select 
                    className="select-filter"
                    style={{ width: "100%" }}
                    value={selectedSubject.electiveChoice || selectedSubject.id}
                    onChange={(e) => handleSelectElective(selectedSubject.id, e.target.value)}
                  >
                    {(career.electiveOptions?.[selectedSubject.id] || (selectedSubject.id.startsWith("17") ? ELECTIVES_I : ELECTIVES_II)).map(option => (
                      <option key={typeof option === "string" ? option : option.id} value={typeof option === "string" ? option : option.id}>
                        {typeof option === "string" ? option : `${option.name} (${option.credits} Cr.)`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selectedSubject.isElectiveSlot && careerId !== "sistemas" && !career.electiveOptions?.[selectedSubject.id] && (
                <div className="form-group">
                  <label className="form-label">Materia electiva oficial</label>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    La selección de alternativas para esta carrera está en revisión de catálogo; el cupo ya se contabiliza como electiva.
                  </p>
                </div>
              )}

              {/* Notas de la materia si está aprobada */}
              {selectedSubject.status === "approved" && (
                <div className="form-group">
                  <label className="form-label">Nota Final:</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input 
                      type="number"
                      min="1"
                      max="10"
                      className="form-input"
                      placeholder="Equivalencia (vacío)"
                      value={selectedSubject.grade !== null ? selectedSubject.grade : ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                        moveSubject(selectedSubject.id, "approved", val);
                      }}
                    />
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", alignSelf: "center" }}>
                      * Dejalo vacío para registrarlo como Equivalencia (no computa para el promedio simple).
                    </span>
                  </div>
                </div>
              )}

              {/* Cambiar Estado */}
              <div className="form-group">
                <label className="form-label">Cambiar Estado:</label>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button 
                    className="action-btn-outline" 
                    style={{ flex: 1 }}
                    onClick={() => { moveSubject(selectedSubject.id, "pending"); setSelectedSubject(null); }}
                  >
                    Por Cursar
                  </button>
                  <button 
                    className="action-btn-outline" 
                    style={{ flex: 1, borderColor: "var(--border-studying)", color: "var(--color-studying)" }}
                    onClick={() => { moveSubject(selectedSubject.id, "studying"); setSelectedSubject(null); }}
                  >
                    Cursando
                  </button>
                  <button 
                    className="action-btn-outline" 
                    style={{ flex: 1, borderColor: "var(--border-regular)", color: "var(--color-regular)" }}
                    onClick={() => { moveSubject(selectedSubject.id, "regular"); setSelectedSubject(null); }}
                  >
                    Regular
                  </button>
                  <button 
                    className="action-btn" 
                    style={{ flex: 1, background: "var(--color-approved)" }}
                    onClick={() => { moveSubject(selectedSubject.id, "approved"); setSelectedSubject(null); }}
                  >
                    Aprobada
                  </button>
                </div>
              </div>

              {/* Inspector de correlativas previas */}
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.5rem" }}>Correlativas Requeridas:</h4>
                {getMissingPrerequisites(selectedSubject).length > 0 && (
                  <p className="catalog-warning" role="alert">
                    Atención: el plan tiene correlatividades sin una materia asociada ({getMissingPrerequisites(selectedSubject).join(", ")}). Esta materia queda bloqueada hasta validar el catálogo oficial.
                  </p>
                )}
                {selectedSubject.prereqs.length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No tiene correlativas previas requeridas.</p>
                ) : (
                  <div className="prereq-list">
                    {selectedSubject.prereqs.map(preId => {
                      const preSub = subjects.find(s => s.id === preId);
                      return (
                        <div key={preId} className="prereq-item">
                          <span>{preSub ? preSub.name : preId} ({preId})</span>
                          <span style={{ 
                            fontWeight: "600",
                            color: preSub?.status === "approved" ? "var(--color-approved)" : preSub?.status === "regular" ? "var(--color-regular)" : "var(--color-pending)" 
                          }}>
                            {preSub?.status === "approved" ? "Aprobada" : preSub?.status === "regular" ? "Regular" : preSub?.status === "studying" ? "Cursando" : "Pendiente"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Inspector de correlativas posteriores */}
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "0.5rem" }}>Destraba a futuro:</h4>
                {getSubsequentSubjects(selectedSubject.id).length === 0 ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No destraba ninguna materia directa de forma posterior.</p>
                ) : (
                  <div className="prereq-list">
                    {getSubsequentSubjects(selectedSubject.id).map(postSub => (
                      <div key={postSub.id} className="prereq-item">
                        <span>{postSub.name} ({postSub.id})</span>
                        <span style={{ color: "var(--text-muted)" }}>Año {postSub.year}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIGURACIÓN */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content animate-scale" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Configuración del Sistema</h3>
              <button className="modal-close-btn" onClick={() => setShowConfigModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Modo estricto */}
              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={strictMode}
                    onChange={(e) => handleStrictModeChange(e.target.checked)}
                  />
                  <span>Habilitar Control Estricto de Correlativas</span>
                </label>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "1.5rem" }}>
                  Si está activado, la app te bloqueará el paso de materias si no tenés las correlativas cursadas/aprobadas correspondientes.
                </p>
              </div>

              {/* API Key de Gemini */}
              <div className="form-group">
                <label className="form-label">Google Gemini API Key (Opcional):</label>
                <input 
                  type="password"
                  className="form-input"
                  placeholder="AIzaSy..."
                  value={customGeminiKey}
                  onChange={(e) => handleSaveCustomKey(e.target.value)}
                />
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Ingresá tu API Key de Gemini para activar el Asistente IA interactivo de la nube de forma directa y segura. La clave se guarda localmente en tu navegador.
                </p>
              </div>

              {/* Cuenta y sincronización */}
              <div className="form-group cloud-account-panel">
                <div className="cloud-account-heading">
                  <Cloud size={18} />
                  <div>
                    <strong>Sincronización privada</strong>
                    <p>Tu avance se guarda por cuenta y por carrera.</p>
                  </div>
                </div>

                {!isFirebaseConfigured ? (
                  <p className="cloud-help">Firebase todavía no está configurado. Completá el archivo <code>.env</code> y reiniciá la aplicación.</p>
                ) : currentUser ? (
                  <div className="cloud-account-actions">
                    <span>{currentUser.email || currentUser.displayName}</span>
                    <button className="action-btn-outline" onClick={handleSignOut}>
                      <LogOut size={16} /> Cerrar sesión
                    </button>
                  </div>
                ) : (
                  <button className="action-btn" onClick={handleGoogleSignIn}>
                    <LogIn size={16} /> Ingresar con Google
                  </button>
                )}

                {authError && <p className="cloud-error" role="alert">{authError}</p>}
              </div>

              {/* Resetear Progreso */}
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "1rem" }}>
                <button className="action-btn-outline" style={{ width: "100%" }} onClick={handleExportProgress}>
                  Descargar respaldo de esta carrera
                </button>
                <label className="restore-backup-label">
                  Restaurar respaldo de esta carrera
                  <input type="file" accept="application/json,.json" onChange={handleRestoreProgress} />
                </label>
              </div>

              {/* Resetear Progreso */}
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "1rem" }}>
                <button 
                  className="action-btn-outline" 
                  style={{ width: "100%", borderColor: "#ef4444", color: "#ef4444" }}
                  onClick={handleResetProgress}
                >
                  <Trash2 size={16} style={{ marginRight: "0.5rem" }} />
                  Resetear Todo el Progreso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
