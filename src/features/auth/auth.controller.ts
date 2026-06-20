import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { CreateUserDto } from './DTO/create-user-dto.interface';
import type { LoginDto } from './DTO/login_dto.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(
      loginDto.password,
      loginDto.email,
      loginDto.username,
    );
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokenLogin(refreshToken);
  }
}
