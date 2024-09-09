"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = scraper;
const puppeteer_1 = __importDefault(require("puppeteer"));
function scraper() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch({ headless: true });
        let page = yield browser.newPage();
        yield page.goto("https://www.fundsexplorer.com.br/ranking", { waitUntil: "networkidle0", timeout: 0 });
        page.setDefaultNavigationTimeout(0);
        const funds = yield page.evaluate(() => {
            const data = [];
            const rows = document.querySelectorAll("tbody.default-fiis-table__container__table__body tr");
            rows.forEach((row) => {
                var _a, _b, _c, _d;
                const fundName = ((_a = row.querySelector('td[data-collum="collum-post_title"] a')) === null || _a === void 0 ? void 0 : _a.textContent.trim()) || "N/A";
                const currentPrice = ((_b = row.querySelector('td[data-collum="collum-valor"]')) === null || _b === void 0 ? void 0 : _b.textContent.trim()) || "N/A";
                const dividendYield = ((_c = row.querySelector('td[data-collum="collum-yeld"]')) === null || _c === void 0 ? void 0 : _c.textContent.trim()) || "N/A";
                const priceChange = ((_d = row.querySelector('td[data-collum="collum-variacao_cotacao_mes"]')) === null || _d === void 0 ? void 0 : _d.textContent.trim()) || "N/A";
                if (currentPrice !== "N/A") {
                    let newData = { fundName, currentPrice, dividendYield, priceChange };
                    data.push(newData);
                }
            });
            return data;
        });
        yield browser.close();
        return funds;
    });
}
