import puppeteer from 'puppeteer';
import shell from 'shelljs';
import { URL } from 'url';

const FETCH_COMPLETE = 'fetch complete';

export default async function downloader(pkg, output) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
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
    (pkgName, msg) => {
      import(`https://dev.jspm.io/${pkgName}`).then(() => {
        console.log(msg);
      });
    },
    pkg,
    FETCH_COMPLETE,
  );

  return new Promise((resolve) => {
    page.on('console', async (msg) => {
      if (msg.text() === FETCH_COMPLETE) {
        await browser.close();
        resolve({ dir });
      }
    });
  });
}
