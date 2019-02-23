import puppeteer from 'puppeteer';
import shell from 'shelljs';
import ora from 'ora';
import { URL } from 'url';

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

  let dir;
  page.on('response', async (res) => {
    const { pathname } = new URL(res.url());
    const matchResult = pathname.match(/(.*)\/[^/]*$/);
    if (matchResult) {
      const fullDir = `${output}${matchResult[1]}`;
      dir = `${output}/${matchResult[0].split('/')[1]}`;
      shell.mkdir('-p', fullDir);
    }
    shell.ShellString(await res.text()).to(`${output}${pathname}`);
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
        resolve({ dir });
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
