/**
 * QR Code Utility Functions
 * Helper functions for generating QR code images
 */

/**
 * Generate QR code image URL using qrserver.com API
 * @param data - The data to encode in the QR code (usually a URL)
 * @param size - The size of the QR code image in pixels (default: 300)
 * @returns The URL to the QR code image
 */
export const getQRCodeImageUrl = (data: string, size: number = 300): string => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}

/**
 * Download QR code as image file
 * @param data - The data to encode in the QR code
 * @param filename - The filename for the downloaded file
 * @param size - The size of the QR code image in pixels (default: 300)
 */
export const downloadQRCode = (data: string, filename: string, size: number = 300): void => {
    const qrCodeImageUrl = getQRCodeImageUrl(data, size)
    const link = document.createElement('a')
    link.href = qrCodeImageUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
