import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IPaymentStrategy } from './payment.strategy.interface'
import { Payment, Order } from '@prisma/client'
import * as crypto from 'crypto'

/**
 * MoMo Payment Gateway Strategy Implementation
 * Supports Vietnam's MoMo e-wallet payment gateway
 */
@Injectable()
export class MomoStrategy implements IPaymentStrategy {
    private readonly logger = new Logger(MomoStrategy.name)
    private readonly partnerCode: string
    private readonly accessKey: string
    private readonly secretKey: string
    private readonly endpoint: string
    private readonly appBaseUrl: string

    constructor(private readonly configService: ConfigService) {
        this.partnerCode =
            this.configService.get<string>('momo.partnerCode') || ''
        this.accessKey = this.configService.get<string>('momo.accessKey') || ''
        this.secretKey = this.configService.get<string>('momo.secretKey') || ''
        this.endpoint =
            this.configService.get<string>('momo.endpoint') ||
            'https://test-payment.momo.vn/v2/gateway/api/create'
        this.appBaseUrl =
            this.configService.get<string>('momo.appBaseUrl') ||
            'http://localhost:3000'

        if (!this.partnerCode || !this.accessKey || !this.secretKey) {
            this.logger.warn('MoMo credentials not fully configured')
        }
    }

    /**
     * Generate HMAC-SHA256 signature for MoMo API
     * Follows MoMo's signature algorithm:
     * 1. Sort parameters by key
     * 2. Create raw string: key1=value1&key2=value2&...
     * 3. Hash with HMAC-SHA256 using secret key
     */
    private generateSignature(params: Record<string, string>): string {
        // Sort parameters by key
        const sortedKeys = Object.keys(params).sort()
        const rawString = sortedKeys
            .map((key) => `${key}=${params[key]}`)
            .join('&')

        // Create HMAC-SHA256 signature
        const signature = crypto
            .createHmac('sha256', this.secretKey)
            .update(rawString)
            .digest('hex')

        return signature
    }

    /**
     * Create payment transaction with MoMo
     */
    async createTransaction(
        order: Order & { payment?: Payment | null }
    ): Promise<{
        payUrl: string
        orderId: string
        requestId: string
    }> {
        if (!this.partnerCode || !this.accessKey || !this.secretKey) {
            throw new BadRequestException('MoMo credentials not configured')
        }

        const orderId = order.id.toString()
        const requestId = `${this.partnerCode}-${Date.now()}`
        const orderInfo = `Order #${orderId}`
        const redirectUrl = `${this.appBaseUrl}/api/payments/callback/momo`
        const ipnUrl = `${this.appBaseUrl}/api/payments/callback/momo`

        // Convert amount to integer (VND has no decimals)
        const amount = Math.round(Number(order.totalAmount))

        // Build request parameters
        const requestParams: Record<string, string> = {
            partnerCode: this.partnerCode,
            partnerName: 'AeroDine',
            storeId: this.partnerCode,
            requestId: requestId,
            amount: amount.toString(),
            orderId: orderId,
            orderInfo: orderInfo,
            redirectUrl: redirectUrl,
            ipnUrl: ipnUrl,
            requestType: 'captureWallet',
            extraData: '',
            lang: 'vi',
            autoCapture: 'true',
        }

        // Generate signature
        const signature = this.generateSignature(requestParams)
        requestParams.signature = signature

        this.logger.log(`Creating MoMo payment for order ${orderId}`)

        try {
            // Send request to MoMo API
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestParams),
            })

            const responseData = await response.json()

            if (responseData.resultCode !== 0) {
                this.logger.error(
                    `MoMo payment creation failed: ${JSON.stringify(responseData)}`
                )
                throw new BadRequestException(
                    `MoMo payment failed: ${responseData.message || 'Unknown error'}`
                )
            }

            this.logger.log(
                `MoMo payment created successfully for order ${orderId}, payUrl: ${responseData.payUrl}`
            )

            return {
                payUrl: responseData.payUrl,
                orderId: orderId,
                requestId: requestId,
            }
        } catch (error) {
            this.logger.error(
                `Error creating MoMo payment: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            throw new BadRequestException(
                `Failed to create MoMo payment: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        }
    }

    /**
     * Verify IPN callback from MoMo
     */
    async verifyIPN(payload: any): Promise<{
        success: boolean
        orderId: number
        transactionId: string
        amount?: number
    }> {
        this.logger.log(`Received MoMo IPN: ${JSON.stringify(payload)}`)

        try {
            const {
                partnerCode,
                orderId,
                requestId,
                amount,
                orderInfo,
                orderType,
                transId,
                resultCode,
                message,
                payType,
                responseTime,
                extraData,
                signature,
            } = payload

            // Verify signature
            const verifyParams: Record<string, string> = {
                accessKey: this.accessKey,
                amount: amount?.toString() || '',
                extraData: extraData || '',
                message: message || '',
                orderId: orderId || '',
                orderInfo: orderInfo || '',
                orderType: orderType || '',
                partnerCode: partnerCode || '',
                payType: payType || '',
                requestId: requestId || '',
                responseTime: responseTime?.toString() || '',
                resultCode: resultCode?.toString() || '',
                transId: transId || '',
            }

            // Remove empty values for signature verification
            const filteredParams: Record<string, string> = {}
            Object.keys(verifyParams).forEach((key) => {
                if (verifyParams[key]) {
                    filteredParams[key] = verifyParams[key]
                }
            })

            const calculatedSignature = this.generateSignature(filteredParams)

            if (calculatedSignature !== signature) {
                this.logger.warn(
                    `Invalid MoMo IPN signature. Expected: ${calculatedSignature}, Received: ${signature}`
                )
                return {
                    success: false,
                    orderId: parseInt(orderId) || 0,
                    transactionId: transId || '',
                    amount: amount ? parseInt(amount) : undefined,
                }
            }

            // Verify result code (0 = success)
            const success = resultCode === 0 || resultCode === '0'

            if (!success) {
                this.logger.warn(
                    `MoMo payment failed for order ${orderId}: ${message}`
                )
            } else {
                this.logger.log(
                    `MoMo payment verified successfully for order ${orderId}, transaction: ${transId}`
                )
            }

            return {
                success,
                orderId: parseInt(orderId) || 0,
                transactionId: transId || '',
                amount: amount ? parseInt(amount) : undefined,
            }
        } catch (error) {
            this.logger.error(
                `Error verifying MoMo IPN: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            return {
                success: false,
                orderId: 0,
                transactionId: '',
            }
        }
    }
}

