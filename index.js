const pup = require('puppeteer');
//puppeteer-cluster para trabalhar com filas.
let fs = require('fs');

const url = "https://www.mercadolivre.com.br/";
const searchFor = "macbook";

let c = 1;
const list = [];
let listLinks = [];

function onlyNumber(string) {
    var numsStr = string.replace(/[^0-9]/g,'');
    return parseInt(numsStr);
}

(async function () {
    const browser = await pup.launch({headless: false});
    const page = await browser.newPage();
    await page.goto(url);
    await page.setViewport({width: 1080, height: 1024});

    await Promise.all([
        page.waitForSelector('div.cookie-consent-banner-opt-out__actions button'),
        page.click('div.cookie-consent-banner-opt-out__actions button'),
    ]);

    await page.waitForSelector('#cb1-edit');

    await page.type('#cb1-edit', searchFor);

    await Promise.all([
        page.waitForNavigation(),
        page.click('.nav-icon-search'),        
    ]);

    const pagemax = await page.$eval('.andes-pagination__page-count', el => el.innerText);

    for (let i = 0; i < onlyNumber(pagemax) - 1; i++) {
        try {
            //links da pagina dos produtos
            await page.waitForSelector('.ui-search-result__image.shops__picturesStyles > a');
            let links = await page.$$eval('.ui-search-result__image.shops__picturesStyles > a', el => el.map(link => link.href));
            listLinks.push(links);
            // Click para seguinte pagina.
            await Promise.all([
                page.waitForSelector('span.andes-pagination__arrow-title:nth-child(1)'),  
                page.click('span.andes-pagination__arrow-title:nth-child(1)'),
            ]);  
        } catch (error) {
            continue;
        }
        
    }

    for (const link of listLinks) {
        if (c === 3) continue;
        for (const i of link){
            try {
                await page.goto(i);
                await page.waitForSelector('.ui-pdp-title');
                const title = await page.$eval('.ui-pdp-title', element => element.innerText);
                await page.waitForSelector('.andes-money-amount__fraction');
                const price = await page.$eval('.andes-money-amount__fraction', element => element.innerText);

                const seller = await page.evaluate(() => {
                    const el = document.querySelector('.ui-pdp-action-modal__link > span');
                    if (!el) return null
                    return el.innerText;
                });

                const obj = {};
                obj.title = title;
                obj.price = price;
                (seller ? obj.seller = seller : '');
                obj.link = i;

                list.push(obj);
            } catch (error) {
                 continue;
            }      
        }
        c++;
    }

    fs.writeFile('lista.json', JSON.stringify(list), function (err) {
        if (err) throw err;
    });

    await page.waitForTimeout(3000);
    await browser.close();

})();
