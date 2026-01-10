import { Controller, Get, Query } from '@nestjs/common';
import { Br4BetService } from './br4bet.service';
import type { Filter } from 'src/shared/types/Filter';
import { format } from 'date-fns';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('br4bet')
export class Br4BetController {
  constructor(private readonly br4BetService: Br4BetService) { }

  @Get('games')
  async getGames(@Query() filter: Filter) {
    const where: any = {};

    // Filtro por status (salvando sempre lowercase no DB)
    if (filter?.status) {
      where.status = filter.status.toLowerCase();
    }

    // Filtro por campeonatos
    if (filter?.champs) {
      const champsArray = Array.isArray(filter.champs)
        ? filter.champs
        : [filter.champs]; // garante que seja array

      where.OR = champsArray.map((champ) => {
        const parsed = Number(champ);

        if (!isNaN(parsed)) {
          return { championId: parsed };
        }

        return { champion: { contains: champ.toLowerCase() } };
      });
    }

    // Filtro por jogos (id ou tag)
    if (filter?.games) {
      const gamesArray = Array.isArray(filter.games)
        ? filter.games
        : [filter.games];

      where.OR = [
        ...(where.OR || []),
        ...gamesArray.map((g) => ({ external_id: g.toString() })),
        ...gamesArray.map((g) => ({ tag: { contains: g } })),
      ];
    }

    const limit = parseInt(filter?.limit?.toString() ?? '10', 10);
    const page = parseInt(filter?.page?.toString() ?? '1', 10);
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      prisma.virtualSportGame.count({ where }),
      prisma.virtualSportGame.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedData = data.map((g) => ({
      ...g,
      startDate: format(g.startDate, 'dd/MM/yyyy HH:mm'),
    }));

    return {
      total,
      page,
      limit,
      data: formattedData,
    };
  }

  @Get('champs')
  async getChampions() {
    return this.br4BetService.getChamps();
  }
}
