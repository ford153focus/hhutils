const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

let accounts = JSON.parse(fs.readFileSync(__dirname+path.sep+'accounts.json', 'utf8'));

function hr () {
    for (i=0; i<80; i++) {
        process.stdout.write("=");
    }
    console.log();
}

function timerStart(timerName, message) {
    hr();
    console.time(timerName);
    console.log(message);
}

function timerEnd(timerName) {
    console.timeEnd(timerName);
    hr();
}

(async () => {
    accounts.forEach(async function (account) {
        //region Opening browser
        timerStart("Opening", "Opening browser");
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--window-size=1600,900',
                '--no-sandbox'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({width: 1600, height: 900});
        timerEnd("Opening");
        //endregion

        //region Open main page and auth
        timerStart("main page and auth", "Open main page and auth");
        try {
            await page.goto('https://hh.ru/');
        } catch (e) {
            console.error(e);
            await browser.close();
            process.exit(1);
        }
        await page.evaluate((account) => {
            console.log(account);
            document.querySelectorAll('input[name="username"]')[0].value = account.login;
            document.querySelectorAll('input[name="password"]')[0].value = account.password;
            document.querySelector('form.login-form').submit()
        }, account);
        try {
            await page.waitForNavigation({waitUntil: 'networkidle0'});
        } catch (e) {
            console.trace(e);
        }
        timerEnd("main page and auth");
        //endregion

        //region Open resume and bump it
        timerStart("bump resume", "Open resume and bump it");
        try {
            await page.goto('https://spb.hh.ru/applicant/resumes');
        } catch (e) {
            console.error(e);
            await browser.close();
            process.exit(1);
        }
        let resumeUpdated = await page.evaluate(() => {
            if (document.querySelector('button[type="button"][data-qa="resume-update-button"]').disabled === false) {
                document.querySelector('button[type="button"][data-qa="resume-update-button"]').click();
                return true;
            }
            return false;
            
        });
        if (resumeUpdated) {
            console.log("Resume updated");
            try {
                await page.waitForNavigation({waitUntil: 'networkidle0'});
            } catch (e) {
                console.trace(e);
            }
        } else {
            console.log("There is no need to update resume");
        }
        
        timerEnd("bump resume");
        //endregion

        await browser.close();
    });
})();
