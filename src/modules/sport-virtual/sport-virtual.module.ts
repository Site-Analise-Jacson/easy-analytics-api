import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { Br4BetService } from 'src/infra/services/br4bet.service';
import { Bet365Controller } from './controllers/bet365.controller';
import { MilionarioTipsService } from 'src/infra/services/milionariotips.service';
import { BetanoSchedule } from 'src/infra/schedules/Betano.schedule';
import { WebsocketPublisherService } from 'src/infra/services/WebsocketPublisher.service';
import { BetanoController } from './controllers/betano.controller';
import { Br4BetController } from './controllers/br4bet.controller';
import { SportVirtualController } from './sport-virtual.controller';
import { Br4BetSchedule } from 'src/infra/schedules/Br4bet.schedule';
import { MilionarioTipsSchedule } from 'src/infra/schedules/MilionarioTips.schedule';
import { SportingBetSchedule } from 'src/infra/schedules/SportingBet.schedule';
import { SportingBetService } from 'src/infra/services/SportingBet.service';
import { GeminiService } from 'src/infra/services/Gemini.service';
import { PythonService } from 'src/infra/services/Python.service';

@Module({
    imports: [ScheduleModule.forRoot()],
    controllers: [
        // Br4BetController,
        Bet365Controller,
        BetanoController,
        Br4BetController,
    ],
    providers: [
        SportVirtualController,
        Br4BetService,
        MilionarioTipsService,
        WebsocketPublisherService,
        // BetanoSchedule,
        // Br4BetSchedule,
        // MilionarioTipsSchedule
    ],
})
export class SportVirtualModule { }
