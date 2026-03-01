#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/../output/final"
MAX_GIF_SIZE=$((5 * 1024 * 1024))

if ! which ffmpeg > /dev/null 2>&1; then
  echo "Error: ffmpeg not found"
  echo ""
  echo "Install ffmpeg:"
  echo "  macOS:  brew install ffmpeg"
  echo "  Ubuntu: sudo apt install ffmpeg"
  echo "  Fedora: sudo dnf install ffmpeg"
  exit 1
fi

if [ $# -lt 1 ]; then
  echo "Usage: bash demos/scripts/convert.sh <input.webm> [output-name]"
  echo ""
  echo "Example: bash demos/scripts/convert.sh demos/output/recordings/abc123.webm create-shapes"
  exit 1
fi

INPUT="$1"
NAME="${2:-$(basename "$INPUT" .webm)}"
MP4_OUT="$OUTPUT_DIR/$NAME.mp4"
GIF_OUT="$OUTPUT_DIR/$NAME.gif"
PALETTE="/tmp/demo-palette-$NAME.png"

if [ ! -f "$INPUT" ]; then
  echo "Error: input file not found: $INPUT"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "Converting $INPUT → $MP4_OUT"
ffmpeg -y -i "$INPUT" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  -crf 23 \
  -preset medium \
  "$MP4_OUT" 2>/dev/null

echo "Generating palette for GIF..."
ffmpeg -y -i "$MP4_OUT" \
  -vf "fps=15,scale=640:-1:flags=lanczos" \
  -vframes 1 \
  -update 1 \
  "$PALETTE" 2>/dev/null || true

ffmpeg -y -i "$MP4_OUT" \
  -vf "fps=15,scale=640:-1:flags=lanczos,palettegen=stats_mode=diff" \
  "$PALETTE" 2>/dev/null

echo "Converting → $GIF_OUT"
ffmpeg -y -i "$MP4_OUT" -i "$PALETTE" \
  -lavfi "fps=15,scale=640:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" \
  "$GIF_OUT" 2>/dev/null

rm -f "$PALETTE"

GIF_SIZE=$(stat -f%z "$GIF_OUT" 2>/dev/null || stat --printf="%s" "$GIF_OUT" 2>/dev/null || echo 0)
if [ "$GIF_SIZE" -gt "$MAX_GIF_SIZE" ]; then
  GIF_MB=$(echo "scale=1; $GIF_SIZE / 1024 / 1024" | bc)
  echo ""
  echo "Warning: GIF is ${GIF_MB}MB (limit: 5MB)"
  echo ""
  echo "Optimization suggestions:"
  echo "  - Reduce duration: keep scenarios under 30 seconds"
  echo "  - Lower fps: change fps=15 to fps=10 in this script"
  echo "  - Smaller scale: change scale=640 to scale=480"
  echo "  - Crop: add crop filter to remove empty space"
  exit 1
fi

echo ""
echo "Done!"
echo "  MP4: $MP4_OUT"
echo "  GIF: $GIF_OUT ($(du -h "$GIF_OUT" | cut -f1))"
