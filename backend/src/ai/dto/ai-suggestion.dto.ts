import {
    IsNumber,
    IsOptional,
    IsString,
    IsBoolean,
    IsArray,
    IsEnum,
    Min,
} from 'class-validator'

export enum SpicyLevel {
    NONE = 'none',
    MILD = 'mild',
    MEDIUM = 'medium',
    HOT = 'hot',
}

export class AiSuggestionRequestDto {
    @IsNumber()
    restaurantId: number

    @IsNumber()
    @Min(1)
    numberOfPeople: number

    @IsOptional()
    @IsString()
    cuisineStyle?: string

    @IsOptional()
    @IsBoolean()
    hasChildren?: boolean

    @IsNumber()
    @Min(10000)
    budget: number

    @IsOptional()
    @IsEnum(SpicyLevel)
    spicyLevel?: SpicyLevel

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    dietaryRestrictions?: string[]

    @IsOptional()
    @IsString()
    additionalNotes?: string
}
