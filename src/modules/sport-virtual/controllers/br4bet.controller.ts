import { Controller, Get } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

@Controller('br4bet')
export class Br4BetController {
    @Get('champs')
    async getChampions() {
        const call = await prisma.game.findMany({
            where: {
                provider: {
                    in: ["br4bet", "goldebet"],
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