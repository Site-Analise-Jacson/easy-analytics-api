import { Module } from '@nestjs/common';
import { Br4BetService } from './br4bet.service';
import { Br4BetController } from './br4bet.controller';
import { Br4BetSchedule } from './schedule/br4bet.schedule';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [Br4BetController],
  providers: [Br4BetService, Br4BetSchedule],
})
export class Br4Bet {}
