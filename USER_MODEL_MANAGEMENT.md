# User-Specific AI Model Management

## Overview
Hệ thống đã được cập nhật để hỗ trợ **mỗi user tự quản lý các AI model và thứ tự ưu tiên** của riêng mình.

## Key Features

### 1. Per-User Model Configuration
- Mỗi user có bộ AI models riêng với cấu hình độc lập
- User có thể tùy chỉnh thứ tự ưu tiên, rate limits, và API keys riêng
- Không ảnh hưởng đến models của user khác

### 2. Default System Models
- Hệ thống có một bộ default models (với `userId = null`)
- Khi user mới đăng ký, hệ thống tự động copy default models cho user đó
- Admin có thể cập nhật default models để áp dụng cho user mới

### 3. Model Rotation Logic
- Mỗi request sử dụng models của user hiện tại
- Nếu không có user (anonymous), sử dụng default models
- Model rotation và rate limiting hoạt động độc lập cho mỗi user

## Database Schema Changes

### AIModel Table
```prisma
model AIModel {
  id          String   @id @default(cuid())
  modelId     String   // e.g., "gemini-2.5-pro"
  displayName String
  apiKey      String?
  rpm         Int      // Requests per minute
  tpm         Int      // Tokens per minute  
  rpd         Int      // Requests per day
  priority    Int
  enabled     Boolean
  
  // NEW: User ownership
  userId      String?  // NULL = default/system model
  user        User?    @relation(fields: [userId], references: [id])
  
  // Usage tracking
  currentMinuteRequests Int
  currentMinuteTokens   Int
  currentDayRequests    Int
  lastResetMinute       DateTime?
  lastResetDay          DateTime?
  
  // Relations
  apiCalls    AIAPICall[]
  
  @@unique([modelId, userId])
  @@index([userId])
  @@index([priority, enabled])
}
```

## Updated Functions

### 1. `getAIModels()` - actions/aiModels.ts
```typescript
// Trả về models của user hiện tại (hoặc default nếu không đăng nhập)
export async function getAIModels()
```

### 2. `saveAIModel()` - actions/aiModels.ts
```typescript
// Lưu model cho user hiện tại
export async function saveAIModel(config)
```

### 3. `initializeDefaultModels()` - actions/aiModels.ts
```typescript
// Khởi tạo models cho user mới
// - Tạo default models nếu chưa có
// - Copy default models cho user đang đăng nhập
export async function initializeDefaultModels()
```

### 4. `getNextAvailableModel(userId?)` - lib/modelRotation.ts
```typescript
// Lấy model khả dụng tiếp theo cho user
// Param: userId - Optional, null cho default models
export async function getNextAvailableModel(userId?: string | null)
```

### 5. `getAllModelsWithUsage(userId?)` - lib/modelRotation.ts
```typescript
// Lấy tất cả models của user với usage statistics
export async function getAllModelsWithUsage(userId?: string | null)
```

### 6. `upsertModel()` - lib/modelRotation.ts
```typescript
// Tạo/cập nhật model với userId
// Sử dụng findFirst + update/create thay vì upsert vì unique constraint
export async function upsertModel(config: { ..., userId?: string | null })
```

## Data Flow

### User Sign Up / First Login
1. User đăng nhập lần đầu
2. `initializeDefaultModels()` được gọi
3. System kiểm tra user đã có models chưa
4. Nếu chưa, copy tất cả default models (userId=null) cho user
5. User có bộ models riêng với cấu hình mặc định

### Making API Requests
1. User request generate content
2. `createAPICallLog()` được gọi với userId
3. `getNextAvailableModel(userId)` tìm model khả dụng của user
4. Model được sử dụng để call Gemini API
5. Usage counters của model đó được cập nhật

### Managing Models in Settings UI
1. User vào Settings > Model Rotation
2. `getAIModels()` load models của user hiện tại
3. User chỉnh sửa priority, rate limits, API keys
4. `saveAIModel()` lưu với userId của user
5. Chỉ models của user đó được cập nhật

## Default Models

Hệ thống tạo 5 default models:

| Priority | Model ID | Display Name | RPM | TPM | RPD |
|----------|----------|--------------|-----|-----|-----|
| 1 | gemini-2.5-pro | Gemini 2.5 Pro | 2 | 125K | 50 |
| 2 | gemini-2.5-flash | Gemini 2.5 Flash | 10 | 250K | 250 |
| 3 | gemini-2.0-flash-lite | Gemini 2.0 Flash Lite | 30 | 1M | 200 |
| 4 | gemini-2.5-flash-lite | Gemini 2.5 Flash Lite | 15 | 250K | 1000 |
| 5 | gemini-2.0-flash | Gemini 2.0 Flash | 15 | 1M | 200 |

## Migration

### Migration File: `20251204141715_add_user_id_to_ai_model`

Changes:
- Add `userId` field to AIModel (nullable)
- Add foreign key relation to User
- Remove unique constraint on `modelId` alone
- Add composite unique constraint on `[modelId, userId]`
- Add index on `userId`

## API Key Priority

Khi gọi Gemini API, hệ thống sử dụng API key theo thứ tự:

1. **Model-specific API key** - Từ AIModel.apiKey (của user hoặc default)
2. **Global API key** - Từ SystemConfig.apiKey (vừa thêm nút Save)
3. **Environment variable** - Từ `GOOGLE_API_KEY` trong .env

## Testing

### Verify Default Models
```sql
-- Check default models (system)
SELECT * FROM AIModel WHERE userId IS NULL;

-- Check user models
SELECT * FROM AIModel WHERE userId = '<user-id>';
```

### Verify Model Rotation
```typescript
// Test getting next available model for user
const model = await getNextAvailableModel(userId);
console.log('Selected model:', model?.modelId);
```

### Verify UI
1. Login as user
2. Go to Settings > Model Rotation
3. Verify user sees their own models
4. Edit priority/settings
5. Check database to confirm changes only affect that user

## Benefits

✅ **Isolation**: Mỗi user có quota và usage tracking riêng
✅ **Customization**: User tự điều chỉnh model priority và rate limits
✅ **Scalability**: Hỗ trợ nhiều user đồng thời mà không conflict
✅ **Flexibility**: User có thể có API key riêng cho từng model
✅ **Default System**: Vẫn giữ default models cho admin và new users

## Notes

- Default models (`userId = null`) không bị xóa khi user bị xóa
- User models tự động xóa khi user bị xóa (Cascade Delete)
- Seed script tự động tạo default models và copy cho demo user
- UI tự động load models của user đang đăng nhập
