import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaClient } from "@prisma/client";
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import { SplitColBet365, SplitDataType, SplitType } from "src/shared/types/split-type";
import { parseHorarioToDate, parseHorarioToDateBet365 } from "src/shared/lib/parseHorarioToDate";
import { parseOddsString } from "src/shared/lib/getOdds";
import { parseVencedorHTFT } from "src/shared/lib/parseVencedorHTFT";
import { SportVirtualController } from "src/modules/sport-virtual/sport-virtual.controller";

export const prisma = new PrismaClient();

puppeteer.use(StealthPlugin());

@Injectable()
export class ThTipsSchedule {
    private readonly logger = new Logger(ThTipsSchedule.name);
    private lastUpdate: Date | null = null;

    constructor(private readonly webSocket: SportVirtualController) { }

    @Cron(CronExpression.EVERY_SECOND, {
        waitForCompletion: true,
    })
    async handleCron() {
        const cronStart = new Date();
        this.logger.log(`⏱ [${cronStart.toISOString()}] Cron disparado — iniciando ThTipsSchedule...`);

        let browser: Browser | null = null;

        try {
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            });
            this.logger.log('🚀 Puppeteer iniciado com sucesso');

            const page = await browser.newPage();

            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
            );

            this.logger.log('🌐 Navegando até https://thtips.com.br...');
            await page.goto('https://thtips.com.br', { waitUntil: 'networkidle0' });

            await page.waitForSelector('#email', { timeout: 30000 })
                .catch(async (e) => {
                    this.logger.warn('⚠️ Selector #email não encontrado, salvando screenshot...');
                });

            await page.type('#email', process.env.PERSON_USER_MAIL || 'carlosjpa213@gmail.com');
            await page.type('#password', process.env.PERSON_USER_PASS || 'Gemeos123@');

            this.logger.log('🔑 Dados preenchidos, realizando login...');
            await Promise.all([
                page.click('button[type="submit"]'),
                page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {
                    this.logger.warn('⚠️ Nenhuma navegação detectada após submit — prosseguindo...');
                }),
            ]);

            this.logger.log('✅ Login realizado com sucesso. Cookies salvos.');

            while (true) {
                try {
                    const now = new Date();
                    const events = [
                        { tag: "futebolvirtual", liga: 0, action: this.formatBet365ExpressResult, filePath: "express-bet365", champion: "express", provider: "bet365" },
                        { tag: "futebolvirtual", liga: 1, action: this.formatBet365ExpressResult, filePath: "euro-bet365", champion: "euro", provider: "bet365" },
                        { tag: "futebolvirtual", liga: 2, action: this.formatBet365ExpressResult, filePath: "copa-bet365", champion: "copa", provider: "bet365" },
                        { tag: "futebolvirtual", liga: 3, action: this.formatBet365ExpressResult, filePath: "premier-bet365", champion: "premier", provider: "bet365" },
                        { tag: "futebolvirtual", liga: 4, action: this.formatBet365ExpressResult, filePath: "super-bet365", champion: "super", provider: "bet365" },
                        { tag: "betanoFutebolVirtual", liga: 1, action: this.formatBet365ExpressResult, filePath: "brasileirao-betano", champion: "brasileirao", provider: "betano" },
                        { tag: "betanoFutebolVirtual", liga: 2, action: this.formatBet365ExpressResult, filePath: "classicos-betano", champion: "classicos", provider: "betano" },
                        { tag: "betanoFutebolVirtual", liga: 3, action: this.formatBet365ExpressResult, filePath: "copa-betano", champion: "copa", provider: "betano" },
                        { tag: "betanoFutebolVirtual", liga: 4, action: this.formatBet365ExpressResult, filePath: "euro-betano", champion: "euro", provider: "betano" },
                        { tag: "betanoFutebolVirtual", liga: 5, action: this.formatBet365ExpressResult, filePath: "america-betano", champion: "america", provider: "betano" },
                        { tag: "betanoFutebolVirtual", liga: 6, action: this.formatBet365ExpressResult, filePath: "british-betano", champion: "british", provider: "betano" },
                        { tag: "betanoFutebolVirtual", liga: 7, action: this.formatBet365ExpressResult, filePath: "espanhola-betano", champion: "espanhola", provider: "betano" },
                        { tag: "betanoFutebolVirtual", liga: 8, action: this.formatBet365ExpressResult, filePath: "scudetto-betano", champion: "scudetto", provider: "betano" },
                        { tag: "betanoFutebolVirtual", liga: 9, action: this.formatBet365ExpressResult, filePath: "italiano-betano", champion: "italiano", provider: "betano" },
                        { tag: "betanoFutebolVirtual", liga: 11, action: this.formatBet365ExpressResult, filePath: "estrelas-betano", champion: "estrelas", provider: "betano" },
                        { tag: "betanoFutebolVirtual", liga: 12, action: this.formatBet365ExpressResult, filePath: "campeoes-betano", champion: "campeoes", provider: "betano" },
                    ];

                    for (const event of events) {
                        const { tag, liga, action } = event;
                        this.logger.log(`🚀 Iniciando atualização do evento: ${tag} (Liga: ${liga})`);

                        const result = await this.fetchData(tag, liga, page);

                        (result as any).champion = event.champion;
                        (result as any).provider = event.provider;

                        await action.call(this, result);

                        this.logger.log(`✅ Finalizado: ${tag} (${liga})`);
                        this.logger.log(`✅ [${new Date().toISOString()}] ${tag} (${liga}) atualizado`);
                        this.lastUpdate = now;
                    }

                    this.logger.log(`📊 [${new Date().toISOString()}] Todos os dados atualizados com sucesso`);
                } catch (err) {
                    this.logger.error(`❌ Erro ao buscar ou formatar dados: ${(err as any).message}`, err as any);
                }

                this.logger.log(`📊 Todos os dados foram atualizados com sucesso às ${new Date().toISOString()}`);
                await new Promise((r) => setTimeout(r, 1000));
            }
        } catch (err) {
            this.logger.error(`💥 Erro crítico no job ThTipsSchedule: ${(err as any).message}`, err as any);
        } finally {
            if (browser) {
                await browser.close();
                this.logger.log('🛑 Puppeteer finalizado');
            }
        }
    }

    private async fetchData(tag: string, liga: number, page: Page): Promise<SplitType> {
        return page.evaluate(async ({ tag, liga }) => {
            const token = localStorage.getItem("access_token");

            const filters = [
                "ambn", "ambs", "ftv",
                "o05", "o15", "o25", "o35",
                "u05", "u15", "u25", "u35",
                "ft10", "ft20", "ft21",
                "ft30", "ft31", "ft32",
                "ft40", "ft41", "ft42", "ft43",
                "ft50", "ft51", "ft52", "ft53",
                "ft60", "ft61", "ft62",
                "ft70", "ft71",
                "ft80",
                "ft00", "ft11", "ft22", "ft33", "ft44",
                "ft01", "ft02", "ft03", "ft13", "ft23",
                "ft04", "ft14", "ft24", "ft34",
                "ft05", "ft15", "ft25", "ft35",
                "ft06", "ft16", "ft26",
                "ft07", "ft17",
                "ft08",
                "ge0", "ge1", "ge2", "ge3", "ge4", "ge5", "ge6", "ge7", "ge8",
                "ftc", "fte", "ftv"
            ].join(",");

            const url = `https://api.thtips.com.br/api/${tag}?Liga=${liga}&Horas=Horas24&filtros=${encodeURIComponent(filters)}`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            return await response.json();
        }, { tag, liga });
    }

    private async formatBet365ExpressResult(result: SplitDataType & { champion: string, provider: string; }) {
        const data = (result.Linhas || [])
            .map((line) =>
                (line.Colunas || [])
                    .filter((col) => col && col.Horario)
                    .map((col: SplitColBet365) => {
                        return {
                            id: col.Id,
                            date: result.provider === "bet365" ? parseHorarioToDateBet365(col.Horario) : parseHorarioToDate(col.Horario),
                            ft: col.Resultado_FT,
                            ht: col.Resultado_HT,
                            result: col.Resultado,
                            teams: [col.TimeA, col.TimeB],
                            odds: parseOddsString(col.Odds),
                            win: parseVencedorHTFT(col.Vencedor_HT_FT ?? "")
                        }
                    })
            )
            .filter((colunas) => colunas.length > 0)
            .flat()
            .filter(c => c.ft && c.ht).map(col => {
                const search = `${col.id}_${result.champion}_${result.provider}`;

                const [homeFT, awayFT] = col.ft.split('-').map(String);
                const [homeHT, awayHT] = col.ht.split('-').map(String);

                const isFinalized = Boolean(col.result && col.result !== "");

                const payload = {
                    subId: search,
                    provider: result.provider,
                    status: isFinalized ? "finalizado" : "pendente",
                    date: col.date ?? new Date,
                    champion: result.champion,
                    scoreboardFT: { home: homeFT, away: awayFT },
                    scoreboardHT: { home: homeHT, away: awayHT },
                    teamA: col.teams[0],
                    teamB: col.teams[1],
                    odds: {
                        away: col.odds["Outros"]["Fora"] || 0,               // Odds para Fora
                        draw: col.odds["Outros"]["Empate"] || 0,             // Odds para Empate
                        ams: col.odds["Ambas Marcam"]["Sim"],
                        amn: col.odds["Ambas Marcam"]["Não"],
                        o05: col.odds["Over/Under"]["Over 0.5"] || 0,        // Odds para Over 0.5
                        o15: col.odds["Over/Under"]["Over 1.5"] || 0,        // Odds para Over 1.5
                        o25: col.odds["Over/Under"]["Over 2.5"] || 0,        // Odds para Over 2.5
                        o35: col.odds["Over/Under"]["Over 3.5"] || 0,        // Odds para Over 3.5
                        u05: col.odds["Over/Under"]["Under 0.5"] || 0,       // Odds para Under 0.5
                        u15: col.odds["Over/Under"]["Under 1.5"] || 0,       // Odds para Under 1.5
                        u25: col.odds["Over/Under"]["Under 2.5"] || 0,       // Odds para Under 2.5
                        u35: col.odds["Over/Under"]["Under 3.5"] || 0,       // Odds para Under 3.5
                        g0: col.odds["Goals Exact"]["Goals 0"] || 0,         // Odds para Total de Gols 0
                        g1: col.odds["Goals Exact"]["Goals 1"] || 0,         // Odds para Total de Gols 1
                        g2: col.odds["Goals Exact"]["Goals 2"] || 0,         // Odds para Total de Gols 2
                        g3: col.odds["Goals Exact"]["Goals 3"] || 0,         // Odds para Total de Gols 3
                        g4: col.odds["Goals Exact"]["Goals 4"] || 0,         // Odds para Total de Gols 4
                        g5: col.odds["Goals Exact"]["Goals 5"] || 0,         // Odds para Total de Gols 5
                        g6: col.odds["Goals Exact"]["Goals 6"] || 0,         // Odds para Total de Gols 6
                        g7: col.odds["Goals Exact"]["Goals 7"] || 0,         // Odds para Total de Gols 7
                        g8: col.odds["Goals Exact"]["Goals 8"] || 0,         // Odds para Total de Gols 8
                    },
                }

                this.webSocket.handleBroadcast({
                    provider: result.provider,
                    sub: result.champion.toLowerCase().replaceAll(' ', '_'),
                    payload,
                });

                return payload;
            });

        return {
            champion: result.champion,
            provider: result.provider,
            data,
        };
    }
}
