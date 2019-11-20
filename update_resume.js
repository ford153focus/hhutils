#!/usr/bin/env node
const debug = false;

const fs = require('fs');
const json5 = require('json5');
const path = require('path');
const puppeteer = require('puppeteer');

// noinspection FunctionNamingConventionJS
function hr() {
    const lineLength = 80;
    for (let i = 0; i < lineLength; i++) {
        process.stdout.write("=");
    }
    console.log();
}

function timerStart(timerName, message) {
    debug ? console.time(timerName) && hr() : false;
    console.log(message);
}

function timerEnd(timerName, message = "") {
    console.log(message);
    debug ? console.timeEnd(timerName) && hr() : false;
}

function msleep(milliSeconds) {
    Atomics.wait(
        new Int32Array(
            new SharedArrayBuffer(4)
        ),
        0,
        0,
        milliSeconds
    )
}

async function getBrowserAndPage() {
    timerStart("Opening", "Opening browser");

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--window-size=1900,1000',
            '--no-sandbox'
        ]
    });

    const page = await browser.newPage();

    const windowWidth = 1800;
    const windowHeight = 900;

    await page.setViewport({
        width: windowWidth,
        height: windowHeight,
    });

    timerEnd("Opening", "Browser opened");

    return [browser, page];
}

async function authenticate(page, browser, account) {
    timerStart("main page and auth", "Open main page and auth");
    try {
        await page.goto(
            'https://spb.hh.ru/account/login?backurl=%2F',
            {
                timeout: 15300,
                waitUntil: 'networkidle0'
            }
        );
    } catch (e) {
        console.error(e);
        await browser.close();
        process.exit(1);
    }
    await page.evaluate((account) => {
        console.log(account);
        document.querySelectorAll('input[name="username"]')[0].value = account.login;
        document.querySelectorAll('input[name="password"]')[0].value = account.password;
        document.querySelector('form').submit()
    }, account);
    try {
        await page.waitForNavigation({waitUntil: 'networkidle0'});
    } catch (e) {
        console.trace(e);
    }
    timerEnd("main page and auth", "Authenticated");
}

async function bumpResume(page, browser) {
    timerStart("bump resume", "Open resume and bump it");
    try {
        await page.goto(
            'https://spb.hh.ru/applicant/resumes',
            {
                timeout: 15300,
                waitUntil: 'networkidle0'
            }
        );
    } catch (e) {
        console.error(e);
        await browser.close();
        process.exit(1);
    }
    // noinspection FunctionWithMultipleReturnPointsJS
    let resumeUpdated = await page.evaluate(() => {
        let updated = false;
        document.querySelectorAll('button[type="button"][data-qa="resume-update-button"]').forEach((button) => {
            if (button.disabled === false) {
                button.click();
                updated = true;
            }
        });
        return updated;
    });

    // click on l108 is sending ajax request, wait to ensure is completed
    resumeUpdated ? console.log("Resume updated") && msleep(1234) : console.log("There is no need to update resume");

    timerEnd("bump resume");
}

async function processAccount(account) {
    let [browser, page] = await getBrowserAndPage();
    await authenticate(page, browser, account);
    await bumpResume(page, browser);

    await browser.close();
}

(async () => {
    let accounts = json5.parse(fs.readFileSync(__dirname + path.sep + 'accounts.json', 'utf8'));
    accounts.forEach(function (account) {
        processAccount(account);
    });
})();
