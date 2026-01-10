import { NestFactory } from '@nestjs/core';
import { Br4Bet } from './modules/br4bet/br4bet.module';
import { SportVirtualModule } from './modules/sport-virtual/sport-virtual.module';

(async () => {
  const app = await NestFactory.create(SportVirtualModule);
  await app.listen(process.env.PORT ?? 5000);
})();