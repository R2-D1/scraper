#!/usr/bin/env node
const { spawn } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
const scriptPath = path.join(projectRoot, 'src', 'unsplash', 'pull-media.ts');

function showUsage() {
  console.log(
    [
      'Використання:',
      '  unsplash <https://unsplash.com/photos/...> [--out <шлях>] [--keep]',
      '  usp <https://unsplash.com/photos/...> [--out <шлях>] [--keep]',
      '',
      'Додаткові аргументи після URL прокидаються без змін у стандартну команду unsplash:pull.',
    ].join('\n')
  );
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    showUsage();
    process.exit(argv.length === 0 ? 1 : 0);
    return;
  }

  const [url, ...rest] = argv;
  if (!url) {
    showUsage();
    process.exit(1);
    return;
  }

  const child = spawn(
    process.execPath,
    [
      '-r',
      require.resolve('ts-node/register/transpile-only'),
      scriptPath,
      '--',
      '--url',
      url,
      ...rest,
    ],
    {
      stdio: 'inherit',
      cwd: projectRoot,
      env: {
        ...process.env,
        TS_NODE_PROJECT: tsConfigPath,
      },
    }
  );

  child.on('exit', code => {
    process.exit(code ?? 0);
  });

  child.on('error', error => {
    console.error('Не вдалося запустити unsplash:pull.', error);
    process.exit(1);
  });
}

main();
