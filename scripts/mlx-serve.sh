#!/usr/bin/env bash
#
# Startet die lokalen MLX-Server für den "Lokal (MLX)"-Anbieter (siehe
# docs/MLX_SETUP.md). Text-Server immer, OCR-Server nur wenn MLX_OCR_URL gesetzt.
#
# Voraussetzung: python venv mit `pip install mlx-lm mlx-vlm` (docs/MLX_SETUP.md).
# Aufruf:  ./scripts/mlx-serve.sh
#
set -euo pipefail

VENV="${MLX_VENV:-$HOME/.mlx-venv}"
TEXT_MODEL="${MLX_TEXT_MODEL:-mlx-community/Qwen2.5-7B-Instruct-1M-4bit}"
TEXT_PORT="${MLX_TEXT_PORT:-8082}"
OCR_MODEL="${MLX_OCR_MODEL:-mlx-community/Qwen2.5-VL-3B-Instruct-4bit}"
OCR_PORT="${MLX_OCR_PORT:-8083}"
HERE="$(cd "$(dirname "$0")" && pwd)"

# shellcheck disable=SC1091
source "$VENV/bin/activate"

echo "→ MLX Text-Server: $TEXT_MODEL auf :$TEXT_PORT"
mlx_lm.server --model "$TEXT_MODEL" --port "$TEXT_PORT" &
TEXT_PID=$!

OCR_PID=""
if [ -n "${MLX_START_OCR:-}" ]; then
  echo "→ MLX OCR-Server:  $OCR_MODEL auf :$OCR_PORT (eigener Dienst)"
  MLX_OCR_MODEL="$OCR_MODEL" MLX_OCR_PORT="$OCR_PORT" \
    python "$HERE/mlx-ocr/server.py" &
  OCR_PID=$!
else
  echo "  (OCR-Server übersprungen — MLX_START_OCR setzen, um ihn zu starten)"
fi

trap 'echo; echo "Stoppe MLX-Server …"; kill "$TEXT_PID" ${OCR_PID:+"$OCR_PID"} 2>/dev/null || true' INT TERM
wait
