import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CreateUserDto } from './DTO/create-user-dto.interface';
import { TokenHandlingService } from './JWT/token-handling/token-handling.service'
import { JwtDto, TokenPair } from './JWT/jwt-dto/jwt-dto.interface';
import * as bcrypt from 'bcrypt';


@Injectable()
export class AuthService {



  constructor(private readonly prisma: PrismaService, private tokenService: TokenHandlingService) {}


  /**
   * ********************************************************
   * ***************** REGISTER *****************************
   * ********************************************************
   * @param createUserDto 
   * @returns 
   * 
   * */
  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: createUserDto.username },
          { email: createUserDto.email },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }
    const cryptedPass =  await bcrypt.hash(createUserDto.password, 12);
    return this.prisma.user.create({
      data: {
        username: createUserDto.username,
        email: createUserDto.email,
        password: cryptedPass,
        verification_code: Math.random().toString(36).substring(2, 8),
      },
    });
  }

  /**
   * *********************************************************
   * ************************ LOGIN **************************
   * *********************************************************
   * @param password 
   * @param email 
   * @param username 
   * @returns { TokenPair } 
   * 
   */


  async login(password: string, email?: string, username?: string): Promise< TokenPair | null > {

    //Check if user exists
    const user = await this.findByUsernameOrEmail(email, username);
    //if not exits with null, previous method already throws exception, just for backup
    if(!user) {
      return null;
    } 
    //check if password is correct
    const valid = await bcrypt.compare(password, user?.password);
    //If not raise an exception
    if(!valid) {
      throw new UnauthorizedException('Incorrect Password, try again!');
    }
    //All correct build JWT_DTO
    const JWT_DTO: JwtDto = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: 'USER'
    }
    //Generate DTO pairs
    const tokens = await this.tokenService.generateTokenPair(JWT_DTO);
    //Create new RefreshToken entrance, hasedToken for security 30d expiration
    const hashedToken = await this.tokenService.hashRefreshToken(tokens.refreshToken);
    await this.createNewRefreshTokenRecord(user.id, hashedToken);
    //both unencrypted tokens are sent to client for it to store them.
    return tokens;

  }


  /**
   * *************************************************************************
   * *********************** REFRESH TOKEN ***********************************
   * *************************************************************************
   * @param refreshToken 
   * @returns {TokenPair}
   */
  async refreshTokenLogin(refreshToken: string): Promise<TokenPair | null> {

    const payload = await this.tokenService.asyncVerifial(refreshToken);

    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        user_id: payload.sub,
        revoked: false,
        expires_at: { gt: new Date() }
      },
      include: {
        user: true
      }
    });

    let matchedToken: (typeof storedTokens)[number] | undefined;
    for (const token of storedTokens) {
      if (await bcrypt.compare(refreshToken, token.token_hash)) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Try logging in with your credentials again – token is malformed or might be expired');
    }

    const jwtPayload: JwtDto = {
      sub: matchedToken.user.id,
      username: matchedToken.user.username,
      email: matchedToken.user.email,
      role: matchedToken.user.role,
    };

    const newPair = await this.tokenService.generateTokenPair(jwtPayload);
    const hashedRefreshToken = await this.tokenService.hashRefreshToken(newPair.refreshToken);

    await this.prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: { replaced_by: newPair.refreshToken, revoked: true },
    });
    await this.createNewRefreshTokenRecord(matchedToken.user_id, hashedRefreshToken);

    return newPair;

  }




  /**
   * *******************************************************************
   * ********************* Helper Methods ******************************
   * *******************************************************************
   */

  

  private async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
  private async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: {username} })
  }
  private async findByUsernameOrEmail(email?: string, username?: string) {
    if(username) return await this.findByUsername(username);
    else if(email) return await this.findByEmail(email);
    else throw new UnauthorizedException('Username or Email does not exist');
  }

  private async createNewRefreshTokenRecord(user_id: number, hashedToken: string) {
    await this.prisma.refreshToken.create({
      data: {
        token_hash: hashedToken,
        user_id: user_id,
        expires_at: new Date(
          Date.now() +
          30 * 24 * 60 * 60 * 1000,
        ),
      },
    });
  }

  private async cleanupExpiredRefreshTokens() {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expires_at: {
          lte: new Date(), //Less Than or Equal: new Date()
        },
      },
    });
  }

}
