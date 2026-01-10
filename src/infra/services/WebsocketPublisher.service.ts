import { Injectable, OnModuleInit } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';

@Injectable()
export class WebsocketPublisherService implements OnModuleInit {
    private socket: Socket;

    onModuleInit() {
        this.socket = io("wss://sport.rupturemc.com", {
            transports: ["websocket"],
        });

        this.socket.on("connect", () => {
            console.log("🔥 Conectado ao WebSocket:", this.socket.id);
        });
    }

    sendBroadcast(provider: string, sub: string, payload: any) {
        this.socket.emit("broadcast", {
            provider,
            sub,
            payload
        });
    }
}
