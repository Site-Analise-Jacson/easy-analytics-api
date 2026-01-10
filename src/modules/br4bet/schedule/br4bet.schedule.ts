import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Br4BetService } from '../br4bet.service';
import { VirtualSportGame } from '../domain/VirtualSportGame';
import { VirtualSportTeam } from '../domain/VirtualSportTeam';
import { isSuccess } from 'src/shared/types/result';
import { VirtualSportEvent } from '../domain/VirtualSportEvent';
import { parse } from 'date-fns';
import { PrismaClient } from '@prisma/client';
import { fromZonedTime } from 'date-fns-tz'

@Injectable()
export class Br4BetSchedule {
  private readonly logger = new Logger(Br4BetSchedule.name);
  private readonly prisma = new PrismaClient();

  constructor(private readonly br4BetService: Br4BetService) { }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    try {
      const call = await this.br4BetService.getResults();
      const games = call.flatMap((r) =>
        (r.games ?? []).map((game) => ({
          ...game,
          champion: r.champion.fullName,
          championId: r.champion.id
        }))
      );

      const domainGames = games.map((game) => {
        const teams = game.teams
          ?.map((t) =>
            VirtualSportTeam.create({
              external_id: t.id.toString(),
              name: t.name,
            }),
          )
          .filter(isSuccess)
          .map((t) => t.right) ?? [];

        const eventGroups = game.event_groups
          ?.map(eg =>
            VirtualSportEvent.create({
              tag: eg.tag,
              events: eg.events?.map(t => ({
                tag: t.tag ?? '',
                odds: (t.odds ?? [])
                  .filter(odd => odd !== null && odd !== undefined)
                  .map(odd => ({
                    price: odd.price,
                    tag: odd.tag,
                  })),
              })) ?? [],
            })
          )
          .filter(isSuccess)
          .map(t => t.right) ?? [];

        const date = parse(game.startDate, "dd/MM/yyyy HH:mm", new Date());
        const utcDate = fromZonedTime(date, "America/Sao_Paulo");

        return VirtualSportGame.create({
          dbId: game.dbId,
          eventId: game.eventId,
          subId: game.subId ?? 0,
          external_id: game.id?.toString() ?? '',
          status: game.status.toString().toLowerCase(),
          tag: game.tag ?? '',
          champion: game.champion.toLowerCase(),
          championId: game.championId,
          startDate: utcDate,
          teams: teams,
          event_groups: eventGroups,
          HT: game.HT
            ? {
              price: game.HT.price ?? undefined,
              home: game.HT.home ?? undefined,
              away: game.HT.away ?? undefined,
            }
            : undefined,
          FT: game.FT
            ? {
              price: game.FT.price ?? undefined,
              home: game.FT.home ?? undefined,
              away: game.FT.away ?? undefined,
            }
            : undefined,
        });
      })
        .filter(isSuccess)
        .map(t => t.right) ?? [];

      for (const game of domainGames) {
        if (!game.externalId || !game.championId || !game.tag) {
          console.warn('Campos do índice único ausentes, pulando:', game);
          continue;
        }

        const search = `${game.dbId}_${game.championId}_${game.eventId}_${game.externalId}`;

        const newOdds = game.eventGroups.find((eg) => eg.tag === 'Principal');

        if (!newOdds) {
          this.logger.warn(`Principal odds not found for game ${game.dbId}`);
          continue;
        }

        // Mapeamento das odds
        const ams = newOdds.events.find((e) => e.tag === 'Ambas as equipes podem marcar')?.odds.find((o) => o.tag === 'Sim')?.price ?? 0;
        const amn = newOdds.events.find((e) => e.tag === 'Ambas as equipes podem marcar')?.odds.find((o) => o.tag === 'Não')?.price ?? 0;
        const o05 = newOdds.events.find((e) => e.tag === 'Total')?.odds.find((o) => o.tag === 'Mais de 1,5')?.price ?? 0;
        const o15 = newOdds.events.find((e) => e.tag === 'Total')?.odds.find((o) => o.tag === 'Mais de 1,5')?.price ?? 0;
        const o25 = newOdds.events.find((e) => e.tag === 'Total')?.odds.find((o) => o.tag === 'Mais de 2,5')?.price ?? 0;
        const o35 = newOdds.events.find((e) => e.tag === 'Total')?.odds.find((o) => o.tag === 'Mais de 3,5')?.price ?? 0;
        const u05 = newOdds.events.find((e) => e.tag === 'Total')?.odds.find((o) => o.tag === 'Menos de 0,5')?.price ?? 0;
        const u15 = newOdds.events.find((e) => e.tag === 'Total')?.odds.find((o) => o.tag === 'Menos de 1,5')?.price ?? 0;
        const u25 = newOdds.events.find((e) => e.tag === 'Total')?.odds.find((o) => o.tag === 'Menos de 2,5')?.price ?? 0;
        const u35 = newOdds.events.find((e) => e.tag === 'Total')?.odds.find((o) => o.tag === 'Menos de 3,5')?.price ?? 0;

        const payload = {
          subId: search,
          status: game.status,
          date: game.startDate,
          champion: game.champion,
          scoreboardFT: { home: parseInt(game.ft?.home ?? '0'), away: parseInt(game.ft?.away ?? '0') },
          scoreboardHT: { home: parseInt(game.ht?.home ?? '0'), away: parseInt(game.ht?.away ?? '0') },
          teamA: game.teams[0].name,
          teamB: game.teams[1].name,
          odds: {
            ams,
            amn,
            o05,
            o15,
            o25,
            o35,
            u05,
            u15,
            u25,
            u35,
          },
        };

        // this.timeGateway.handleBroadcast({
        //   provider: 'br4bet',
        //   sub: game.champion.replaceAll(' ', '_'),
        //   payload,
        // });
      }

      this.logger.debug(`Fetched ${domainGames.length} games.`);
    } catch (error) {
      this.logger.error('❌ Error in cron job', error as Error);
    }
  }
}