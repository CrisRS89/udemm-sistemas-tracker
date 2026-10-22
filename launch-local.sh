#!/bin/bash
set -eu
cd /home/kalicrs/proyectos/udemm-sistemas-tracker
export PATH="/usr/bin:/bin:$PATH"
echo 'UdeMM Tracker — cerrá esta terminal o pulsá Ctrl+C para detenerlo.'
echo 'Si ya está abierto, usá http://localhost:5173 en el mismo navegador.'
if /usr/bin/npm run dev -- --host localhost --port 5173 --strictPort --open; then
  exit 0
else
  echo 'No se pudo iniciar. Revisá el error de arriba (puede estar abierto ya).'
  read -r -p 'Presioná Enter para cerrar...' || true
fi
