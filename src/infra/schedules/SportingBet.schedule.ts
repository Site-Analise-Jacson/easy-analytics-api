import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import puppeteer from "puppeteer-extra";
import { Browser, Page } from "puppeteer";
import { writeFile } from "fs/promises";
import * as path from "path";
import delay from "src/shared/lib/delay";
import { mapSportingbetResponse } from "src/shared/lib/mapSportingbetResponse";
import { PrismaClient } from "@prisma/client";
import * as fs from 'fs';
import { GeminiService } from "../services/Gemini.service";
import { isFailure } from "src/shared/types/result";

puppeteer.use(StealthPlugin());

export const prisma = new PrismaClient();

@Injectable()
export class SportingBetSchedule {
    private readonly logger = new Logger(SportingBetSchedule.name);
    private page: Page;
    private browser: Browser;

    private readonly champions = [
        "eurocopa-103825",
        "champions-cup-100199",
        "copa-do-mundo-100204",
        "superliga-américa-do-sul-103548"
    ];

    private readonly OUTPUT_DIR = "./segments";

    constructor(private readonly gemini: GeminiService) {
        if (!fs.existsSync(this.OUTPUT_DIR)) {
            fs.mkdirSync(this.OUTPUT_DIR);
        }
    }

    private async screenshotNgStar(name: string) {
        const exist = await this.page.$(`#main-view > ms-virtual-list > ms-virtual-fixture > ds-card:nth-child(1) > ms-fixture-media-viewer > video`);

        if (!exist) {
            this.logger.warn("⚠️ Nenhum ng-star-inserted visível encontrado");
            return;
        }

        const filePath = path.join(
            this.OUTPUT_DIR,
            name
        );

        await exist.screenshot({ path: filePath });
        this.logger.log(`📸 Screenshot salvo: ${filePath}`);
    }

    @Cron(CronExpression.EVERY_MINUTE, {
        waitForCompletion: true,
    })
    async handleCron() {
        this.logger.log("🚀 Iniciando captura de screenshots");

        try {
            this.browser = await puppeteer.launch({
                headless: false,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                ],
            });

            this.page = await this.browser.newPage();

            await this.page.setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36"
            );

            await this.page.goto("https://www.bwin.com/en/sports/virtual/football-virtual-101/euro-cup-103825", {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });

            // this.page.on("response", async (response) => {
            //     const url = response.url();

            //     if (!url.includes("/cds-api/bettingoffer/virtual/fixture-view")) return;

            //     try {
            //         const status = response.status();

            //         if (status !== 200) return;

            //         const json = await response.json();
            //         const formattedData = mapSportingbetResponse(json);

            //         if (!formattedData.isValid) return;

            //         const subId = `${formattedData.payload.id}_${formattedData.payload.champion.replaceAll(" ", "_").replaceAll("-", "_")}_sportingbet`;

            //         const hasGame = await prisma.game.findFirst({
            //             where: {
            //                 subId: {
            //                     contains: subId,
            //                     mode: "insensitive"
            //                 }
            //             }
            //         });

            //         if (hasGame) return;

            //         const data = formattedData.payload;

            //         const { odds: { home, ...newOdds } } = data;

            //         await prisma.game.create({
            //             data: {
            //                 subId,
            //                 provider: "sportingbet",
            //                 status: "finalizado",
            //                 champion: data.champion.toLowerCase(),
            //                 date: data.date,
            //                 ftAway: data.scoreboardFT.away,
            //                 ftHome: data.scoreboardFT.home,
            //                 htAway: data.scoreboardHT.away,
            //                 htHome: data.scoreboardHT.home,
            //                 teamA: data.teamA,
            //                 teamB: data.teamB,
            //                 ...newOdds
            //             }
            //         });

            //         console.log("✅ JSON salvo com sucesso!");
            //     } catch (err) {
            //         console.error("❌ Erro ao salvar JSON:", err);
            //     }
            // });

            // while (true) {
            //     const buttons = await this.page.$$(
            //         "#main-view > ms-virtual-list > ms-virtual-fixture > ds-card.ds-card.fixture-details.ds-card-surface-lowest.ds-card-elevated > div > ds-tabs-group > div.ds-tab-header > div > div > button"
            //     );

            //     for (let i = 0; i < buttons.length; i++) {
            //         const btn = buttons[i];

            //         try {
            //             await btn.evaluate(el => el.scrollIntoView({ behavior: "smooth", block: "center" }));
            //             await btn.click();
            //             console.log(`✅ Clicou no botão ${i + 1}/${buttons.length}`);
            //             await delay(1);
            //         } catch (err) {
            //             console.warn(`⚠️ Não conseguiu clicar no botão ${i + 1}:`, err);
            //         }
            //     }

            //     console.log("🔄 Reiniciando ciclo de cliques...");
            //     await delay(2); // espera antes de pegar os botões novamente
            // }

            while (true) {
                const item = await this.page.$(`#ds-tab-id-1-0`);

                if (!item) continue;
                const name = `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.png`;

                await this.screenshotNgStar(name);

                const data = await this.gemini.analyzeImage(`./segments/${name}`);

                if (isFailure(data)) {
                    continue;
                }

                console.log(name);
                console.log(data);

                await delay(10);
            }
        } catch (err) {
            this.logger.error("🔥 Erro no cron", err);
        } finally {
            if (this.browser) {
                await this.browser.close();
                this.logger.log("🛑 Browser fechado");
            }
        }
    }
}
