import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtDto, TokenPair } from '../jwt-dto/jwt-dto.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TokenHandlingService {

  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async generateAccessToken(jwtDto: JwtDto) {
    return this.jwtService.signAsync(jwtDto, {
      expiresIn: '15m',
    });
  }

  async generateRefreshToken(jwtDto: JwtDto) {
    return this.jwtService.signAsync(jwtDto, {
      expiresIn: '30d',
    });
  }

  async generateTokenPair(jwtDto: JwtDto): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(jwtDto),
      this.generateRefreshToken(jwtDto),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async hashRefreshToken(token: string) {
    return bcrypt.hash(token, 12); 
  }

  async compareHashedTokens(hashedToken: string, refreshTokenNotHashed: string) {
    return bcrypt.compare(hashedToken, await bcrypt.hash(refreshTokenNotHashed,12));
  }

  async asyncVerifial(token: string) {
    return this.jwtService.verifyAsync(token,);
  }
}