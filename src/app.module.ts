import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './features/auth/auth.module';
import { CitiesModule } from './features/cities/cities.module';

@Module({
  imports: [DatabaseModule, AuthModule, CitiesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
