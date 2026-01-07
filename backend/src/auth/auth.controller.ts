import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/create-auth.dto'
import { LoginDto } from './dto/update-auth.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ApiOperation({
        summary: 'Register a new user',
        description: 'Register with role (ADMIN, WAITER, KITCHEN, CUSTOMER)',
    })
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto)
    }

    @Post('login')
    @ApiOperation({ summary: 'Login and receive JWT access token' })
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile (requires JWT)' })
    profile(@CurrentUser() user: any) {
        return user
    }
}
