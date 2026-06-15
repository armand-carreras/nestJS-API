import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { CreateUserDto } from './DTO/create-user-dto.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }
}
