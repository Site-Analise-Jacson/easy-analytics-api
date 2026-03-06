import { Controller, Get, Query } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

@Controller('bet365')
export class Bet365Controller {
    @Get('champs')
    async getChampions() {
        const call = await prisma.game.findMany({
            where: {
                provider: "bet365",
            },
            distinct: ['champion'],
            select: {
                champion: true,
            },
        });

        return call.map(item => item.champion);
    }

    @Get("results")
    async getResults(
        @Query() query: Filter
    ) {
        const {
            champs,
            games,
            startDate,
            endDate,
            limit = 720,
            page = 1,
            status
        } = query;

        // Paginação
        const take = Math.min(Math.max(Number(limit) || 720, 1), 1000);
        const skip = (Number(page) - 1) * take;
        const gameNames = games && games.length > 0 ? (Array.isArray(games) ? games : [games]) : [];

        const call = await prisma.game.findMany({
            where: {
                provider: "bet365",

                // Filtro: múltiplos campeonatos
                ...(champs && champs.length > 0 && {
                    champion: {
                        in: Array.isArray(champs) ? champs : [champs],
                    }
                }),

                // Filtro: múltiplos jogos
                ...(gameNames.length > 0 && {
                    OR: gameNames.flatMap((name) => ([
                        { teamA: { contains: name, mode: "insensitive" as const } },
                        { teamB: { contains: name, mode: "insensitive" as const } },
                    ])),
                }),

                // Filtro: status
                ...(status && {
                    status: status
                }),

                // Filtro: intervalo de datas
                ...(startDate || endDate
                    ? {
                        date: {
                            ...(startDate && { gte: new Date(startDate) }),
                            ...(endDate && { lte: new Date(endDate) }),
                        }
                    }
                    : {}),
            },
            orderBy: { date: "desc" },
            take,
            skip,
        });

        return call.map(call => ({
            id: call.id,
            externalId: call.subId,
            origin: {
                "game": call.champion,
                "provider": call.provider
            },
            teamA: call.teamA,
            teamB: call.teamB,
            date: call.date,
            result: `${call.ftHome}-${call.ftAway}`,
            ft: `${call.ftHome}-${call.ftAway}`,
            ht: `${call.htHome}-${call.htAway}`,
            winTeam: null,
            winResult: null,
            winPrice: null,
            oddsOverUnderJson: {
                "Over 0.5": call.o05,
                "Over 1.5": call.o15,
                "Over 2.5": call.o25,
                "Over 3.5": call.o35,
                "Under 0.5": call.u05,
                "Under 1.5": call.u15,
                "Under 2.5": call.u25,
                "Under 3.5": call.u35,
            },
            oddsAmbasMarcamJson: {
                "Sim": call.ams,
                "Não": call.amn,
            },
            oddsGoalsExactJson: {
                "Goals 0": call.g0,
                "Goals 1": call.g1,
                "Goals 2": call.g2,
                "Goals 3": call.g3,
                "Goals 4": call.g4,
                "Goals 5": call.g5,
                "Goals 6": call.g6,
                "Goals 7": call.g7,
                "Goals 8": call.g8,
            },
            oddsOutrosJson: {
                "Fora": call.away,
                "Empate": call.draw
            },
            createdAt: call.createdAt,
            updatedAt: call.updatedAt
        }));
    }
}

export type Filter = {
    /** Lista de IDs ou nomes dos campeonatos */
    champs?: string[];

    /** Lista de IDs ou nomes dos jogos */
    games?: string[];

    /** Data inicial do intervalo de busca */
    startDate?: Date;

    /** Data final do intervalo de busca */
    endDate?: Date;

    /** Quantidade máxima de registros por página (default: 720) */
    limit?: number;

    /** Página atual para paginação (default: 1) */
    page?: number;

    status?: 'finalizado' | 'pendente';
};
