import formatDateBR from 'src/shared/lib/formatDateBR';
import { markLowestAndHighest } from 'src/shared/lib/markLowestAndHighest';
import { Injectable } from '@nestjs/common';
import { SportVirtualController } from 'src/modules/sport-virtual/sport-virtual.controller';
import VirtualSportRepo from '../repositories/VirtualSportRepo';
import { getStatusText } from 'src/shared/domain/VirtualSportChampGameStatus';

@Injectable()
export class Br4BetService {
  async getResults() {
    const callGetChamps = await VirtualSportRepo.getChampions();
    const getChamps = callGetChamps.filter((ch) => ch.champs?.length);

    const results = await Promise.all(
      getChamps.flatMap((champ) =>
        (champ.champs ?? []).map(async (ch) => {
          const callGetGames = await VirtualSportRepo.getGames({
            champId: ch.id,
            dbId: champ.dbId,
            id: champ.id,
          });

          const gameDetails = await Promise.all(
            callGetGames.map(async (gameDetail) => {
              const call = await VirtualSportRepo.getGameDetails({
                eventId: gameDetail.id,
                dbId: champ.dbId,
                id: champ.id,
              });

              const odds =
                call?.odds.map((odd) => ({
                  id: odd.id,
                  price: odd.price,
                  tag: odd.name,
                  typeId: odd.typeId,
                })) ?? [];

              const events =
                call?.markets?.flatMap((m) => ({
                  id: m.id,
                  tag: m.name,
                  odds: m.desktopOddIds.flatMap((d) =>
                    d.map((f) => odds.find((c) => c.id == f)),
                  ),
                })) ?? [];

              const groups = call?.marketGroups.map((gr) => ({
                id: gr.id,
                tag: gr.name,
                events: events.filter((e) => gr.marketIds.includes(e.id)),
              }));

              const ftAndHht = call?.odds
                ?.filter((t) => t.typeId >= 110 && t.typeId <= 166)
                ?.filter((t) => t.oddStatus === 1);

              const marked = markLowestAndHighest(ftAndHht ?? []);

              const main_odd = marked.find(c => c.isHighest && !c.isLowest) ?? ftAndHht?.[0];
              const first_time_odd = marked.find(c => !c.isHighest && c.isLowest) ?? ftAndHht?.[0];

              return {
                eventId: gameDetail.id,
                dbId: champ.dbId,
                id: champ.id,
                subId: call?.id,
                tag: call?.name,
                status: getStatusText(gameDetail.status),
                startDate: call?.startDate ? formatDateBR(call.startDate) : '',
                teams: call?.competitors,
                HT: {
                  price: first_time_odd?.price ?? null,
                  home: first_time_odd?.name?.split(':')[0] ?? null,
                  away: first_time_odd?.name?.split(':')[1] ?? null,
                },
                FT: {
                  price: main_odd?.price ?? null,
                  home: main_odd?.name?.split(':')[0] ?? null,
                  away: main_odd?.name?.split(':')[1] ?? null,
                },
                event_groups: groups ?? [],
              };
            }),
          );

          return {
            champion: {
              id: ch.id,
              fullName: `${ch.catName} ${ch.name}`,
            },
            games: gameDetails,
          };
        }),
      ),
    );

    // this.timeGateway.broadcastTime(results);
    return results;
  }

  async getChamps() {
    const call = await VirtualSportRepo.getChampions();

    const champDefault = call.find((c) => c.id === 35);

    return champDefault?.champs?.map((c) => ({
      id: c.id,
      tag: `${c.catName} ${c.name}`,
    }));
  }
}
