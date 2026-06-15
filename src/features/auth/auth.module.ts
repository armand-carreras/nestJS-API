import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenHandlingService } from './JWT/token-handling/token-handling.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  controllers: [AuthController],
  providers: [AuthService, TokenHandlingService,],
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ]
})
export class AuthModule { }
