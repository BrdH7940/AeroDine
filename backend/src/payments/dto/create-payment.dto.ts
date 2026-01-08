import { IsInt, IsEnum, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { PaymentMethod } from '@aerodine/shared-types'

export class CreatePaymentDto {
    @ApiProperty({
        example: 1,
        description: 'Order ID to create payment for',
    })
    @IsInt()
    @IsNotEmpty()
    orderId: number

    @ApiProperty({
        example: 'QR_CODE',
        enum: PaymentMethod,
        description: 'Payment method (QR_CODE or E_WALLET for MoMo)',
    })
    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    method: PaymentMethod
}

