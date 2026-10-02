#!/usr/bin/env bash
# Build, then run every check. Run it from the project root: bash tools/test.sh
set -e
cd "$(dirname "$0")/.."
echo "── build ─────────────────────────────────────────"
python3 tools/build_course.py
python3 tools/build.py
echo
echo "── syntax ────────────────────────────────────────"
for f in data/*.js data/courses/*.js src/*.js; do node --check "$f" || exit 1; done
echo "every source file parses"
echo
echo "── the project as a web server serves it ─────────"
node tests/t_split.mjs 2>&1 | grep -v "Not implemented\|Could not load"
echo
echo "── game, content and rules (against dist) ────────"
for t in t_reg t_answer t_hurt t_dup t_builtin t_course t_courses t_hw t_sensei t_ui_opts t_default t_netopics t_netsmooth t_netfmt t_touch t_invite t_library t_freeze t_upper; do
  echo "· $t"
  node "tests/$t.mjs" 2>&1 | grep -v "Not implemented\|Could not load" | sed 's/^/    /'
done
echo
echo "── online play against a stand-in server ─────────"
node tests/t_live.mjs 2>&1 | grep -v "Not implemented\|Could not load" | sed 's/^/    /'
echo
echo "── an invite link, end to end ────────────────────"
node tests/t_invite_live.mjs 2>&1 | grep -v "Not implemented\|Could not load" | sed 's/^/    /'
