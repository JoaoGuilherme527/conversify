import puppeteer from "puppeteer"
import Chromium from "@sparticuz/chromium"

export default async function scraper() {
    const browser = await puppeteer.launch({ 
        args: Chromium.args,
        defaultViewport: Chromium.defaultViewport,
        executablePath: await Chromium.executablePath(),
        headless: true,
    })
    let page = await browser.newPage()
    await page.goto("https://www.fundsexplorer.com.br/ranking", { waitUntil: "networkidle0" })

    const funds = await page.evaluate(() => {
        const data: { fundName: string, currentPrice: string, dividendYield: string, priceChange: string }[] = []
        const rows = document.querySelectorAll("tbody.default-fiis-table__container__table__body tr")

        rows.forEach((row: any) => {
            const fundName = row.querySelector('td[data-collum="collum-post_title"] a')?.textContent.trim() || "N/A"
            const currentPrice = row.querySelector('td[data-collum="collum-valor"]')?.textContent.trim() || "N/A"
            const dividendYield = row.querySelector('td[data-collum="collum-yeld"]')?.textContent.trim() || "N/A"
            const priceChange = row.querySelector('td[data-collum="collum-variacao_cotacao_mes"]')?.textContent.trim() || "N/A"

            if (currentPrice !== "N/A") {
                let newData = { fundName, currentPrice, dividendYield, priceChange }
                data.push(newData)
            }
        })

        return data
    })
    await browser.close()
    return funds
}


