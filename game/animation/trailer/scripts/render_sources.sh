#!/bin/sh
# Renders every source clip the trailer uses: clean 1080p ranges of the authored films, then the new shots.
# Run from this folder:  sh render_sources.sh
B="${BLENDER:-/c/Program Files/Blender Foundation/Blender 5.3/blender.exe}"
R() { "$B" -b "../../blend/$1.blend" --python render_range.py -- "../clips/$2.mp4" $3 $4 > /dev/null 2>&1 && echo "ok $2"; }
R launch_earth launch_pad 1 60
R launch_earth launch_liftoff 220 330
R launch_earth launch_climb 470 650
R edl_mars edl_entry 0 100
R edl_mars edl_touchdown 660 790
R dust_storm storm_front 0 150
R dust_storm storm_engulf 380 530
R ascent_mars ascent_ignition 90 210
R failure_air_leak leak 40 200
for s in comms_down radiation return_earth celebration; do
  "$B" -b --factory-startup -P shot_$s.py -- --video > /dev/null 2>&1 && echo "ok trailer_$s"
done
