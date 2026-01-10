import { Controller, Get } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

@Controller('betano')
export class BetanoController {
    @Get('champs')
    async getChampions() {
        const call = await prisma.game.findMany({
            where: {
                provider: {
                    contains: "betano",
                    mode: "insensitive"
                },
            },
            distinct: ['champion'],
            select: {
                champion: true,
            },
        });

        return call.map(item => ({
            tag: item.champion,
            sub: item.champion.replaceAll(" ", "-").toLowerCase()
        }));
    }

}