# Hướng Dẫn Batch Processing & Concurrent Requests

## Tổng Quan

Hệ thống cung cấp **2 phương pháp** để generate scripts và prompts:

### 1. **Sequential Processing** (Queue-based)
- **Function:** `generateScripts(projectId)`
- **Concurrency:** 5 requests song song
- **Use case:** Ổn định, dễ debug, phù hợp cho projects nhỏ
- **Ưu điểm:** 
  - Kiểm soát tốt từng request
  - Dễ retry nếu lỗi
  - Progress tracking chi tiết
- **Nhược điểm:**
  - Chậm hơn batch processing
  - Không tối ưu cho nhiều chapters

### 2. **Batch Processing** (All-at-once) ⚡ RECOMMENDED
- **Function:** `generateScriptsBatch(projectId)`
- **Concurrency:** Auto-detect từ model RPM limits (3-10 concurrent)
- **Use case:** Projects lớn, cần tốc độ cao
- **Ưu điểm:**
  - **Nhanh gấp 2-3 lần** sequential
  - Gửi tất cả requests cùng lúc
  - Tối ưu sử dụng quota
  - Auto-scale theo RPM limits
- **Nhược điểm:**
  - Khó debug nếu nhiều requests lỗi
  - Cần quota đủ lớn

---

## So Sánh Performance

| Metric | Sequential (Queue) | Batch Processing |
|--------|-------------------|------------------|
| 5 chapters | ~50s | ~20s |
| 10 chapters | ~100s | ~35s |
| 20 chapters | ~200s | ~70s |
| Concurrency | Fixed (5) | Auto (3-10) |
| Memory | Thấp | Cao hơn |
| Error handling | Tốt | Trung bình |

---

## Cách Sử Dụng

### 1. Generate Scripts - Sequential (Mặc định)

```typescript
import { generateScripts } from "@/actions/generateScript";

const result = await generateScripts(projectId);

if (result.success) {
  console.log(`Generated ${result.scripts.length} chapters`);
  if (result.errors) {
    console.warn('Some chapters failed:', result.errors);
  }
}
```

### 2. Generate Scripts - Batch (Nhanh hơn) ⚡

```typescript
import { generateScriptsBatch } from "@/actions/generateScript";

const result = await generateScriptsBatch(projectId);

if (result.success) {
  console.log(`✅ Generated ${result.scripts.length} chapters in batch mode`);
}
```

---

## Batch Processing API

### Core Function: `batchGenerateWithGemini()`

```typescript
import { batchGenerateWithGemini, createBatchRequests } from "@/lib/batchGemini";

// Prepare requests
const prompts = [
  { id: 1, prompt: "Create outline for chapter 1..." },
  { id: 2, prompt: "Create outline for chapter 2..." },
  { id: 3, prompt: "Create outline for chapter 3..." }
];

const requests = createBatchRequests(prompts, {
  projectId: "proj_123",
  operation: 'GENERATE_SCRIPT',
  temperature: 0.7
});

// Execute with progress tracking
const results = await batchGenerateWithGemini(
  requests,
  (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
  5 // Optional: max concurrency (auto-detect if not provided)
);

// Process results
for (const result of results) {
  if (result.success) {
    console.log(`✅ Request ${result.id}:`, result.data);
    console.log(`Tokens: ${result.tokens?.input} in, ${result.tokens?.output} out`);
  } else {
    console.error(`❌ Request ${result.id} failed:`, result.error);
  }
}
```

---

## Rate Limiting & Concurrency

### Auto-detection Logic

Batch processing tự động tính toán concurrency tối ưu:

```typescript
async function calculateOptimalConcurrency() {
  // 1. Lấy model có priority cao nhất
  const primaryModel = await getHighestPriorityModel();
  
  // 2. Tính toán: 60% của RPM capacity
  const rpm = primaryModel.maxRPM;
  const safeConcurrency = Math.floor((rpm * 0.6 * 5) / 60);
  
  // 3. Cap giữa 3 và 10
  return Math.min(10, Math.max(3, safeConcurrency));
}
```

### Ví dụ với các models

| Model | RPM Limit | Auto Concurrency |
|-------|-----------|-----------------|
| gemini-2.5-pro | 2 | 3 (minimum) |
| gemini-2.5-flash | 10 | 5 |
| gemini-2.0-flash-lite | 30 | 10 (maximum) |

### Override Concurrency

```typescript
// Force concurrency = 8
await batchGenerateWithGemini(requests, onProgress, 8);
```

---

## Model Rotation & Logging

### Automatic Model Rotation

Mỗi request trong batch tự động:

1. **Check quota** của model hiện tại
2. **Rotate** sang model khác nếu hết quota
3. **Log usage** vào database
4. **Track cost** theo token

```typescript
// Trong batchGemini.ts
async function generateSingleRequest(request) {
  // 1. Create log + get next model
  const logResult = await createAPICallLog({
    operation: request.options.operation,
    projectId: request.options.projectId
  });
  
  const modelToUse = logResult.modelId; // Auto-selected by rotation
  
  // 2. Execute request
  const response = await genAI.models.generateContent({
    model: modelToUse,
    ...
  });
  
  // 3. Update log with results
  await updateAPICallLog({
    logId: logResult.log.id,
    status: 'SUCCESS',
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens
  });
}
```

### View Batch Statistics

```sql
-- Xem usage theo batch
SELECT 
  operation,
  modelId,
  COUNT(*) as requests,
  SUM(inputTokens) as total_input,
  SUM(outputTokens) as total_output,
  SUM(estimatedCost) as total_cost
FROM AIAPICall
WHERE createdAt > datetime('now', '-1 hour')
GROUP BY operation, modelId;
```

---

## Best Practices

### ✅ DO

1. **Sử dụng Batch cho projects lớn** (>5 chapters)
   ```typescript
   if (outline.chapters.length > 5) {
     await generateScriptsBatch(projectId);
   } else {
     await generateScripts(projectId);
   }
   ```

2. **Monitor progress** với callback
   ```typescript
   await batchGenerateWithGemini(requests, (done, total) => {
     updateTask(taskId, {
       progress: Math.round((done / total) * 100),
       message: `Processing ${done}/${total}...`
     });
   });
   ```

3. **Handle partial failures**
   ```typescript
   const successes = results.filter(r => r.success);
   const failures = results.filter(r => !r.success);
   
   console.log(`✅ ${successes.length} succeeded`);
   console.log(`❌ ${failures.length} failed`);
   ```

### ❌ DON'T

1. **Không set concurrency quá cao** (>10)
   - Sẽ hit rate limits
   - Gây lỗi 429 (Too Many Requests)

2. **Không bỏ qua error handling**
   ```typescript
   // BAD
   const results = await batchGenerateWithGemini(requests);
   // Assume all succeeded
   
   // GOOD
   const results = await batchGenerateWithGemini(requests);
   for (const result of results) {
     if (!result.success) {
       console.error(`Failed: ${result.error}`);
       // Retry or log
     }
   }
   ```

3. **Không gửi batch quá lớn** (>50 requests)
   - Tốn memory
   - Khó retry nếu lỗi
   - Nên chia nhỏ thành sub-batches

---

## Advanced: Custom Batch Processing

### Tạo Custom Batch Function

```typescript
import { batchGenerateWithGemini, createBatchRequests } from "@/lib/batchGemini";

export async function generateCustomBatch(items: any[]) {
  // 1. Build prompts
  const prompts = items.map(item => ({
    id: item.id,
    prompt: `Generate description for: ${item.name}`
  }));
  
  // 2. Create requests
  const requests = createBatchRequests(prompts, {
    operation: 'GENERATE_IMAGE_PROMPTS',
    temperature: 0.8
  });
  
  // 3. Execute
  const results = await batchGenerateWithGemini(requests);
  
  // 4. Process
  const processed = results.map(r => ({
    id: r.id,
    description: r.success ? r.data.description : null,
    error: r.error
  }));
  
  return processed;
}
```

---

## Troubleshooting

### Issue: Requests hitting rate limits

**Solution:** Giảm concurrency hoặc để auto-detect

```typescript
// Thay vì
await batchGenerateWithGemini(requests, onProgress, 10);

// Dùng
await batchGenerateWithGemini(requests, onProgress); // Auto-detect
```

### Issue: Some requests timeout

**Solution:** Tăng timeout trong GoogleGenAI config

```typescript
const genAI = new GoogleGenAI({ 
  apiKey,
  timeout: 60000 // 60 seconds
});
```

### Issue: Memory issues with large batches

**Solution:** Chia nhỏ batch

```typescript
const BATCH_SIZE = 20;

for (let i = 0; i < allRequests.length; i += BATCH_SIZE) {
  const batch = allRequests.slice(i, i + BATCH_SIZE);
  const results = await batchGenerateWithGemini(batch);
  // Process batch results
}
```

---

## Comparison: Google Batch API vs Our Implementation

| Feature | Google Batch API | Our Concurrent Implementation |
|---------|-----------------|------------------------------|
| **Turnaround Time** | 24 hours | Real-time (seconds) |
| **Cost** | 50% discount | Full price |
| **Use Case** | Offline processing | Interactive generation |
| **Rate Limits** | Higher | Standard RPM limits |
| **Progress Tracking** | Polling | Real-time callbacks |
| **Error Handling** | Batch-level | Request-level |
| **Best For** | Data preprocessing | User-facing features |

**Kết luận:** Google Batch API không phù hợp cho generate scripts realtime. Sử dụng concurrent requests như đã implement.

---

## Migration Guide

### From Sequential to Batch

```typescript
// BEFORE (Sequential)
export async function generateScripts(projectId: string) {
  const queue = new PQueue({ concurrency: 5 });
  
  for (const chapter of chapters) {
    await queue.add(() => processChapter(chapter));
  }
  
  await queue.onIdle();
}

// AFTER (Batch)
export async function generateScriptsBatch(projectId: string) {
  const requests = chapters.map(ch => ({
    id: ch.id,
    prompt: buildPrompt(ch)
  }));
  
  const results = await batchGenerateWithGemini(
    createBatchRequests(requests, { operation: 'GENERATE_SCRIPT' })
  );
  
  return processResults(results);
}
```

---

## Performance Monitoring

### Track Batch Performance

```typescript
const startTime = Date.now();

const results = await batchGenerateWithGemini(requests);

const duration = Date.now() - startTime;
const avgPerRequest = duration / requests.length;

console.log(`Batch completed in ${duration}ms`);
console.log(`Average per request: ${avgPerRequest}ms`);
```

### Log to Database

```typescript
await prisma.batchLog.create({
  data: {
    operation: 'GENERATE_SCRIPT',
    requestCount: requests.length,
    successCount: results.filter(r => r.success).length,
    durationMs: duration,
    concurrency: concurrency
  }
});
```

---

## Summary

- ✅ **Batch processing giảm 50-70% thời gian** so với sequential
- ✅ **Auto-detect concurrency** dựa trên model RPM limits
- ✅ **Model rotation** tự động khi hết quota
- ✅ **Real-time progress tracking** với callbacks
- ✅ **Error isolation** - 1 request lỗi không ảnh hưởng requests khác
- ❌ **Google Batch API không phù hợp** cho interactive use cases

**Recommend:** Dùng `generateScriptsBatch()` cho projects có >5 chapters.
