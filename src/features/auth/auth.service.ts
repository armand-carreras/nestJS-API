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
      throw new ConflictException('Incorrect Password, try again!');
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
    //clean DB from old RefreshTokens
    await this.cleanupExpiredRefreshTokens();
    //Create new RefreshToken entrance, hasedToken for security 30d expiration
    await this.prisma.refreshToken.create({
      data: {
        token_hash:
          await this.tokenService.hashRefreshToken(
            tokens.refreshToken
          ),
        user_id: user.id,
        expires_at: new Date(
          Date.now() +
          30 * 24 * 60 * 60 * 1000,
        ),
      },
    });
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
    const hashedToken = await this.tokenService.hashRefreshToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        user_id: payload.sub,
        token_hash: hashedToken
      },
      include: {
        user: true
      }
    })
    if(!storedToken) {
      throw new UnauthorizedException('Try Log in with your credentials again token is malformed or might be expired');
    } 
    if(storedToken.expires_at < new Date()) { 
      await this.cleanupExpiredRefreshTokens();
      throw new UnauthorizedException('Try Log in with your credentials again token is malformed or might be expired');
    }
    const jwtPayload: JwtDto = {
      sub: storedToken.user.id,
      username: storedToken.user.username,
      email: storedToken.user.email,
      role: storedToken.user.role,
    }

    return this.tokenService.generateTokenPair(jwtPayload);

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
    else throw new ConflictException('Username or Email does not exist');
  }

  private async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
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
