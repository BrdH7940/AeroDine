import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common'
import { TablesService } from './tables.service'
import { CreateTableDto } from './dto/create-table.dto'
import { UpdateTableDto } from './dto/update-table.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@aerodine/shared-types'
import {
    ApiBearerAuth,
    ApiTags,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiParam,
} from '@nestjs/swagger'

@ApiTags('tables')
@Controller('tables')
export class TablesController {
    constructor(private readonly tablesService: TablesService) {}

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post()
    @ApiOperation({
        summary: 'Create a new table (ADMIN only)',
        description:
            'Creates a new table for the specified restaurant. A QR token is automatically generated.',
    })
    @ApiResponse({ status: 201, description: 'Table created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 404, description: 'Restaurant not found' })
    create(@Body() dto: CreateTableDto) {
        if (!dto.restaurantId) {
            throw new BadRequestException('restaurantId is required')
        }
        return this.tablesService.create(dto)
    }

    @Get()
    @ApiOperation({
        summary: 'List all tables',
        description:
            'Returns all tables. Optionally filter by restaurantId using query parameter.',
    })
    @ApiQuery({
        name: 'restaurantId',
        required: false,
        type: Number,
        description: 'Filter tables by restaurant ID',
    })
    @ApiResponse({ status: 200, description: 'List of tables' })
    findAll(@Query('restaurantId') restaurantId?: string) {
        const restaurantIdNum = restaurantId ? Number(restaurantId) : undefined
        return this.tablesService.findAll(restaurantIdNum)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a table by ID' })
    @ApiParam({ name: 'id', type: Number, description: 'Table ID' })
    @ApiResponse({ status: 200, description: 'Table details' })
    @ApiResponse({ status: 404, description: 'Table not found' })
    findOne(@Param('id') id: string) {
        return this.tablesService.findOne(+id)
    }

    @Get('validate-token')
    @ApiOperation({
        summary: 'Validate table token (Public)',
        description:
            'Validates a table QR token and returns tableId and restaurantId. This is a public endpoint used when customers scan QR codes.',
    })
    @ApiQuery({
        name: 'token',
        required: true,
        type: String,
        description: 'Table token from QR code',
    })
    @ApiResponse({
        status: 200,
        description: 'Token is valid',
        schema: {
            example: {
                tableId: 1,
                restaurantId: 1,
                valid: true,
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Invalid or expired token' })
    async validateToken(@Query('token') token: string) {
        if (!token) {
            throw new BadRequestException('Token is required')
        }

        try {
            const { tableId, restaurantId } = await this.tablesService.verifyTableToken(token)
            return {
                tableId,
                restaurantId,
                valid: true,
            }
        } catch (error) {
            // Log error for debugging
            console.error('Error validating table token:', error)
            
            if (error instanceof UnauthorizedException) {
                throw error
            }
            if (error instanceof BadRequestException) {
                throw error
            }
            // For any other error, return 401
            throw new UnauthorizedException('Invalid or expired table token')
        }
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Get(':id/qr')
    @ApiOperation({
        summary: 'Get QR code URL for a table (ADMIN only)',
        description:
            'Returns the full URL that should be used to generate the QR code. This URL includes the table token as a query parameter.',
    })
    @ApiParam({ name: 'id', type: Number, description: 'Table ID' })
    @ApiResponse({
        status: 200,
        description: 'QR code URL',
        schema: {
            example: {
                qrUrl: 'http://localhost:5173/customer/menu?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                tableId: 1,
                restaurantId: 1,
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Table not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getQrUrl(@Param('id') id: string) {
        const table = await this.tablesService.findOne(+id)
        const qrUrl = this.tablesService.getQrUrl(table.token)
        return {
            qrUrl,
            tableId: table.id,
            restaurantId: table.restaurantId,
        }
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Patch(':id')
    @ApiOperation({
        summary: 'Update a table (ADMIN only)',
        description: 'Updates table name, capacity, status, or isActive field.',
    })
    @ApiParam({ name: 'id', type: Number, description: 'Table ID' })
    @ApiResponse({ status: 200, description: 'Table updated successfully' })
    @ApiResponse({ status: 404, description: 'Table not found' })
    update(@Param('id') id: string, @Body() dto: UpdateTableDto) {
        return this.tablesService.update(+id, dto)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Patch(':id/refresh-token')
    @ApiOperation({
        summary: 'Regenerate QR token for a table (ADMIN only)',
        description:
            'Generates a new QR token for the specified table. The old token will no longer work.',
    })
    @ApiParam({ name: 'id', type: Number, description: 'Table ID' })
    @ApiResponse({
        status: 200,
        description: 'Token refreshed successfully',
    })
    @ApiResponse({ status: 404, description: 'Table not found' })
    refreshToken(@Param('id') id: string) {
        return this.tablesService.refreshToken(+id)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Patch('refresh-tokens/all')
    @ApiOperation({
        summary: 'Regenerate QR tokens for all tables (ADMIN only)',
        description:
            'Generates new QR tokens for all tables. Optionally filter by restaurantId. Old tokens will no longer work.',
    })
    @ApiQuery({
        name: 'restaurantId',
        required: false,
        type: Number,
        description: 'Filter tables by restaurant ID',
    })
    @ApiResponse({
        status: 200,
        description: 'All tokens refreshed successfully',
    })
    refreshAllTokens(@Query('restaurantId') restaurantId?: string) {
        const restaurantIdNum = restaurantId ? Number(restaurantId) : undefined
        return this.tablesService.refreshAllTokens(restaurantIdNum)
    }

    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Delete(':id')
    @ApiOperation({
        summary: 'Delete a table (ADMIN only)',
        description:
            'Deletes a table. Fails if the table has associated orders.',
    })
    @ApiParam({ name: 'id', type: Number, description: 'Table ID' })
    @ApiResponse({ status: 200, description: 'Table deleted successfully' })
    @ApiResponse({ status: 400, description: 'Cannot delete table with orders' })
    @ApiResponse({ status: 404, description: 'Table not found' })
    remove(@Param('id') id: string) {
        return this.tablesService.remove(+id)
    }
}

