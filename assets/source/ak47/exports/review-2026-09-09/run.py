"""Run declared Blender experiments: two evaluation processes or one render queue."""
import argparse
import concurrent.futures
import json
import subprocess
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('cases', nargs='*')
    parser.add_argument('--render', action='store_true')
    parser.add_argument('--high', action='store_true')
    args = parser.parse_args()
    manifest_path = HERE / 'run-01/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    known = {c['id'] for c in manifest['cases']}
    cases = args.cases or [c['id'] for c in manifest['cases']]
    if len(cases) != len(set(cases)) or not set(cases) <= known:
        parser.error('Cases must be unique IDs from the frozen manifest')
    if args.high and not args.render:
        parser.error('--high requires --render')

    def execute(case):
        started = time.monotonic()
        out = Path(manifest['outputRoot']) / case
        out.mkdir(parents=True, exist_ok=True)
        blend = str(Path(manifest['workingRoot']) / case / 'candidate.blend') if args.render else manifest['baseline']
        command = [BLENDER, '-b', blend, '-t', '4', '--python-exit-code', '1', '--python', str(HERE/'worker.py'), '--', '--manifest', str(manifest_path), '--case', case]
        if args.render:
            command.append('--render-only')
        if args.high:
            command.append('--high')
        log = out / ('render.log' if args.render else 'worker.log')
        with log.open('w') as stream:
            process = subprocess.run(command, stdout=stream, stderr=subprocess.STDOUT, check=False)
        status = {'case': case, 'phase': 'render' if args.render else 'evaluate', 'exitCode': process.returncode, 'seconds': round(time.monotonic()-started, 3), 'log': str(log)}
        if process.returncode:
            status['errorTail'] = log.read_text()[-3000:]
        print(json.dumps(status), flush=True)
        return status

    with concurrent.futures.ThreadPoolExecutor(max_workers=1 if args.render else 2) as pool:
        statuses = list(pool.map(execute, cases))
    if any(s['exitCode'] != 0 for s in statuses):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
