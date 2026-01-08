### Test Stripe Payment - Complete Setup

### Sử dụng REST Client (VS Code) hoặc Postman/Thunder Client

@baseUrl = http://localhost:3000/api
@adminToken = YOUR_ADMIN_JWT_TOKEN_HERE
@tableToken = YOUR_TABLE_TOKEN_HERE

##################################################

# STEP 0: Login as Admin (Nếu chưa có token)

##################################################

### Login Admin

POST {{baseUrl}}/auth/login
Content-Type: application/json

{
"email": "admin@test.com",
"password": "admin123"
}

##################################################

# STEP 1: Tạo Restaurant

##################################################

### Create Restaurant (Không cần auth)

POST {{baseUrl}}/seed/restaurant
Content-Type: application/json

{
"name": "Test Restaurant",
"address": "123 Test Street"
}

##################################################

# STEP 2: Tạo Table (Cần admin token)

##################################################

### Create Table

POST {{baseUrl}}/tables
Content-Type: application/json
Authorization: Bearer {{adminToken}}

{
"restaurantId": 1,
"name": "Table 1",
"capacity": 4
}

### Get Table QR URL (để lấy token)

GET {{baseUrl}}/tables/1/qr

##################################################

# STEP 3: Tạo Category (Cần admin token)

##################################################

### Create Category

POST {{baseUrl}}/categories
Content-Type: application/json
Authorization: Bearer {{adminToken}}

{
"restaurantId": 1,
"name": "Main Dishes",
"rank": 1
}

##################################################

# STEP 4: Tạo Modifier Groups (Cần admin token)

##################################################

### Create Modifier Group 1: Size

POST {{baseUrl}}/modifiers
Content-Type: application/json
Authorization: Bearer {{adminToken}}

{
"restaurantId": 1,
"name": "Size",
"minSelection": 1,
"maxSelection": 1
}

### Create Modifier Group 2: Extras (Optional)

POST {{baseUrl}}/modifiers
Content-Type: application/json
Authorization: Bearer {{adminToken}}

{
"restaurantId": 1,
"name": "Extras",
"minSelection": 0,
"maxSelection": 3
}

##################################################

# STEP 5: Tạo Modifier Options (Cần admin token)

##################################################

### Create Modifier Option 1: Small (Size)

POST {{baseUrl}}/modifier-options
Content-Type: application/json
Authorization: Bearer {{adminToken}}

{
"groupId": 1,
"name": "Small",
"priceAdjustment": 0,
"isAvailable": true
}

### Create Modifier Option 2: Medium (Size) +10k

POST {{baseUrl}}/modifier-options
Content-Type: application/json
Authorization: Bearer {{adminToken}}

{
"groupId": 1,
"name": "Medium",
"priceAdjustment": 10000,
"isAvailable": true
}

### Create Modifier Option 3: Large (Size) +20k

POST {{baseUrl}}/modifier-options
Content-Type: application/json
Authorization: Bearer {{adminToken}}

{
"groupId": 1,
"name": "Large",
"priceAdjustment": 20000,
"isAvailable": true
}

### Create Modifier Option 4: Extra Cheese (Extras) +15k

POST {{baseUrl}}/modifier-options
Content-Type: application/json
Authorization: Bearer {{adminToken}}

{
"groupId": 2,
"name": "Extra Cheese",
"priceAdjustment": 15000,
"isAvailable": true
}

##################################################

# STEP 6: Tạo Menu Item (Cần admin token, có thể link modifiers)

##################################################

### Create Menu Item 1 (với modifier groups)

POST {{baseUrl}}/menu-items
Content-Type: application/json
Authorization: Bearer {{adminToken}}

{
"restaurantId": 1,
"categoryId": 1,
"name": "Classic Burger",
"description": "Delicious burger with beef patty",
"basePrice": 150000,
"status": "AVAILABLE",
"modifierGroupIds": [1, 2]
}

### Create Menu Item 2 (không có modifiers)

POST {{baseUrl}}/menu-items
Content-Type: application/json
Authorization: Bearer {{adminToken}}

{
"restaurantId": 1,
"categoryId": 1,
"name": "French Fries",
"description": "Crispy golden fries",
"basePrice": 50000,
"status": "AVAILABLE"
}

##################################################

# STEP 7: Tạo Order (Public - cần table token)

##################################################

### Create Order với Modifiers

POST {{baseUrl}}/orders
Content-Type: application/json

{
"tableToken": "{{tableToken}}",
"guestCount": 2,
"items": [
{
"menuItemId": 1,
"quantity": 2,
"modifierOptionIds": [2, 4],
"note": "No pickles"
},
{
"menuItemId": 2,
"quantity": 1,
"modifierOptionIds": [],
"note": "Extra crispy"
}
],
"note": "Test order for Stripe payment"
}

### Create Order đơn giản (không modifiers) - Alternative

POST {{baseUrl}}/orders
Content-Type: application/json

{
"tableToken": "{{tableToken}}",
"guestCount": 1,
"items": [
{
"menuItemId": 1,
"quantity": 1,
"modifierOptionIds": [],
"note": ""
}
]
}

##################################################

# STEP 8: Tạo Payment (Test Stripe)

##################################################

### Create Payment

POST {{baseUrl}}/payments/create
Content-Type: application/json

{
"orderId": 1,
"method": "CARD"
}

##################################################

# STEP 9: Verify Results

##################################################

### Check Payment Status

GET {{baseUrl}}/payments/order/1

### Check Order Status

GET {{baseUrl}}/orders/1

### List All Tables (Verify)

GET {{baseUrl}}/tables?restaurantId=1

### List All Modifier Groups (Verify)

GET {{baseUrl}}/modifiers?restaurantId=1

### List All Menu Items (Verify)

GET {{baseUrl}}/menu-items?restaurantId=1
