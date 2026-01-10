import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { isFailure } from "src/shared/types/result";
import { MilionarioTipsService } from "../services/milionariotips.service";
import { WebsocketPublisherService } from "../services/WebsocketPublisher.service";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

@Injectable()
export class MilionarioTipsSchedule {
    private readonly logger = new Logger(MilionarioTipsSchedule.name);

    constructor(
        private readonly milionarioTipsService: MilionarioTipsService,
        private readonly websocket: WebsocketPublisherService
    ) {}

    @Cron(CronExpression.EVERY_10_SECONDS, {
        waitForCompletion: true,
    })
    async handleCron() {
        const startedAt = Date.now();
        this.logger.log("🚀 MilionarioTips cron started");

        const call = await this.milionarioTipsService.getLatestMatches(new Date());

        if (isFailure(call)) {
            this.logger.error(
                "❌ Failed to fetch latest matches",
                JSON.stringify(call.left),
            );
            return;
        }

        const champions = call.right;
        this.logger.log(`📊 Fetched ${champions.length} champions`);

        await Promise.all(
            champions.map(async (champ) => {
                this.logger.log(
                    `🏆 Champion: ${champ.champion} | Provider: ${champ.provider} | Games: ${champ.games.length}`,
                );

                const processedGames = await Promise.all(
                    champ.games.map(async (game) => {
                        const search = `${game.id}_${champ.champion.replaceAll(" ", "_")}_${champ.provider}`;

                        this.logger.debug(
                            `🔎 Checking game ${game.id} (subId: ${search})`,
                        );

                        const hasItem = await prisma.game.findUnique({
                            where: { subId: search },
                        });

                        if (hasItem) {
                            this.logger.debug(
                                `⏭️ Game already processed, skipping: ${search}`,
                            );
                            return null;
                        }

                        this.logger.debug(`📥 Fetching match details for ${game.id}`);

                        const matchDetailCall =
                            await this.milionarioTipsService.getMatchDetails(game.id);

                        if (isFailure(matchDetailCall)) {
                            this.logger.warn(
                                `⚠️ Failed to fetch match details for game ${game.id}`,
                            );
                            return null;
                        }

                        const detail = matchDetailCall.right;

                        this.logger.debug(
                            `🧩 Building payload for game ${game.id}`,
                        );

                        const gamePayload = {
                            subId: search,
                            provider: champ.provider,
                            status: "finalizado",
                            champion: champ.champion.toLowerCase(),
                            date: game.date,
                            scoreboardFT: {
                                home: game.ftHome,
                                away: game.ftAway,
                            },
                            scoreboardHT: {
                                home: game.htHome,
                                away: game.htAway,
                            },
                            teamA: game.teamA,
                            teamB: game.teamB,
                            odds: {
                                ams: detail.ams ?? 0,
                                amn: detail.amn ?? 0,
                                o05: detail.o05 ?? 0,
                                o15: detail.o15 ?? 0,
                                o25: detail.o25 ?? 0,
                                o35: detail.o35 ?? 0,
                                u05: detail.u05 ?? 0,
                                u15: detail.u15 ?? 0,
                                u25: detail.u25 ?? 0,
                                u35: detail.u35 ?? 0,
                                away: detail.away ?? 0,
                                draw: detail.draw ?? 0,
                                g0: detail.g0 ?? 0,
                                g1: detail.g1 ?? 0,
                                g2: detail.g2 ?? 0,
                                g3: detail.g3 ?? 0,
                                g4: detail.g4 ?? 0,
                                g5: detail.g5 ?? 0,
                                g6: detail.g6 ?? 0,
                                g7: detail.g7 ?? 0,
                                g8: detail.g8 ?? 0,
                            },
                        };

                        this.logger.debug(
                            `📡 Broadcasting game ${game.id} via WebSocket`,
                        );

                        this.websocket.sendBroadcast(
                            gamePayload.provider,
                            gamePayload.champion.replaceAll(" ", "_"),
                            gamePayload,
                        );

                        return gamePayload;
                    }),
                );

                const validGames = processedGames.filter(Boolean);

                this.logger.log(
                    `✅ Champion ${champ.champion}: ${validGames.length}/${champ.games.length} new games processed`,
                );
            }),
        );

        const duration = Date.now() - startedAt;
        this.logger.log(
            `🏁 MilionarioTips cron finished in ${duration}ms`,
        );
    }
}
