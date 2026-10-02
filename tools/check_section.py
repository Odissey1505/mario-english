#!/usr/bin/env python3
"""Check one authoring file on its own, so a lesson can be fixed without building the course.

    python3 tools/check_section.py authoring/course-upper/u03.py
"""
import sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from build_course import L, validate, load_sections

if len(sys.argv) < 2:
    print(__doc__); sys.exit(2)
bad = 0
for path in sys.argv[1:]:
    sec = load_sections([path])[0]
    errs, st = validate({'sections': [sec]})
    print(path, '→', sec['name'], json.dumps(st))
    for lesson in sec['lessons']:
        print('   %-52s words %2d  grammar %2d  kinds %s' % (
            lesson['name'][:52], len(lesson['words']), len(lesson['grammar']),
            ''.join(sorted(set(q['k'] for q in lesson['grammar'])))))
    if errs:
        bad += len(errs)
        print('  PROBLEMS:', len(errs))
        for e in errs: print('   -', e)
    else:
        print('  ok')
sys.exit(1 if bad else 0)
