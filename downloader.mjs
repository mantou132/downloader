import puppeteer from 'puppeteer';
import shell from 'shelljs';
import ora from 'ora';
import { URL } from 'url';
import path from 'path';
import replaceToRelative from './replace.mjs';

const FETCH_COMPLETE = 'fetch complete';
const FETCH_FAIL = 'fetch fail';

export default async function downloader(pkg, output) {
  const spinner = ora(`fetching ${pkg}`).start();

  let browser;
  try {
    browser = await puppeteer.launch({});
  } catch {
    browser = await puppeteer.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    });
  }

  const page = await browser.newPage();

  const dependencies = {};
  page.on('response', async (res) => {
    const { pathname, search } = new URL(res.url());
    const realPath = pathname + search;
    const { dir, base } = path.parse(realPath);
    const realFullPath = `${realPath}${realPath.endsWith('.js') ? '' : '.js'}`;
    const { base: main } = path.parse(realFullPath);
    if (dir === '/') {
      dependencies[base] = {
        name: base,
        main,
        requires: [],
      };
      if (base !== pkg) {
        dependencies[base].isIndirect = true;
        const set = new Set(dependencies[pkg].requires);
        set.add(base);
        dependencies[pkg].requires = [...set];
      }
    }
    shell.mkdir('-p', `${output}${dir}`);

    shell.ShellString(replaceToRelative(await res.text(), pathname)).to(`${output}${realFullPath}`);
  });

  await page.goto('about:blank', { waitUntil: 'load' });
  await page.evaluate(
    (pkgName, complete, fail) => {
      import(`https://dev.jspm.io/${pkgName}`)
        .then(() => console.log(complete))
        .catch(() => console.log(fail));
    },
    pkg,
    FETCH_COMPLETE,
    FETCH_FAIL,
  );

  return new Promise((resolve, reject) => {
    page.on('console', async (msg) => {
      if (msg.text() === FETCH_COMPLETE) {
        await browser.close();
        resolve(dependencies);
        spinner.stop();
        spinner.succeed(`installed ${pkg}`);
      }
      if (msg.text() === FETCH_FAIL) {
        await browser.close();
        reject();
        spinner.stop();
        spinner.fail(`install failed ${pkg}`);
      }
    });
  });
}
