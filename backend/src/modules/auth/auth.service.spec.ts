import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should throw ConflictException if email is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'taken@test.com' });

      await expect(
        service.register({
          email: 'taken@test.com',
          password: 'Password123!',
          fullName: 'Test User',
          role: Role.CUSTOMER,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully register a user and return token and profile', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-id',
        email: 'new@test.com',
        fullName: 'New User',
        role: Role.CUSTOMER,
        createdAt: new Date(),
      });

      const result = await service.register({
        email: 'new@test.com',
        password: 'Password123!',
        fullName: 'New User',
        role: Role.CUSTOMER,
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('new@test.com');
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@test.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hash = await bcrypt.hash('CorrectPassword123!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'user@test.com',
        passwordHash: hash,
      });

      await expect(
        service.login({
          email: 'user@test.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token and user when credentials are correct', async () => {
      const password = 'Password123!';
      const hash = await bcrypt.hash(password, 10);
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'user@test.com',
        fullName: 'Test User',
        role: Role.ORGANIZER,
        passwordHash: hash,
        createdAt: new Date(),
      });

      const result = await service.login({
        email: 'user@test.com',
        password,
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.role).toBe(Role.ORGANIZER);
    });
  });
});
