import { Injectable } from '@nestjs/common';
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket
} from '@nestjs/websockets';
import { PrismaClient } from '@prisma/client';
import { Server, Socket } from 'socket.io';

const prisma = new PrismaClient();
// Keep enough rows to cover at least the last 24h.
const MAX_CACHE_RESULTS = 720;
const MAX_INITIAL_RESULTS = MAX_CACHE_RESULTS;
const CACHE_TTL_MS = 60_000;

type FormattedGame = {
    subId: string;
    status: string;
    champion: string;
    date: string;
    scoreboardFT: { home: number; away: number };
    scoreboardHT: { home: number; away: number };
    teamA: string;
    teamB: string;
    odds: {
        ams: number;
        amn: number;
        o05: number;
        o15: number;
        o25: number;
        o35: number;
        u05: number;
        u15: number;
        u25: number;
        u35: number;
    };
};

@Injectable()
@WebSocketGateway({
    cors: { origin: '*' },
    transports: ['polling', 'websocket'],
    path: '/socket.io',
    secure: true,
})
export class SportVirtualController implements OnGatewayConnection, OnGatewayDisconnect {

    @WebSocketServer()
    server: Server;

    private readonly roomCache = new Map<string, { updatedAt: number; data: FormattedGame[] }>();

    private normalizeProvider(provider: string): string {
        const normalized = provider.trim().toLowerCase();

        if (normalized === 'br4bet') return 'goldebet';
        return normalized;
    }

    private normalizeRoomSub(sub: string): string {
        return sub.trim().replaceAll(" ", "_").replaceAll("-", "_").toLowerCase();
    }

    private normalizeChampion(sub: string): string {
        return this.normalizeRoomSub(sub).replaceAll("_", " ").toLowerCase();
    }

    private formatGame(game: {
        subId: string;
        status: string;
        champion: string;
        date: Date;
        ftHome: number;
        ftAway: number;
        htHome: number;
        htAway: number;
        teamA: string;
        teamB: string;
        ams: number;
        amn: number;
        o05: number;
        o15: number;
        o25: number;
        o35: number;
        u05: number;
        u15: number;
        u25: number;
        u35: number;
    }): FormattedGame {
        return {
            subId: game.subId,
            status: game.status,
            champion: game.champion,
            date: game.date.toISOString(),
            scoreboardFT: { home: game.ftHome, away: game.ftAway },
            scoreboardHT: { home: game.htHome, away: game.htAway },
            teamA: game.teamA,
            teamB: game.teamB,
            odds: {
                ams: game.ams,
                amn: game.amn,
                o05: game.o05,
                o15: game.o15,
                o25: game.o25,
                o35: game.o35,
                u05: game.u05,
                u15: game.u15,
                u25: game.u25,
                u35: game.u35,
            },
        };
    }

    private async loadRoomSnapshot(provider: string, champion: string, normalizedSub: string): Promise<FormattedGame[]> {
        const call = await prisma.game.findMany({
            where: {
                provider,
                champion,
            },
            orderBy: { date: 'desc' },
            take: MAX_INITIAL_RESULTS,
            select: {
                subId: true,
                status: true,
                champion: true,
                date: true,
                ftHome: true,
                ftAway: true,
                htHome: true,
                htAway: true,
                teamA: true,
                teamB: true,
                ams: true,
                amn: true,
                o05: true,
                o15: true,
                o25: true,
                o35: true,
                u05: true,
                u15: true,
                u25: true,
                u35: true,
            },
        });

        if (call.length > 0) {
            return call.map((game) => this.formatGame(game));
        }

        // Defensive fallback for legacy rows with inconsistent champion formatting.
        const fallback = await prisma.game.findMany({
            where: {
                provider,
                subId: {
                    contains: normalizedSub,
                    mode: "insensitive",
                },
            },
            orderBy: { date: 'desc' },
            take: MAX_INITIAL_RESULTS,
            select: {
                subId: true,
                status: true,
                champion: true,
                date: true,
                ftHome: true,
                ftAway: true,
                htHome: true,
                htAway: true,
                teamA: true,
                teamB: true,
                ams: true,
                amn: true,
                o05: true,
                o15: true,
                o25: true,
                o35: true,
                u05: true,
                u15: true,
                u25: true,
                u35: true,
            },
        });

        return fallback.map((game) => this.formatGame(game));
    }

    private upsertRoomCache(room: string, game: FormattedGame) {
        const cached = this.roomCache.get(room)?.data ?? [];
        const filtered = cached.filter((item) => item.subId !== game.subId);
        const next = [game, ...filtered]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, MAX_CACHE_RESULTS);

        this.roomCache.set(room, {
            updatedAt: Date.now(),
            data: next,
        });
    }

    handleConnection(client: Socket) {
        console.log("✅ Cliente conectado:", client.id);
    }

    handleDisconnect(client: Socket) {
        console.log("❌ Cliente desconectado:", client.id);
    }

    @SubscribeMessage('subscribe')
    async handleSubscribe(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { provider: string; sub: string }
    ) {
        const normalizedProvider = this.normalizeProvider(data.provider);
        const normalizedSub = this.normalizeRoomSub(data.sub);
        const room = `${normalizedProvider}/${normalizedSub}`;
        client.join(room);

        console.log(`📌 ${client.id} entrou na sala: ${room}`);

        const cached = this.roomCache.get(room);
        const isCachedAndFresh = cached && Date.now() - cached.updatedAt < CACHE_TTL_MS;

        if (isCachedAndFresh) {
            client.emit('subscribed', { room });
            client.emit('update', cached.data);
            return;
        }

        const champion = this.normalizeChampion(data.sub);
        const formattedResults = await this.loadRoomSnapshot(normalizedProvider, champion, normalizedSub);
        this.roomCache.set(room, {
            updatedAt: Date.now(),
            data: formattedResults,
        });

        client.emit('subscribed', { room });
        client.emit('update', formattedResults);
    }

    @SubscribeMessage('unsubscribe')
    handleUnsubscribe(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { provider: string; sub: string }
    ) {
        const room = `${this.normalizeProvider(data.provider)}/${this.normalizeRoomSub(data.sub)}`;
        client.leave(room);

        console.log(`🚪 ${client.id} saiu da sala: ${room}`);
        client.emit('unsubscribed', { room });
    }

    @SubscribeMessage('broadcast')
    async handleBroadcast(
        @MessageBody() data: { provider: string; sub: string; payload: any }
    ) {
        try {
            const normalizedProvider = this.normalizeProvider(data.provider);
            const normalizedSub = this.normalizeRoomSub(data.sub);
            const room = `${normalizedProvider}/${normalizedSub}`;

            const { scoreboardFT, scoreboardHT, odds, ...rest } = data.payload;

            const toInt = (v: any) => {
                const n = parseInt(v);
                return isNaN(n) ? 0 : n;
            };

            await prisma.game.upsert({
                where: {
                    subId: data.payload.subId.replaceAll(" ", "_").replaceAll("-", "_"),
                },
                update: {
                    ...rest,
                    ...data.payload.odds,
                    provider: normalizedProvider,
                    date: new Date(data.payload.date),
                    ams: data.payload.odds.ams ?? 0, // Substitui null por 0
                    amn: data.payload.odds.amn ?? 0, // Substitui null por 0
                    o05: data.payload.odds.o05 ?? 0,
                    o15: data.payload.odds.o15 ?? 0,
                    o25: data.payload.odds.o25 ?? 0,
                    o35: data.payload.odds.o35 ?? 0,
                    u05: data.payload.odds.u05 ?? 0,
                    u15: data.payload.odds.u15 ?? 0,
                    u25: data.payload.odds.u25 ?? 0,
                    u35: data.payload.odds.u35 ?? 0,
                    ftHome: toInt(data?.payload?.scoreboardFT?.home),
                    ftAway: toInt(data?.payload?.scoreboardFT?.away),
                    htHome: toInt(data?.payload?.scoreboardHT?.home),
                    htAway: toInt(data?.payload?.scoreboardHT?.away),
                },
                create: {
                    ...rest,
                    ...data.payload.odds,
                    provider: normalizedProvider,
                    date: new Date(data.payload.date),
                    ams: data.payload.odds.ams ?? 0, // Substitui null por 0
                    amn: data.payload.odds.amn ?? 0, // Se amn for null, substitui por 0
                    o05: data.payload.odds.o05 ?? 0,
                    o15: data.payload.odds.o15 ?? 0,
                    o25: data.payload.odds.o25 ?? 0,
                    o35: data.payload.odds.o35 ?? 0,
                    u05: data.payload.odds.u05 ?? 0,
                    u15: data.payload.odds.u15 ?? 0,
                    u25: data.payload.odds.u25 ?? 0,
                    u35: data.payload.odds.u35 ?? 0,
                    ftHome: toInt(data?.payload?.scoreboardFT?.home),
                    ftAway: toInt(data?.payload?.scoreboardFT?.away),
                    htHome: toInt(data?.payload?.scoreboardHT?.home),
                    htAway: toInt(data?.payload?.scoreboardHT?.away),
                },
            }).catch()

            const formattedPayload: FormattedGame = {
                subId: data.payload.subId.replaceAll(" ", "_").replaceAll("-", "_"),
                status: data.payload.status,
                champion: data.payload.champion,
                date: new Date(data.payload.date).toISOString(),
                scoreboardFT: {
                    home: toInt(data?.payload?.scoreboardFT?.home),
                    away: toInt(data?.payload?.scoreboardFT?.away),
                },
                scoreboardHT: {
                    home: toInt(data?.payload?.scoreboardHT?.home),
                    away: toInt(data?.payload?.scoreboardHT?.away),
                },
                teamA: data.payload.teamA,
                teamB: data.payload.teamB,
                odds: {
                    ams: data.payload.odds.ams ?? 0,
                    amn: data.payload.odds.amn ?? 0,
                    o05: data.payload.odds.o05 ?? 0,
                    o15: data.payload.odds.o15 ?? 0,
                    o25: data.payload.odds.o25 ?? 0,
                    o35: data.payload.odds.o35 ?? 0,
                    u05: data.payload.odds.u05 ?? 0,
                    u15: data.payload.odds.u15 ?? 0,
                    u25: data.payload.odds.u25 ?? 0,
                    u35: data.payload.odds.u35 ?? 0,
                },
            };

            this.upsertRoomCache(room, formattedPayload);
            this.server.to(room).emit('update', data.payload);
        } catch (error) {
            console.log(error)
        }
    }
}