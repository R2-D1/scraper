import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(__dirname, '..', '..');
const TRANSPORT = path.join(ROOT, 'scripts', 'divnex-media-sync-transport.sh');

const writeExecutable = async (target: string, body: string) => {
  await fs.writeFile(target, `#!/usr/bin/env bash\n${body}\n`, 'utf8');
  await fs.chmod(target, 0o755);
};

const run = (command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv) =>
  new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const output: Buffer[] = [];
    child.stdout.on('data', value => output.push(value as Buffer));
    child.stderr.on('data', value => output.push(value as Buffer));
    child.once('error', reject);
    child.once('close', code =>
      resolve({ code, output: Buffer.concat(output).toString('utf8') })
    );
  });

async function fixture(pnpmBody: string) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'media-sync-transport-'));
  const source = path.join(root, 'source');
  const archive = path.join(root, 'batch.zip');
  const fakeBin = path.join(root, 'bin');
  await fs.mkdir(source);
  await fs.mkdir(fakeBin);
  await fs.writeFile(path.join(source, 'payload.txt'), 'payload', 'utf8');
  await writeExecutable(path.join(fakeBin, 'pnpm'), pnpmBody);
  const zipped = await run('zip', ['-rq', archive, '.'], source, process.env);
  assert.equal(zipped.code, 0);
  const checksum = createHash('sha256').update(await fs.readFile(archive)).digest('hex');
  const env = {
    ...process.env,
    PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
    MEDIA_IMPORT_MODE: 'local',
    MEDIA_SYNC_ACTION: 'batch',
    MEDIA_SYNC_ARCHIVE: archive,
    MEDIA_SYNC_BATCH_ID: 'batch-00000001',
    MEDIA_SYNC_CHECKSUM: checksum,
    MEDIA_IMPORT_WORKSPACE_ROOT: path.join(root, 'workspace'),
  };
  return { root, archive, env };
}

test('checksum failure stops before unpack and preserves the archive', async () => {
  const item = await fixture('exit 99');
  try {
    const result = await run('bash', [TRANSPORT], ROOT, {
      ...item.env,
      MEDIA_SYNC_CHECKSUM: 'wrong-checksum',
    });
    assert.notEqual(result.code, 0);
    assert.match(result.output, /Checksum mismatch/);
    await fs.access(item.archive);
  } finally {
    await fs.rm(item.root, { recursive: true, force: true });
  }
});

test('terminal success cleans the archive and unpacked package', async () => {
  const item = await fixture(
    `printf '%s\\n' 'MEDIA_SYNC_RESULT={"batchId":"batch-00000001","status":"completed","imported":1,"updated":0,"skipped":0,"deleted":0,"failed":0}'`
  );
  try {
    const result = await run('bash', [TRANSPORT], ROOT, item.env);
    assert.equal(result.code, 0, result.output);
    await assert.rejects(fs.access(item.archive));
    await assert.rejects(
      fs.access(path.join(item.root, 'workspace', 'imports', 'unpacked', 'batch-00000001'))
    );
  } finally {
    await fs.rm(item.root, { recursive: true, force: true });
  }
});

test('worker failure stops and retains only the current package for retry', async () => {
  const item = await fixture('exit 17');
  try {
    const result = await run('bash', [TRANSPORT], ROOT, item.env);
    assert.notEqual(result.code, 0);
    await fs.access(item.archive);
    await fs.access(
      path.join(item.root, 'workspace', 'imports', 'unpacked', 'batch-00000001')
    );
  } finally {
    await fs.rm(item.root, { recursive: true, force: true });
  }
});

test('an orphan package blocks creation of another package', async () => {
  const item = await fixture('exit 99');
  try {
    const orphan = path.join(item.root, 'workspace', 'imports', 'unpacked', 'old-batch');
    await fs.mkdir(orphan, { recursive: true });
    const result = await run('bash', [TRANSPORT], ROOT, item.env);
    assert.notEqual(result.code, 0);
    assert.match(result.output, /orphan пакети/);
  } finally {
    await fs.rm(item.root, { recursive: true, force: true });
  }
});

test('cleanup removes stale temporary packages after the queue is confirmed idle', async () => {
  const item = await fixture(
    `printf '%s\\n' 'MEDIA_SYNC_RESULT={"status":"completed"}'`
  );
  try {
    const orphan = path.join(item.root, 'workspace', 'imports', 'unpacked', 'old-batch');
    await fs.mkdir(orphan, { recursive: true });
    const result = await run('bash', [TRANSPORT], ROOT, {
      ...item.env,
      MEDIA_SYNC_ACTION: 'cleanup',
    });
    assert.equal(result.code, 0, result.output);
    await assert.rejects(fs.access(orphan));
  } finally {
    await fs.rm(item.root, { recursive: true, force: true });
  }
});

test('cleanup preserves stale packages when the queue is not idle', async () => {
  const item = await fixture('exit 17');
  try {
    const orphan = path.join(item.root, 'workspace', 'imports', 'unpacked', 'old-batch');
    await fs.mkdir(orphan, { recursive: true });
    const result = await run('bash', [TRANSPORT], ROOT, {
      ...item.env,
      MEDIA_SYNC_ACTION: 'cleanup',
    });
    assert.notEqual(result.code, 0);
    await fs.access(orphan);
  } finally {
    await fs.rm(item.root, { recursive: true, force: true });
  }
});

test('remote cleanup clears both host and isolated runtime temporary packages', async () => {
  const item = await fixture('exit 99');
  const fakeBin = item.env.PATH?.split(':')[0] as string;
  const commands = path.join(item.root, 'ssh-commands');
  await writeExecutable(
    path.join(fakeBin, 'ssh'),
    `command="\${*: -1}"
printf '%s\\n' "$command" >> "$MEDIA_SYNC_SSH_COMMANDS"
if [[ "$command" == *"ps --services"* ]]; then
  printf '%s\\n' worker
elif [[ "$command" == *"APP_MODE=media-sync-command"* && "$command" == *"node main.js cleanup"* ]]; then
  printf '%s\\n' 'MEDIA_SYNC_RESULT={"status":"completed"}'
elif [[ "$command" == *"MEDIA_IMPORT_ALLOWED_ROOTS"* ]]; then
  printf '%s\\n%s\\n' /runtime/imports /runtime
fi`
  );
  try {
    const result = await run('bash', [TRANSPORT], ROOT, {
      ...item.env,
      MEDIA_IMPORT_MODE: 'remote',
      MEDIA_SYNC_ACTION: 'cleanup',
      MEDIA_IMPORT_REMOTE: 'example',
      MEDIA_IMPORT_REMOTE_ROOT: '/host/imports',
      MEDIA_IMPORT_REMOTE_PROJECT_ROOT: '/project',
      MEDIA_IMPORT_REMOTE_EXEC: 'compose exec -T worker',
      MEDIA_IMPORT_REMOTE_COMPOSE_CMD: 'compose',
      MEDIA_IMPORT_REMOTE_SERVICE: 'worker',
      MEDIA_SYNC_SSH_COMMANDS: commands,
    });
    assert.equal(result.code, 0, result.output);
    const executed = await fs.readFile(commands, 'utf8');
    assert.match(executed, /APP_MODE=media-sync-command/);
    assert.match(executed, /node main\.js cleanup/);
    assert.doesNotMatch(executed, /sync-batch\.ts/);
    assert.match(executed, /find '\/host\/imports\/archives' '\/host\/imports\/unpacked'/);
    assert.match(executed, /find "\/runtime\/imports\/unpacked"/);
  } finally {
    await fs.rm(item.root, { recursive: true, force: true });
  }
});

test('remote batch uses the shared runtime mount without compose copy', async () => {
  const item = await fixture(
    `printf '%s\\n' 'MEDIA_SYNC_RESULT={"batchId":"batch-00000001","status":"completed","imported":1,"updated":0,"skipped":0,"deleted":0,"failed":0}'`
  );
  const fakeBin = item.env.PATH?.split(':')[0] as string;
  const commands = path.join(item.root, 'ssh-commands');
  await writeExecutable(
    path.join(fakeBin, 'ssh'),
    `command="\${*: -1}"
printf '%s\\n' "$command" >> "$MEDIA_SYNC_SSH_COMMANDS"
if [[ "$command" == *"ps --services"* ]]; then
  printf '%s\\n' worker
elif [[ "$command" == *"df -Pk"* ]]; then
  printf '%s\\n' 1000000000
elif [[ "$command" == *"sha256sum"* ]]; then
  printf '%s\\n' "$MEDIA_SYNC_CHECKSUM"
elif [[ "$command" == *"APP_MODE=media-sync-command"* && "$command" == *"node main.js submit-batch"* ]]; then
  printf '%s\\n' 'MEDIA_SYNC_RESULT={"batchId":"batch-00000001","status":"accepted"}'
elif [[ "$command" == *"APP_MODE=media-sync-command"* && "$command" == *"node main.js status"* ]]; then
  printf '%s\\n' 'MEDIA_SYNC_RESULT={"batchId":"batch-00000001","status":"completed","imported":1,"updated":0,"skipped":0,"deleted":0,"failed":0}'
elif [[ "$command" == *"MEDIA_IMPORT_ALLOWED_ROOTS"* ]]; then
  printf '%s\\n%s\\n' /runtime/imports /runtime
fi`
  );
  await writeExecutable(path.join(fakeBin, 'rsync'), 'exit 0');
  try {
    const result = await run('bash', [TRANSPORT], ROOT, {
      ...item.env,
      MEDIA_IMPORT_MODE: 'remote',
      MEDIA_IMPORT_REMOTE: 'example',
      MEDIA_IMPORT_REMOTE_ROOT: '/host/imports',
      MEDIA_IMPORT_REMOTE_PROJECT_ROOT: '/project',
      MEDIA_IMPORT_REMOTE_EXEC: 'compose exec -T worker',
      MEDIA_IMPORT_REMOTE_COMPOSE_CMD: 'compose',
      MEDIA_IMPORT_REMOTE_SERVICE: 'worker',
      MEDIA_SYNC_SSH_COMMANDS: commands,
    });
    assert.equal(result.code, 0, result.output);
    const executed = await fs.readFile(commands, 'utf8');
    assert.match(executed, /test -d '\/runtime\/imports\/unpacked\/batch-00000001'/);
    assert.match(executed, /--root \/runtime\/imports\/unpacked\/batch-00000001/);
    assert.match(executed, /python3 -m zipfile -e/);
    assert.doesNotMatch(executed, /\bunzip\b/);
    assert.doesNotMatch(executed, /compose cp/);
    await assert.rejects(fs.access(item.archive));
  } finally {
    await fs.rm(item.root, { recursive: true, force: true });
  }
});

test('upload failure preserves the archive and never reaches enqueue', async () => {
  const marker = path.join(os.tmpdir(), `media-sync-enqueue-${process.pid}-${Date.now()}`);
  const item = await fixture(`touch "${marker}"`);
  const fakeBin = item.env.PATH?.split(':')[0] as string;
  await writeExecutable(
    path.join(fakeBin, 'ssh'),
    `command=\"\${*: -1}\"
if [[ \"$command\" == *\"ps --services\"* ]]; then printf '%s\\n' worker
elif [[ \"$command\" == *\"MEDIA_IMPORT_ALLOWED_ROOTS\"* ]]; then printf '%s\\n%s\\n' /workspace/imports /workspace
elif [[ \"$command\" == *\"df -Pk\"* ]]; then printf '%s\\n' 1000000000
fi`
  );
  await writeExecutable(path.join(fakeBin, 'rsync'), 'exit 42');
  try {
    const result = await run('bash', [TRANSPORT], ROOT, {
      ...item.env,
      MEDIA_IMPORT_MODE: 'remote',
      MEDIA_IMPORT_REMOTE: 'example',
      MEDIA_IMPORT_REMOTE_ROOT: '/remote',
      MEDIA_IMPORT_REMOTE_PROJECT_ROOT: '/project',
      MEDIA_IMPORT_REMOTE_EXEC: 'compose exec -T worker',
      MEDIA_IMPORT_REMOTE_COMPOSE_CMD: 'compose',
      MEDIA_IMPORT_REMOTE_SERVICE: 'worker',
    });
    assert.notEqual(result.code, 0);
    await fs.access(item.archive);
    await assert.rejects(fs.access(marker));
  } finally {
    await fs.rm(marker, { force: true });
    await fs.rm(item.root, { recursive: true, force: true });
  }
});

test('unpack failure after a valid checksum preserves the archive', async () => {
  const item = await fixture('exit 99');
  try {
    await fs.writeFile(item.archive, 'not a zip archive', 'utf8');
    const checksum = createHash('sha256').update(await fs.readFile(item.archive)).digest('hex');
    const result = await run('bash', [TRANSPORT], ROOT, {
      ...item.env,
      MEDIA_SYNC_CHECKSUM: checksum,
    });
    assert.notEqual(result.code, 0);
    await fs.access(item.archive);
  } finally {
    await fs.rm(item.root, { recursive: true, force: true });
  }
});

test('cleanup failure preserves the current archive and unpacked package', async () => {
  const item = await fixture(
    `printf '%s\\n' 'MEDIA_SYNC_RESULT={"batchId":"batch-00000001","status":"completed","imported":1,"updated":0,"skipped":0,"deleted":0,"failed":0}'`
  );
  const fakeBin = item.env.PATH?.split(':')[0] as string;
  const state = path.join(item.root, 'rm-state');
  await writeExecutable(
    path.join(fakeBin, 'rm'),
    `target=\"$MEDIA_IMPORT_WORKSPACE_ROOT/imports/unpacked/$MEDIA_SYNC_BATCH_ID\"
if [[ \"$*\" == *\"$target\"* ]]; then
  count=0
  [[ -f \"$MEDIA_SYNC_RM_STATE\" ]] && count=$(<\"$MEDIA_SYNC_RM_STATE\")
  count=$((count + 1))
  printf '%s' \"$count\" > \"$MEDIA_SYNC_RM_STATE\"
  [[ $count -gt 1 ]] && exit 88
fi
exec /bin/rm \"$@\"`
  );
  try {
    const result = await run('bash', [TRANSPORT], ROOT, {
      ...item.env,
      MEDIA_SYNC_RM_STATE: state,
    });
    assert.notEqual(result.code, 0);
    await fs.access(item.archive);
    await fs.access(
      path.join(item.root, 'workspace', 'imports', 'unpacked', 'batch-00000001')
    );
  } finally {
    await fs.rm(item.root, { recursive: true, force: true });
  }
});
