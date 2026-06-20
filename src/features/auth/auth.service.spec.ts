/* import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Mock PrismaService — this prevents the real prisma.service.ts from loading
// the generated client (which uses ESM-only import.meta.url).
// The manual mock lives at src/database/__mocks__/prisma.service.ts
// ---------------------------------------------------------------------------
jest.mock('../../database/prisma.service');

import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { TokenHandlingService } from './JWT/token-handling/token-handling.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let tokenService: jest.Mocked<TokenHandlingService>;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: '$2b$12$hashedpassword123',
    role: 'USER' as const,
    is_verified: false,
    verification_code: 'abc123',
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  };

  const mockTokenPair = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  const mockRefreshTokenRecord = {
    id: 10,
    token_hash: '$2b$12$hashedRefreshTokenHash',
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    revoked: false,
    replaced_by: null,
    user_id: 1,
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            refreshToken: {
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        {
          provide: TokenHandlingService,
          useValue: {
            generateTokenPair: jest.fn(),
            hashRefreshToken: jest.fn(),
            asyncVerifial: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    tokenService = module.get(TokenHandlingService) as jest.Mocked<TokenHandlingService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════
  //  register()
  // ═══════════════════════════════════════════════════
  describe('register()', () => {
    const dto = { username: 'newuser', email: 'new@example.com', password: 'plain123' };

    it('should create a new user when username & email are unique', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashedPassword');
      prisma.user.create.mockResolvedValue({ ...mockUser, username: 'newuser', email: 'new@example.com' });

      const result = await authService.register(dto);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ username: dto.username }, { email: dto.email }] },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { username: dto.username, email: dto.email, password: '$2b$12$hashedPassword', verification_code: expect.any(String) },
      });
      expect(result.email).toBe('new@example.com');
    });

    it('should throw ConflictException when username already exists', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      await expect(authService.register(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, username: 'other' });
      await expect(authService.register(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════
  //  login()
  // ═══════════════════════════════════════════════════
  describe('login()', () => {
    const password = 'correctPassword';

    it('should return TokenPair when credentials are valid (by email)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      tokenService.generateTokenPair.mockResolvedValue(mockTokenPair);
      tokenService.hashRefreshToken.mockResolvedValue('$2b$12$hashedNewToken');
      prisma.refreshToken.create.mockResolvedValue(mockRefreshTokenRecord);

      const result = await authService.login(password, mockUser.email);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: mockUser.email } });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
      expect(tokenService.generateTokenPair).toHaveBeenCalledWith({
        sub: mockUser.id, username: mockUser.username, email: mockUser.email, role: 'USER',
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: { token_hash: '$2b$12$hashedNewToken', user_id: mockUser.id, expires_at: expect.any(Date) },
      });
      expect(result).toEqual(mockTokenPair);
    });

    it('should return TokenPair when credentials are valid (by username)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      tokenService.generateTokenPair.mockResolvedValue(mockTokenPair);
      tokenService.hashRefreshToken.mockResolvedValue('$2b$12$hashedNewToken');
      prisma.refreshToken.create.mockResolvedValue(mockRefreshTokenRecord);

      const result = await authService.login(password, undefined, 'testuser');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { username: 'testuser' } });
      expect(result).toEqual(mockTokenPair);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(authService.login(password, 'unknown@example.com')).rejects.toThrow(UnauthorizedException);
      expect(tokenService.generateTokenPair).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when neither email nor username is given', async () => {
      await expect(authService.login(password)).rejects.toThrow(UnauthorizedException);
      expect(tokenService.generateTokenPair).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(authService.login('wrong', mockUser.email)).rejects.toThrow(UnauthorizedException);
      expect(tokenService.generateTokenPair).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════
  //  refreshTokenLogin()
  // ═══════════════════════════════════════════════════
  describe('refreshTokenLogin()', () => {
    const oldRefreshToken = 'old-refresh-token-value';

    it('should return a new TokenPair when the refresh token is valid', async () => {
      tokenService.asyncVerifial.mockResolvedValue({ sub: 1 });
      prisma.refreshToken.findMany.mockResolvedValue([mockRefreshTokenRecord]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      tokenService.generateTokenPair.mockResolvedValue(mockTokenPair);
      tokenService.hashRefreshToken
        .mockResolvedValueOnce('$2b$12$hashedNewRefreshToken')
        .mockResolvedValueOnce('$2b$12$hashedReplacedBy');

      const result = await authService.refreshTokenLogin(oldRefreshToken);

      expect(tokenService.asyncVerifial).toHaveBeenCalledWith(oldRefreshToken);
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: mockRefreshTokenRecord.id },
        data: { replaced_by: '$2b$12$hashedReplacedBy', revoked: true },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: { token_hash: '$2b$12$hashedNewRefreshToken', user_id: mockRefreshTokenRecord.user_id, expires_at: expect.any(Date) },
      });
      expect(result).toEqual(mockTokenPair);
    });

    it('should throw UnauthorizedException when the token verification fails', async () => {
      tokenService.asyncVerifial.mockRejectedValue(new UnauthorizedException('Token expired'));
      await expect(authService.refreshTokenLogin('bad-token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.findMany).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when no stored tokens match', async () => {
      tokenService.asyncVerifial.mockResolvedValue({ sub: 1 });
      prisma.refreshToken.findMany.mockResolvedValue([mockRefreshTokenRecord]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(authService.refreshTokenLogin(oldRefreshToken)).rejects.toThrow(UnauthorizedException);
      expect(tokenService.generateTokenPair).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when there are no stored tokens at all', async () => {
      tokenService.asyncVerifial.mockResolvedValue({ sub: 1 });
      prisma.refreshToken.findMany.mockResolvedValue([]);
      await expect(authService.refreshTokenLogin(oldRefreshToken)).rejects.toThrow(UnauthorizedException);
      expect(tokenService.generateTokenPair).not.toHaveBeenCalled();
    });

    it('should store a hash in replaced_by (not the raw token)', async () => {
      tokenService.asyncVerifial.mockResolvedValue({ sub: 1 });
      prisma.refreshToken.findMany.mockResolvedValue([mockRefreshTokenRecord]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      tokenService.generateTokenPair.mockResolvedValue(mockTokenPair);
      tokenService.hashRefreshToken
        .mockResolvedValueOnce('$2b$12$hashedNewRefreshToken')
        .mockResolvedValueOnce('$2b$12$hashedReplacedBy');

      await authService.refreshTokenLogin(oldRefreshToken);

      const updateCall = (prisma.refreshToken.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.replaced_by).toBe('$2b$12$hashedReplacedBy');
      expect(updateCall.data.replaced_by).not.toBe(mockTokenPair.refreshToken);
    });
  });
});
 */