#!/bin/sh
# Re-encode HD films for smooth web playback: H.264 High 4.1, a keyframe every second (instant start and seeking),
# index (moov) at the front so the browser starts before the download ends, capped bitrate so streaming keeps up.
# Usage: sh encode_web_films.sh SOURCE.mp4 [...]   -> writes ../previews/<name>.mp4 (keeps the -hd name)
# Only for newly rendered films: never re-encode the existing HD films (the team keeps those exactly as made).
for src in "$@"; do
  name=$(basename "$src"); tmp="../previews/.$name.tmp.mp4"
  ffmpeg -v error -y -i "$src" -an -c:v libx264 -preset slow -crf 21 -maxrate 5M -bufsize 10M -profile:v high -level 4.1 \
    -pix_fmt yuv420p -g 24 -keyint_min 24 -movflags +faststart "$tmp" && mv "$tmp" "../previews/$name" && echo "encoded $name $(du -h ../previews/$name | cut -f1)"
done
