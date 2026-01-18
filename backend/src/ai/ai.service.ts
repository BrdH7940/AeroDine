import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../database/prisma.service'

export interface AiSuggestionRequest {
    restaurantId: number
    numberOfPeople: number
    cuisineStyle?: string
    hasChildren?: boolean
    budget: number
    spicyLevel?: 'none' | 'mild' | 'medium' | 'hot'
    dietaryRestrictions?: string[]
    additionalNotes?: string
}

export interface SuggestedItem {
    id: number
    name: string
    price: number
    quantity: number
    category?: string
}

export interface AiSuggestionResponse {
    suggestedItems: SuggestedItem[]
    totalPrice: number
    reason: string
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name)
    private readonly geminiApiKey: string

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService
    ) {
        this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || ''
        if (!this.geminiApiKey) {
            this.logger.warn('GEMINI_API_KEY is not set. AI suggestions will not work.')
        }
    }

    /**
     * Get menu items for AI suggestion
     */
    async getMenuItemsForAi(restaurantId: number) {
        const menuItems = await this.prisma.menuItem.findMany({
            where: {
                restaurantId,
                status: 'AVAILABLE',
            },
            include: {
                category: true,
            },
        })

        return menuItems.map((item) => ({
            id: item.id,
            name: item.name,
            price: Number(item.basePrice),
            category: item.category?.name || 'Uncategorized',
            description: item.description || '',
        }))
    }

    /**
     * Build prompt for Gemini AI
     */
    private buildPrompt(request: AiSuggestionRequest, menuJson: string): string {
        const userRequirements: string[] = []
        
        userRequirements.push(`${request.numberOfPeople} người`)
        
        if (request.cuisineStyle) {
            userRequirements.push(`phong cách ẩm thực: ${request.cuisineStyle}`)
        }
        
        if (request.hasChildren) {
            userRequirements.push('có trẻ em đi cùng')
        }
        
        userRequirements.push(`ngân sách khoảng ${request.budget.toLocaleString()} VND`)
        
        if (request.spicyLevel) {
            const spicyMap = {
                none: 'không ăn cay',
                mild: 'ăn cay nhẹ',
                medium: 'ăn cay vừa',
                hot: 'ăn cay nhiều',
            }
            userRequirements.push(spicyMap[request.spicyLevel])
        }
        
        if (request.dietaryRestrictions && request.dietaryRestrictions.length > 0) {
            userRequirements.push(`hạn chế: ${request.dietaryRestrictions.join(', ')}`)
        }
        
        if (request.additionalNotes) {
            userRequirements.push(`ghi chú thêm: ${request.additionalNotes}`)
        }

        return `You are a helpful food ordering assistant for a restaurant.

User requirements:
"${userRequirements.join(', ')}"

Available menu items (JSON):
${menuJson}

Task:
- Suggest a balanced combination of dishes suitable for the group
- Total price MUST be <= ${request.budget} VND
- Consider portion sizes: appetizers/starters for sharing, main dishes per person
- If there are children, suggest kid-friendly options
- Return result in JSON format ONLY, no additional text
- Use menu item id for references

Required JSON format:
{
  "suggested_items": [
    { "id": <menu_item_id>, "quantity": <number> }
  ],
  "reason": "<brief explanation in Vietnamese>"
}

Important:
- Only use menu item IDs from the provided list
- Ensure the total is within budget
- Balance the meal (starters, mains, drinks, desserts if budget allows)
- Response must be valid JSON only, no markdown, no code blocks`
    }

    /**
     * Call Gemini API to get AI suggestion
     */
    async getSuggestion(request: AiSuggestionRequest): Promise<AiSuggestionResponse> {
        if (!this.geminiApiKey) {
            throw new BadRequestException('AI service is not configured. Please set GEMINI_API_KEY.')
        }

        // Get menu items
        const menuItems = await this.getMenuItemsForAi(request.restaurantId)
        
        if (menuItems.length === 0) {
            throw new BadRequestException('No menu items available for this restaurant')
        }

        const menuJson = JSON.stringify(menuItems, null, 2)
        const prompt = this.buildPrompt(request, menuJson)

        this.logger.log(`Calling Gemini API for restaurant ${request.restaurantId}`)
        this.logger.debug(`Prompt: ${prompt}`)

        try {
            // Call Gemini API - using v1 API with gemini-2.5-flash
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [{ text: prompt }],
                            },
                        ],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 4096,
                        },
                    }),
                }
            )

            if (!response.ok) {
                const errorText = await response.text()
                this.logger.error(`Gemini API error: ${errorText}`)
                throw new BadRequestException('Failed to get AI suggestion')
            }

            const data = await response.json()
            this.logger.debug(`Gemini response: ${JSON.stringify(data)}`)

            // Check if response was truncated
            const finishReason = data.candidates?.[0]?.finishReason
            if (finishReason === 'MAX_TOKENS') {
                this.logger.warn('Gemini response was truncated due to MAX_TOKENS')
                throw new BadRequestException('AI response was incomplete. Please try again with a smaller budget or fewer requirements.')
            }

            // Extract text from response
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text
            if (!text) {
                throw new BadRequestException('Invalid response from AI')
            }

            // Parse JSON from response (handle potential markdown code blocks)
            let jsonText = text.trim()
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.slice(7)
            }
            if (jsonText.startsWith('```')) {
                jsonText = jsonText.slice(3)
            }
            if (jsonText.endsWith('```')) {
                jsonText = jsonText.slice(0, -3)
            }
            jsonText = jsonText.trim()

            let aiResult
            try {
                aiResult = JSON.parse(jsonText)
                this.logger.log(`Parsed AI result: ${JSON.stringify(aiResult)}`)
            } catch (parseError) {
                this.logger.error(`Failed to parse AI response: ${jsonText}`)
                throw new BadRequestException('AI returned invalid format. Please try again.')
            }

            // Map AI response to our format and calculate total
            const suggestedItems: SuggestedItem[] = []
            let totalPrice = 0

            this.logger.log(`Menu items available: ${menuItems.map(m => m.id).join(', ')}`)
            this.logger.log(`AI suggested IDs: ${aiResult.suggested_items?.map((i: any) => i.id).join(', ')}`)

            for (const item of aiResult.suggested_items || []) {
                const menuItem = menuItems.find((m) => m.id === item.id)
                if (menuItem) {
                    const quantity = item.quantity || 1
                    suggestedItems.push({
                        id: menuItem.id,
                        name: menuItem.name,
                        price: menuItem.price,
                        quantity,
                        category: menuItem.category,
                    })
                    totalPrice += menuItem.price * quantity
                } else {
                    this.logger.warn(`Menu item with ID ${item.id} not found in restaurant menu`)
                }
            }

            this.logger.log(`Final suggestion: ${suggestedItems.length} items, total: ${totalPrice}`)

            return {
                suggestedItems,
                totalPrice,
                reason: aiResult.reason || 'Gợi ý dựa trên yêu cầu của bạn',
            }
        } catch (error) {
            this.logger.error('AI suggestion error:')
            this.logger.error(error)
            if (error instanceof BadRequestException) {
                throw error
            }
            throw new BadRequestException('Failed to process AI suggestion')
        }
    }
}
