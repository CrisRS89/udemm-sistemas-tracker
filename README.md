# 🎓 UdeMM Tracker - Ingenierías UdeMM

¡Che! Bienvenido al **UdeMM Tracker**, la aplicación interactiva y visual en formato Kanban para realizar el seguimiento académico de Ingeniería en Sistemas, Electrónica, Industrial, Mecánica o Electromecánica en la **Universidad de la Marina Mercante (UdeMM)**.

Esta app te permite organizar tus materias de manera visual (arrastrando tarjetas entre estados), calcular tus promedios (simple y ponderado) al instante, verificar correlativas de forma estricta y contar con la ayuda de un **Tutor Académico configurable con IA**.

---

## ✨ Características Principales

*   **Tablero Kanban con 4 Estados**: Organizá tu cursada arrastrando las materias entre *Por Cursar*, *Cursando*, *Regular* y *Aprobada*.
*   **Carreras separadas**: Elegí la carrera desde el encabezado. Cada carrera mantiene su propio catálogo y progreso local; los datos existentes de Sistemas se migran sin borrar la clave anterior.
*   **Cálculo de Promedio Inteligente**: Obtené tu **Promedio Simple** (solo materias aprobadas con nota de final) y tu **Promedio Ponderado** (ponderado por los créditos/horas de cada materia) en tiempo real.
*   **Control Estricto de Correlativas**: La app verifica si cumplís los requisitos para cursar o aprobar cada materia según el plan oficial de la UdeMM. Se puede desactivar para planificar libremente.
*   **Inspector de Correlativas**: Hacé clic en cualquier materia para ver qué materias correlativas previas requiere y qué materias posteriores te destrabará cuando la apruebes.
*   **Selector de Electivas Integrado**: Personalizá las materias electivas genéricas del plan con las opciones reales del programa de UdeMM (Sistemas Embebidos, Ecosistema Digital, etc.).
*   **Sincronización privada (opcional)**: Con Firebase configurado, iniciá sesión con Google para mantener el progreso actualizado en tiempo real entre tus dispositivos. Cada usuario y carrera tiene su propio documento protegido por reglas de Firestore.
*   **Tutor IA configurable**: Gemini, OpenAI, Claude, DeepSeek, OpenRouter o modelos locales compatibles con la API OpenAI (por ejemplo Ollama y LM Studio). Cada usuario conecta su propio proveedor.

---

## 🚀 Instalación y Configuración Rápida

> [!NOTE]
> **No necesitás configurar nada de entrada**: De forma predeterminada, todo tu progreso se guarda localmente y de forma privada en el **LocalStorage de tu navegador** (Modo Local). Firebase es opcional y agrega sincronización privada entre dispositivos.

Cualquier estudiante puede clonar y levantar este proyecto localmente en su máquina con solo tres pasos:

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/CrisRS89/udemm-sistemas-tracker.git
cd udemm-sistemas-tracker
npm install
```

### 2. Configurar sincronización segura con Firebase (opcional)

Si querés sincronizar tu progreso entre dispositivos:

1.  Creá un proyecto web en la [Consola de Firebase](https://console.firebase.google.com/).
2.  En **Authentication → Sign-in method**, habilitá **Google**. No habilites el acceso anónimo.
3.  Creá **Firestore Database**. Las reglas incluidas en `firestore.rules` bloquean todo salvo el documento del usuario autenticado.
4.  Iniciá sesión con Firebase CLI y vinculá el proyecto. Los comandos usan la versión más reciente sin instalarla globalmente:
    ```bash
    npx -y firebase-tools@latest login
    npx -y firebase-tools@latest use --add
    npx -y firebase-tools@latest deploy --only firestore
    ```
5.  Duplicá `.env.example` como `.env` y cargá la configuración de tu aplicación web:
    ```env
    VITE_FIREBASE_API_KEY=tu_api_key_aqui
    VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain_aqui
    VITE_FIREBASE_PROJECT_ID=tu_project_id_aqui
    VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket_aqui
    VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id_aqui
    VITE_FIREBASE_APP_ID=tu_app_id_aqui
    ```
6.  Reiniciá Vite, abrí la aplicación y seleccioná **Ingresar con Google**. La primera vez que haya progreso distinto, la app te permitirá elegir entre la copia local y la nube.

Los datos se guardan en `users/{uid}/careers/{careerId}`. Los antiguos documentos anónimos `shared_plans` no son usados y quedan bloqueados por las reglas actuales.

Antes de desplegar cambios en las reglas, ejecutá su suite contra el emulador local:

```bash
npm run test:rules
```

### 3. Configurar IA (opcional)

El tutor se conecta directamente desde el navegador al proveedor que configure cada usuario; no usa Cloud Functions ni un backend de IA de UdeMM. Cada usuario es responsable de su propia API key, cuenta y consumo. La clave se conserva solo en la sesión del navegador, pero como toda clave usada en frontend no puede considerarse completamente secreta. Las consultas incluyen el progreso académico y se envían al destino seleccionado.

Para modelos locales compatibles con la API OpenAI (por ejemplo Ollama o LM Studio), elegí **IA local**, ingresá el identificador del modelo y la URL base de su servidor (Ollama suele usar `http://localhost:11434/v1`; LM Studio, `http://localhost:1234/v1`). El servidor local debe estar iniciado y permitir CORS para el origen de la aplicación. No hace falta iniciar sesión con Google para el tutor IA. Las llamadas a proveedores en la nube también dependen de que estos permitan solicitudes directas desde el navegador (CORS).

### 4. Publicar en Firebase Hosting

El frontend estático se puede desplegar en Firebase Hosting sin vincular facturación, dentro de los límites gratuitos del plan Spark. Configurá `.env` con las variables Firebase de producción, autenticá Firebase CLI y ejecutá:

```bash
npx -y firebase-tools@latest deploy --only hosting
```

El sitio de este proyecto es `https://seguimientocarrera.web.app`. El build de Vite corre automáticamente antes del deploy. Firebase Hosting aplica cuotas gratuitas; si se alcanzan, el sitio puede quedar limitado hasta que se renueve la cuota o se cambie de plan.

### 5. Ejecutar en tu entorno local

Para levantar el servidor de desarrollo de Vite:

```bash
npm run dev
```

La aplicación se abrirá automáticamente en tu navegador web en `http://localhost:5173`.

---

## 🛠️ Tecnologías Utilizadas

*   **Vite + React** (JavaScript)
*   **Vanilla CSS** (Diseño Premium con soporte para animaciones y variables dinámicas)
*   **Firebase (Google Auth & Firestore)** (Para sincronización privada en tiempo real)
*   **Firebase JS SDK** (Auth y Firestore; el tutor IA no utiliza Cloud Functions)
*   **Lucide React** (Paquete de íconos vectoriales modernos)

---

Hecho con ❤️ para la comunidad de Ingeniería en Sistemas de la UdeMM.
