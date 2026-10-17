"""Local Windows build. Python 3.9+, Go 1.27+, Node/npm. Never invokes Actions.

Large immutable downloads/output stay in --cache. --client-build permits a named
NTFS copy of the browser source when the main checkout is on a slow drive.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[2]


def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1048576), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--go', default='go')
    p.add_argument('--npm', default='npm.cmd')
    p.add_argument('--cache', required=True)
    p.add_argument('--client-build')
    p.add_argument('--skip-client', action='store_true')
    p.add_argument('--version', default='0.1.0-preview.3')
    args = p.parse_args()
    cache = Path(args.cache).resolve()
    cache.mkdir(parents=True, exist_ok=True)
    lock = json.loads((ROOT / 'workspace-components.lock.json').read_text(encoding='utf-8'))
    archive = cache / 'postgres.jar'
    if not archive.exists():
        with urllib.request.urlopen(lock['postgres']['url'], timeout=120) as src, archive.open('wb') as out:
            shutil.copyfileobj(src, out)
    assert sha(archive) == lock['postgres']['sha256'], 'Database archive checksum mismatch'
    database = cache / 'postgres'
    if not (database / 'bin/postgres.exe').exists():
        with zipfile.ZipFile(archive) as jar:
            with tarfile.open(fileobj=io.BytesIO(jar.read('postgres-windows-x86_64.txz')), mode='r:xz') as tar:
                for member in tar.getmembers():
                    if member.issym() or member.islnk() or member.name.startswith('/') or '..' in Path(member.name).parts:
                        raise RuntimeError('Unsafe database runtime archive')
                tar.extractall(database)
    client = Path(args.client_build).resolve() if args.client_build else ROOT / 'workspace/client'
    if not args.skip_client:
        subprocess.run([args.npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], cwd=client, check=True)
        subprocess.run([args.npm, 'run', 'workspace:build'], cwd=client, check=True)
    env = dict(os.environ)
    env['GOTMPDIR'] = str(cache / 'go-tmp')
    Path(env['GOTMPDIR']).mkdir(exist_ok=True)
    env['TEMP'] = env['TMP'] = env['GOTMPDIR']
    subprocess.run([args.go, 'build', '-tags', 'postgres', '-buildvcs=false', '-trimpath', '-ldflags', '-s -w',
                    '-o', str(cache / 'tinode-db.exe'), './tinode-db'], cwd=ROOT, env=env, check=True)
    payload = ROOT / 'workspace/payload/runtime.zip'
    payload.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(payload, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for file in sorted(database.rglob('*')):
            if file.is_file():
                z.write(file, 'postgres/' + file.relative_to(database).as_posix())
        z.write(cache / 'tinode-db.exe', 'tinode-db.exe')
        for name in ['index.html', 'workspace-bootstrap.js', 'manifest.json', 'umd', 'css', 'img', 'audio', 'fonts']:
            path = client / name
            files = sorted(path.rglob('*')) if path.is_dir() else [path]
            for file in files:
                if file.is_file() and file.suffix != '.map':
                    z.write(file, 'web/' + file.relative_to(client).as_posix())
        for name, source in [('LICENSE.txt', ROOT / 'LICENSE'), ('NOTICE.txt', ROOT / 'NOTICE'),
                             ('THIRD-PARTY-LICENSES.txt', ROOT / 'THIRD-PARTY-LICENSES.txt'),
                             ('Tinode-Web-Apache-2.0.txt', ROOT / 'workspace/client/LICENSE')]:
            z.write(source, 'web/licenses/' + name)
        for source in sorted((ROOT / 'docs/workspace/licenses').iterdir()):
            z.write(source, 'web/licenses/' + source.name)
    out = ROOT / 'dist'
    out.mkdir(exist_ok=True)
    subprocess.run([args.go, 'build', '-tags', 'postgres,workspace', '-buildvcs=false', '-trimpath',
                    '-ldflags', '-s -w -X github.com/tinode/chat/workspace.Version=' + args.version,
                    '-o', str(out / 'Chat.exe'), './server'], cwd=ROOT, env=env, check=True)
    receipt = {'version': args.version, 'windowsAMD64': True, 'githubActionsUsed': False,
               'runtimeSHA256': sha(payload), 'executableSHA256': sha(out / 'Chat.exe'),
               'executableBytes': (out / 'Chat.exe').stat().st_size, 'components': lock,
               'automatedTestsRun': False}
    (out / 'build-info.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt))


if __name__ == '__main__':
    main()
