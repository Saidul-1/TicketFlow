import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Authentication & RBAC')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user (Customer or Organizer)' })
  @ApiResponse({ status: 201, description: 'User successfully registered', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Current profile', type: UserProfileDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: any): Promise<UserProfileDto> {
    return this.authService.getProfile(user.id);
  }

  @Get('organizer-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'RBAC verification endpoint (Requires ORGANIZER role)' })
  @ApiResponse({ status: 200, description: 'Organizer authorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  checkOrganizerAccess(@CurrentUser() user: any) {
    return {
      message: 'Access granted to Organizer portal',
      user,
    };
  }

  @Get('customer-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'RBAC verification endpoint (Requires CUSTOMER role)' })
  @ApiResponse({ status: 200, description: 'Customer authorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  checkCustomerAccess(@CurrentUser() user: any) {
    return {
      message: 'Access granted to Customer portal',
      user,
    };
  }
}
