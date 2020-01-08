#!/usr/bin/env node --experimental-modules --experimental-json-modules

import program from 'commander';
import shell from 'shelljs';
import colors from 'colors';
import _fs from 'fs';
import downloader from './downloader.mjs';
import packageJson from './package.json';

const fs = _fs.promises;

const MODULE_ROOT_DIR = 'js_modules';
const MODULE_INFO_FILE = 'module.json';

const createModuleJSON = () => {
  shell.touch(MODULE_INFO_FILE);
  shell.ShellString('{}').to(MODULE_INFO_FILE);
  return {};
};

program.version(packageJson.version, '-v, --version');

program
  .command('install [<pkg>]')
  .alias('i')
  .description('install javascript modules')
  .action(async (pkg) => {
    let moduleInfo;
    try {
      moduleInfo = JSON.parse(await fs.readFile(MODULE_INFO_FILE, 'utf8'));
    } catch {
      moduleInfo = createModuleJSON();
    }
    const installPkg = async (name) => {
      shell.mkdir('-p', MODULE_ROOT_DIR);
      Object.assign(moduleInfo, await downloader(name, MODULE_ROOT_DIR));
      shell.ShellString(JSON.stringify(moduleInfo, null, 2)).to(MODULE_INFO_FILE);
    };
    if (pkg) {
      installPkg(pkg);
    } else {
      let promise = Promise.resolve();
      Object.values(moduleInfo).forEach(async ({ name, isIndirect }) => {
        if (!isIndirect) promise = promise.then(() => installPkg(name));
      });
    }
  });

program
  .command('uninstall <pkg>')
  .description('uninstall javascript modules')
  .action(async (pkg) => {
    const moduleInfo = JSON.parse(await fs.readFile(MODULE_INFO_FILE, 'utf8'));
    // const files = await fs.readdir(MODULE_ROOT_DIR);

    if (!moduleInfo[pkg] || moduleInfo[pkg].isIndirect) {
      console.error(colors.red('You did not install the module directly'));
      process.exit(1);
      return;
    }

    console.warn(colors.yellow('warn: Cannot delete file from js_modules'));

    const removeModule = (jsm) => {
      const canRemove = !Object.values(moduleInfo).find(
        ({ name, requires }) => name !== pkg && requires.includes(jsm),
      );
      moduleInfo[jsm].requires.forEach(removeModule);
      if (canRemove) {
        shell.rm(`${MODULE_ROOT_DIR}/${moduleInfo[jsm].main}`);
        // Tricky
        // const dir = files.find(name => new RegExp(`:${moduleInfo[jsm].name}@`).test(name));
        // shell.rm('-rf', `${MODULE_ROOT_DIR}${dir}`);
        delete moduleInfo[jsm];
      }
    };

    removeModule(pkg);

    shell.ShellString(JSON.stringify(moduleInfo, null, 2)).to(MODULE_INFO_FILE);

    if (!Object.keys(moduleInfo).length) {
      shell.rm('-rf', MODULE_INFO_FILE, MODULE_ROOT_DIR);
    }
  });

program
  .command('clean')
  .description('remove all javascript modules')
  .action(async () => {
    shell.rm('-rf', MODULE_INFO_FILE, MODULE_ROOT_DIR);
  });

if (!process.argv.slice(2).length) {
  program.outputHelp(colors.red);
}

program.on('command:*', () => {
  console.error(
    colors.red('Invalid command: %s\nSee --help for a list of available commands.'),
    program.args.join(' '),
  );
  process.exit(1);
});

program.parse(process.argv);
