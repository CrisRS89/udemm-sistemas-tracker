#!/bin/bash
# start-app.sh - Lanzador automático para Linux y macOS
echo "=========================================================="
echo "   Che, levantando el servidor de desarrollo de UdeMM..."
echo "=========================================================="
npm run dev &
sleep 2
if command -v xdg-open > /dev/null; then
  xdg-open http://localhost:5173
elif command -v open > /dev/null; then
  open http://localhost:5173
else
  echo "Servidor listo en http://localhost:5173"
fi
