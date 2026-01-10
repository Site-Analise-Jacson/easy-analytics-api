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
        const room = `${data.provider}/${data.sub.replaceAll(" ", "_").replaceAll("-", "_")}`;
        client.join(room);

        console.log(`📌 ${client.id} entrou na sala: ${room}`);

        const call = await prisma.game.findMany({
            where: {
                provider: {
                    contains: data.provider,
                    mode: "insensitive"
                },
                subId: {
                    contains: data.sub.replaceAll(" ", "_").replaceAll("-", "_"),
                    mode: "insensitive"
                }
            },
            orderBy: { date: 'desc' },
            take: 720,
        });

        const formattedResults = call.map(game => ({
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
        }));

        client.emit('subscribed', { room });
        this.server.to(room).emit('update', formattedResults);
    }

    @SubscribeMessage('unsubscribe')
    handleUnsubscribe(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { provider: string; sub: string }
    ) {
        const room = `${data.provider}/${data.sub}`;
        client.leave(room);

        console.log(`🚪 ${client.id} saiu da sala: ${room}`);
        client.emit('unsubscribed', { room });
    }

    @SubscribeMessage('broadcast')
    async handleBroadcast(
        @MessageBody() data: { provider: string; sub: string; payload: any }
    ) {
        try {
            const room = `${data.provider}/${data.sub.replaceAll(" ", "_").replaceAll("-", "_")}`;

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
                    provider: data.provider,
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
                    provider: data.provider,
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

            this.server.to(room).emit('update', data.payload);
        } catch (error) {
            console.log(error)
        }
    }
}