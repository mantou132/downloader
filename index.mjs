#!/usr/bin/env node --experimental-modules --loader ./script/loader.mjs

import program from 'commander';
import shell from 'shelljs';
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
  .command('install <pkg>')
  .alias('i')
  .description('install javascript modules')
  .action(async (pkg) => {
    let moduleInfo;
    try {
      moduleInfo = JSON.parse(await fs.readFile(MODULE_INFO_FILE, 'utf8'));
    } catch {
      moduleInfo = createModuleJSON();
    }
    shell.mkdir('-p', MODULE_ROOT_DIR);
    const info = await downloader(pkg, MODULE_ROOT_DIR);
    moduleInfo[pkg] = info;
    shell.ShellString(JSON.stringify(moduleInfo, null, 2)).to(MODULE_INFO_FILE);
  });

program
  .command('uninstall <pkg>')
  .description('uninstall javascript modules')
  .action(async (pkg) => {
    shell.rm(`${MODULE_ROOT_DIR}/${pkg}`);
    const moduleInfo = JSON.parse(await fs.readFile(MODULE_INFO_FILE, 'utf8'));
    shell.rm('-rf', moduleInfo[pkg].dir);
    delete moduleInfo[pkg];
    shell.ShellString(JSON.stringify(moduleInfo, null, 2)).to(MODULE_INFO_FILE);
    if (!Object.keys(moduleInfo).length) {
      shell.rm('-rf', MODULE_INFO_FILE, MODULE_ROOT_DIR);
    }
  });

program.parse(process.argv);
