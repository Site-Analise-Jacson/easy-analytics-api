import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from 'puppeteer';
import puppeteer from "puppeteer-extra";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { WebsocketPublisherService } from "../services/WebsocketPublisher.service";

export const prisma = new PrismaClient();

puppeteer.use(StealthPlugin());

@Injectable()
export class BetanoSchedule {
    private readonly logger = new Logger(BetanoSchedule.name);
    private page: Page;
    private champion: {
        id: number;
        title: string;
        url: string;
        slug: string;
    };

    constructor(
        private readonly websocket: WebsocketPublisherService
    ) { }

    @Cron(CronExpression.EVERY_SECOND, {
        waitForCompletion: true,
    })
    async handleCron() {
        const cronStart = new Date().toISOString();
        this.logger.log(`🚀 [START] Cron disparado às ${cronStart}`);

        let browser: Browser | null = null;

        try {
            this.logger.log("🔧 Inicializando Puppeteer...");
            browser = await puppeteer.launch({
                headless: true, // em produção, usar true
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                ],
            });
            this.logger.log("🟢 Puppeteer iniciado com sucesso");

            this.page = await browser.newPage();
            this.logger.log("📄 Nova página criada");

            await this.page.setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
            );

            const url = "https://www.betano.bet.br/virtuals/futebol/brasileirao";
            this.logger.log(`🌍 Acessando URL: ${url}`);
            await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

            this.logger.log("🔎 Buscando champions via fetch interno...");
            const champions = await this.getChampions();
            this.logger.log(`🏆 Champions encontrados: ${champions.length}`);

            while (true) {
                for (const champion of champions) {
                    this.champion = champion;
                    this.logger.log(`📌 Processando champion: ${champion.title} (slug: ${champion.slug})`);

                    const results = (await this.getFutureMatches(champion.slug)).filter(c => c !== undefined);
                    this.logger.log(`⚽ Jogos futuros encontrados: ${results.length}`);

                    let createdCount = 0;
                    for (const data of results) {
                        try {
                            const exist = await prisma.game.findUnique({ where: { subId: data.subId } });
                            if (exist) continue;

                            const dateInSaoPaulo = this.convertUTCToSaoPaulo(data.date);

                            await prisma.game.create({
                                data: {
                                    subId: data.subId,
                                    provider: "betano",
                                    date: new Date(dateInSaoPaulo),
                                    champion: data.champion.replaceAll("_", " ").toLowerCase(),
                                    status: data.status,
                                    teamA: data.teamA,
                                    teamB: data.teamB,
                                    away: data.odds.away,
                                    draw: data.odds.draw,
                                    g0: data.odds.g0,
                                    g1: data.odds.g1,
                                    g2: data.odds.g2,
                                    g3: data.odds.g3,
                                    g4: data.odds.g4,
                                    g5: data.odds.g5,
                                    g6: data.odds.g6,
                                    g7: data.odds.g7,
                                    g8: data.odds.g8,
                                    ams: data.odds.ams ?? 0,
                                    amn: data.odds.amn ?? 0,
                                    o05: data.odds.o05 ?? 0,
                                    o15: data.odds.o15 ?? 0,
                                    o25: data.odds.o25 ?? 0,
                                    o35: data.odds.o35 ?? 0,
                                    u05: data.odds.u05 ?? 0,
                                    u15: data.odds.u15 ?? 0,
                                    u25: data.odds.u25 ?? 0,
                                    u35: data.odds.u35 ?? 0,
                                    ftHome: data.scoreboardFT.home,
                                    ftAway: data.scoreboardFT.away,
                                    htHome: data.scoreboardHT.home,
                                    htAway: data.scoreboardHT.away,
                                },
                            });

                            createdCount++;
                        } catch (err) {
                            this.logger.error(`❌ Falha ao criar jogo ${data.subId}: ${(err as any).message}`);
                        }
                    }
                    this.logger.log(`✅ Jogos criados para ${champion.title}: ${createdCount}`);

                    // Atualizações de jogos ao vivo
                    const lives = await this.getResult();
                    this.logger.log(`🔄 Atualizando jogos ao vivo: ${lives.length}`);

                    let updatedCount = 0;
                    for (const live of lives) {
                        try {
                            const existingGame = await prisma.game.findFirst({
                                where: {
                                    subId: {
                                        contains: `${live.id}_${this.champion.id}_${this.champion.title.normalize().replaceAll(" ", "_").toLowerCase()}`,
                                        mode: "insensitive",
                                    }
                                }
                            });
                            if (!existingGame) continue;

                            await prisma.game.update({
                                where: {
                                    id: existingGame.id
                                },
                                data: {
                                    status: "finalizado",
                                    ftHome: live.ftHome,
                                    ftAway: live.ftAway,
                                    htHome: live.htHome,
                                    htAway: live.htAway,
                                },
                            });

                            const gamePayload = {
                                subId: existingGame.subId,
                                provider: existingGame.provider,
                                status: "finalizado",
                                champion: existingGame.champion.toLowerCase(),
                                date: existingGame.date,
                                scoreboardFT: { home: live.ftHome, away: live.ftAway },
                                scoreboardHT: { home: live.htHome, away: live.htAway },
                                teamA: existingGame.teamA,
                                teamB: existingGame.teamB,
                                odds: {
                                    ams: existingGame.ams ?? 0,
                                    amn: existingGame.amn ?? 0,
                                    o05: existingGame.o05 ?? 0,
                                    o15: existingGame.o15 ?? 0,
                                    o25: existingGame.o25 ?? 0,
                                    o35: existingGame.o35 ?? 0,
                                    u05: existingGame.u05 ?? 0,
                                    u15: existingGame.u15 ?? 0,
                                    u25: existingGame.u25 ?? 0,
                                    u35: existingGame.u35 ?? 0,
                                    away: existingGame.away ?? 0,
                                    draw: existingGame.draw ?? 0,
                                    g0: existingGame.g0 ?? 0,
                                    g1: existingGame.g1 ?? 0,
                                    g2: existingGame.g2 ?? 0,
                                    g3: existingGame.g3 ?? 0,
                                    g4: existingGame.g4 ?? 0,
                                    g5: existingGame.g5 ?? 0,
                                    g6: existingGame.g6 ?? 0,
                                    g7: existingGame.g7 ?? 0,
                                    g8: existingGame.g8 ?? 0,
                                },
                            };

                            this.websocket.sendBroadcast(
                                existingGame.provider,
                                existingGame.champion.toLowerCase().replaceAll(' ', '_'),
                                gamePayload
                            );
                            updatedCount++;
                        } catch (err) {
                            this.logger.error(`❌ Falha ao atualizar jogo ${live.subId}: ${(err as any).message}`);
                        }
                    }

                    this.logger.log(`✅ Jogos atualizados para ${champion.title}: ${updatedCount}`);
                }

                this.logger.log("⏱ Aguardando 5 segundos antes da próxima iteração...");
                await new Promise(r => setTimeout(r, 5000));
            }

        } catch (err) {
            this.logger.error(`🔥 [ERROR] Falha no BetanoSchedule: ${(err as any).message}`, err);
        } finally {
            if (browser) {
                this.logger.log("🛑 Encerrando Puppeteer...");
                await browser.close();
                this.logger.log("🔻 Puppeteer finalizado");
            }

            this.logger.log("🏁 [END] Cron finalizado");
        }
    }

    private async getFutureMatches(championName: string) {
        const data = await this.page.evaluate(async ({ champion }) => {
            const call = await fetch(
                `https://www.betano.bet.br/api/virtuals/futebol/${champion}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" }
                }
            );

            const response = await call.json();

            return response.data.content.map((game) => ({
                id: game.id,
                regionId: game.regionId,
                detailUrl: game.url,
                champion: game.leagueDescription,
                teamA: game.displayNameParts[0].name,
                teamB: game.displayNameParts[1].name,
                date: new Date(game.startTime).toISOString()
            }));
        }, { champion: championName }) as { detailUrl: string; teamB: string; teamA: string; date: string; regionId: string; id: string; }[];

        return await Promise.all(
            data.map(async (game) => {
                const subId = `${game.id}_${this.champion.id}_${this.champion.title.normalize().replaceAll(" ", "_").toLowerCase()}`;

                const existingGame = await prisma.game.findUnique({ where: { subId } });
                if (existingGame) return;

                const { champion, ...details } = await this.getMatchDetail(game.detailUrl);

                return {
                    id: game.id,
                    subId: `${game.id}_${this.champion.id}_${this.champion.title.normalize().replaceAll(" ", "_").toLowerCase()}`,
                    status: "pendente",
                    date: game.date,
                    champion: this.champion.title,
                    scoreboardFT: { home: 0, away: 0 },
                    scoreboardHT: { home: 0, away: 0 },
                    teamA: game.teamA,
                    teamB: game.teamB,
                    odds: details,
                };
            })
        );
    }

    private async getMatchDetail(url: string): Promise<MatchOddsPayload> {
        const detail = await this.page.evaluate(async ({ detailUrl }) => {
            const res = await fetch(
                `https://www.betano.bet.br/api${detailUrl}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" }
                }
            );

            const result = await res.json();

            return {
                markets: result.data.currentEvents[0].markets,
                champion: result.data.currentEvents[0].regionName
            };
        }, { detailUrl: url });

        const getMarket = (tag: string) => detail.markets.find(c => c.name == tag);
        const getTotalGoals = (tag: string) => getMarket("Total de gols")?.selections?.find(s => s.name === tag);
        const getOver = (tag: string) => getMarket("Total de Gols Mais/Menos (alternativas)")?.selections?.find(s => s.name === `Mais de ${tag}`);
        const getUnder = (tag: string) => getMarket("Total de Gols Mais/Menos (alternativas)")?.selections?.find(s => s.name === `Menos de ${tag}`);

        const finishedResult = getMarket("Resultado Final");
        const aem = getMarket("Ambas equipes Marcam");

        return {
            champion: detail.champion,
            home: finishedResult?.selections[0]?.price ?? 0,
            draw: finishedResult?.selections[1]?.price ?? 0,
            away: finishedResult?.selections[2]?.price ?? 0,
            ams: aem?.selections?.find(c => c.name === "Sim")?.price ?? 0,
            amn: aem?.selections?.find(c => c.name === "Não")?.price ?? 0,
            g0: getTotalGoals("0")?.price ?? 0,         // Odds para Total de Gols 0
            g1: getTotalGoals("1")?.price ?? 0,         // Odds para Total de Gols 1
            g2: getTotalGoals("2")?.price ?? 0,         // Odds para Total de Gols 2
            g3: getTotalGoals("3")?.price ?? 0,         // Odds para Total de Gols 3
            g4: getTotalGoals("4")?.price ?? 0,         // Odds para Total de Gols 4
            g5: getTotalGoals("5+")?.price ?? 0,        // Odds para Total de Gols 5
            g6: getTotalGoals("6")?.price ?? 0,         // Odds para Total de Gols 6
            g7: getTotalGoals("7")?.price ?? 0,         // Odds para Total de Gols 7
            g8: getTotalGoals("8")?.price ?? 0,         // Odds para Total de Gols 8
            o05: getOver("0.5")?.price ?? 0,            // Odds para Over 0.5
            o15: getOver("1.5")?.price ?? 0,            // Odds para Over 1.5
            o25: getOver("2.5")?.price ?? 0,            // Odds para Over 2.5
            o35: getOver("3.5")?.price ?? 0,            // Odds para Over 3.5
            u05: getUnder("0.5")?.price ?? 0,           // Odds para Under 0.5
            u15: getUnder("1.5")?.price ?? 0,           // Odds para Under 1.5
            u25: getUnder("2.5")?.price ?? 0,           // Odds para Under 2.5
            u35: getUnder("3.5")?.price ?? 0,           // Odds para Under 3.5
        }
    }

    private async getResult() {
        return await this.page.evaluate(async ({ id, title, slug }) => {
            const res = await fetch(
                `https://www.betano.bet.br/api/virtuals/resultsdata?leagueId=${id}&req=la,stnf,c`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" }
                }
            );

            const response = await res.json();
            return response.data.results.map((game) => {
                const result = game.events[0];
                const placeholder = result.statistics;

                return {
                    subId: `${game.id}_${id}_${title.normalize().replaceAll(" ", "_").toLowerCase()}`,
                    id: game.id,
                    champion: game.leagueName,
                    htHome: parseInt(placeholder?.find(c => c.statisticsType === "HalfTimeHomeTeam")?.value?.score) ?? 0,
                    htAway: parseInt(placeholder?.find(c => c.statisticsType === "HalfTimeAwayTeam")?.value?.score) ?? 0,
                    ftHome: parseInt(placeholder?.find(c => c.statisticsType === "FullTimeHomeTeam")?.value?.score) ?? 0,
                    ftAway: parseInt(placeholder?.find(c => c.statisticsType === "FullTimeAwayTeam")?.value?.score) ?? 0,
                };
            });
        }, this.champion) as { subId: string; champion: string; id: string; htHome: number; htAway: number; ftHome: number; ftAway: number; }[];
    }

    private convertUTCToSaoPaulo(utcString: string): Date {
        const date = new Date(utcString);

        // converte para timestamp ajustado para São Paulo (UTC-3)
        const timestamp = date.getTime() - (3 * 60 * 60 * 1000);

        return new Date(timestamp);
    }

    private async getChampions() {
        return await this.page.evaluate(async () => {
            const res = await fetch(
                `https://www.betano.bet.br/api/virtuals/menu?req=la,stnf,c`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" }
                }
            );

            const champions = await res.json().then(c => c.data.menu.find(m => m.id === "FOOT") ?? []);


            return champions.content.map((ch) => {
                const slug = ch.url.split("/").filter(Boolean).pop();

                return {
                    id: ch.leagueId,
                    title: ch.leagueDescription,
                    slug,
                    url: ch.url
                }
            });
        }) as { id: number; title: string; url: string; slug: string; }[];
    }
}

/**
 * Tipo que representa o objeto payload de probabilidades (odds) extraídas.
 */
type MatchOddsPayload = {
    champion: string;
    /** Odds para 'Resultado Final': Vitória do time da Casa (Uruguay) */
    home: number;
    /** Odds para 'Resultado Final': Empate */
    draw: number;
    /** Odds para 'Resultado Final': Vitória do time Visitante (Paraguay) */
    away: number;

    /** Odds para 'Ambas equipes Marcam': Sim (AMS) */
    ams: number;
    /** Odds para 'Ambas equipes Marcam': Não (AMN) */
    amn: number;

    // --- Odds para 'Total de Gols' (Contagem Exata) ---
    g0: number; // Odds para 0 gols
    g1: number; // Odds para 1 gol
    g2: number; // Odds para 2 gols
    g3: number; // Odds para 3 gols
    g4: number; // Odds para 4 gols
    g5: number; // Odds para 5+ gols
    g6: number; // Odds para 6 gols (Pode ser 0 se não estiver disponível)
    g7: number; // Odds para 7 gols (Pode ser 0 se não estiver disponível)
    g8: number; // Odds para 8 gols (Pode ser 0 se não estiver disponível)

    // --- Odds para 'Total de Gols Mais' (Over) ---
    o05: number; // Odds para Mais de 0.5
    o15: number; // Odds para Mais de 1.5
    o25: number; // Odds para Mais de 2.5
    o35: number; // Odds para Mais de 3.5

    // --- Odds para 'Total de Gols Menos' (Under) ---
    u05: number; // Odds para Menos de 0.5 (Corrigido da sua lógica)
    u15: number; // Odds para Menos de 1.5 (Corrigido da sua lógica)
    u25: number; // Odds para Menos de 2.5 (Corrigido da sua lógica)
    u35: number; // Odds para Menos de 3.5
}