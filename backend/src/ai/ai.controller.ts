import {
    Controller,
    Post,
    Body,
    Get,
    Query,
    ParseIntPipe,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AiService, AiSuggestionRequest } from './ai.service'

/**
 * AI Controller - Endpoints for AI-powered food suggestions
 */
@ApiTags('ai')
@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) {}

    /**
     * Get menu items for AI (used for debugging/preview)
     * GET /ai/menu?restaurantId=1
     */
    @Get('menu')
    @ApiOperation({ summary: 'Get menu items formatted for AI' })
    async getMenuForAi(@Query('restaurantId', ParseIntPipe) restaurantId: number) {
        return this.aiService.getMenuItemsForAi(restaurantId)
    }

    /**
     * Get AI food suggestion
     * POST /ai/suggest
     */
    @Post('suggest')
    @ApiOperation({ summary: 'Get AI-powered food suggestion based on preferences' })
    @ApiResponse({
        status: 200,
        description: 'AI suggestion generated successfully',
    })
    async getSuggestion(@Body() request: AiSuggestionRequest) {
        return this.aiService.getSuggestion(request)
    }
}
