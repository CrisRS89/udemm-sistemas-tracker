# 🎓 Rastreador de Carrera - Ingeniería en Sistemas UdeMM

¡Che! Bienvenido al **UdeMM Tracker**, la aplicación interactiva y visual en formato Kanban para realizar el seguimiento académico de tu carrera de **Ingeniería en Sistemas** en la **Universidad de la Marina Mercante (UdeMM)**. 

Esta app te permite organizar tus materias de manera visual (arrastrando tarjetas entre estados), calcular tus promedios (simple y ponderado) al instante, verificar correlativas de forma estricta y contar con la ayuda de un **Tutor Académico con Inteligencia Artificial (Gemini)**.

---

## ✨ Características Principales

*   **Tablero Kanban con 4 Estados**: Organizá tu cursada arrastrando las materias entre *Por Cursar*, *Cursando*, *Regular* y *Aprobada*.
*   **Cálculo de Promedio Inteligente**: Obtené tu **Promedio Simple** (solo materias aprobadas con nota de final) y tu **Promedio Ponderado** (ponderado por los créditos/horas de cada materia) en tiempo real.
*   **Control Estricto de Correlativas**: La app verifica si cumplís los requisitos para cursar o aprobar cada materia según el plan oficial de la UdeMM. Se puede desactivar para planificar libremente.
*   **Inspector de Correlativas**: Hacé clic en cualquier materia para ver qué materias correlativas previas requiere y qué materias posteriores te destrabará cuando la apruebes.
*   **Selector de Electivas Integrado**: Personalizá las materias electivas genéricas del plan con las opciones reales del programa de UdeMM (Sistemas Embebidos, Ecosistema Digital, etc.).
*   **Sincronización en la Nube**: Si configurás Firebase, podés generar un código único (ej: `U-8F3A2`) para guardar tu progreso en la nube y sincronizarlo en múltiples dispositivos o compartir tu plan con otros compañeros.
*   **Asistente de IA (Gemini)**: Integración con la API de Google Gemini para planificar tus cuatrimestres, simular exámenes o consultar dudas académicas con un tutor virtual localizado al dialecto argentino.

---

## 🚀 Instalación y Configuración Rápida

> [!NOTE]
> **No necesitás configurar nada de entrada**: De forma predeterminada, todo tu progreso se guarda localmente y de forma privada en el **LocalStorage de tu navegador** (Modo Local). Los pasos de Firebase son 100% opcionales, solo si querés habilitar la sincronización en la nube y compartir tu plan.

Cualquier estudiante puede clonar y levantar este proyecto localmente en su máquina con solo tres pasos:

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/TU_USUARIO/udemm-sistemas-tracker.git
cd udemm-sistemas-tracker
npm install
```

### 2. Configurar Base de Datos (Firebase) y Gemini (Opcional)

Si querés sincronizar tu progreso en la nube o usar la IA real en vez del tutor simulado:

1.  Creá un proyecto web en la [Consola de Firebase](https://console.firebase.google.com/).
2.  Habilitá **Authentication** (con el método *Anónimo* activado) y **Firestore Database** en modo de prueba.
3.  Duplicá el archivo `.env.example` en la raíz del proyecto y renombralo como `.env`.
4.  Cargá tus credenciales de Firebase en el archivo:
    ```env
    VITE_FIREBASE_API_KEY=tu_api_key_aqui
    VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain_aqui
    VITE_FIREBASE_PROJECT_ID=tu_project_id_aqui
    VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket_aqui
    VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id_aqui
    VITE_FIREBASE_APP_ID=tu_app_id_aqui
    ```
5.  *(Opcional)* Si querés usar la IA real en el chat, podés colocar tu API Key de Gemini como `VITE_GEMINI_API_KEY` en el mismo archivo `.env` o configurarla directamente desde el menú de la aplicación.

### 3. Ejecutar en tu entorno local

Para levantar el servidor de desarrollo de Vite:

```bash
npm run dev
```

La aplicación se abrirá automáticamente en tu navegador web en `http://localhost:5173`.

---

## 🛠️ Tecnologías Utilizadas

*   **Vite + React** (JavaScript)
*   **Vanilla CSS** (Diseño Premium con soporte para animaciones y variables dinámicas)
*   **Firebase (Auth & Firestore)** (Para la sincronización en la nube en tiempo real)
*   **Google Generative AI SDK** (Para el Asistente IA con Gemini)
*   **Lucide React** (Paquete de íconos vectoriales modernos)

---

Hecho con ❤️ para la comunidad de Ingeniería en Sistemas de la UdeMM.
