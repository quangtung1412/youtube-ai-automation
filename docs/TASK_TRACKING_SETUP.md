# Task Tracking System - Setup Instructions

## ⚠️ IMPORTANT: Requires Dev Server Restart

The Task Tracking system has been created but is currently **DISABLED** due to Prisma Client generation issues.

## Current Status

✅ **Completed:**
- Database migration applied: `20251203150000_add_task_tracking`
- Task model added to schema
- All task management code created:
  - `actions/taskManager.ts`
  - `app/dashboard/projects/[id]/tasks/` (Task Monitor page)
  - `app/dashboard/projects/[id]/TaskButton.tsx`

❌ **Temporarily Disabled:**
- Prisma Client not regenerated (Windows EPERM error)
- Task tracking features commented out in:
  - `app/dashboard/projects/[id]/ProjectDetailNew.tsx`
  - `actions/generateOutline.ts`

## How to Enable Task Tracking

### Step 1: Stop Dev Server
```bash
# Press Ctrl+C in the terminal running `npm run dev`
```

### Step 2: Regenerate Prisma Client
```bash
npx prisma generate
```

This should work now that the dev server is stopped.

### Step 3: Uncomment Task Tracking Code

#### A. In `app/dashboard/projects/[id]/ProjectDetailNew.tsx`

Search for `TODO: Enable after restarting` and uncomment:

1. Import statement (line ~10):
```typescript
import { getRunningTasks, type TaskType } from "@/actions/taskManager";
```

2. State variable (line ~83):
```typescript
const [runningTasksCount, setRunningTasksCount] = useState(0);
```

3. useEffect hook (line ~265):
```typescript
useEffect(() => {
    const checkRunningTasks = async () => {
        const result = await getRunningTasks(project.id);
        if (result.success && result.tasks) {
            setRunningTasksCount(result.tasks.length);
        }
    };

    checkRunningTasks();
    const interval = setInterval(checkRunningTasks, 3000);

    return () => clearInterval(interval);
}, [project.id]);
```

4. Tasks button with badge (line ~302):
```typescript
<div className="flex gap-3">
    <Link
        href={`/dashboard/projects/${project.id}/tasks`}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium shadow-sm transition relative"
    >
        📊 Tasks
        {runningTasksCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                {runningTasksCount}
            </span>
        )}
    </Link>
</div>
```

#### B. In `actions/generateOutline.ts`

Search for `TODO: Enable` and uncomment all task tracking code:

1. Import statement (line ~6):
```typescript
import { createTask, updateTask } from "./taskManager";
```

2. Task creation at the start of function (line ~8-14):
```typescript
const taskResult = await createTask(projectId, 'GENERATE_OUTLINE');
if (!taskResult.success || !taskResult.task) {
    return { success: false, error: "Failed to create task" };
}
const taskId = taskResult.task.id;
```

3. Initial task update (line ~17-22):
```typescript
await updateTask(taskId, {
    status: 'RUNNING',
    progress: 10,
    message: 'Đang tải thông tin project...',
    startedAt: new Date()
});
```

4. All remaining `await updateTask(taskId, ...)` calls throughout the file - there are about 8 more places to uncomment

### Step 4: Restart Dev Server
```bash
npm run dev
```

## Features After Enabling

### 1. Task Monitor Page
- URL: `/dashboard/projects/[id]/tasks`
- View all tasks (running, completed, failed)
- Stats dashboard
- Auto-refresh every 2 seconds
- Delete tasks or clear completed

### 2. Task Tracking in Actions
- `generateOutline` already has task tracking integrated
- Progress updates: 10% → 20% → 40% → 70% → 85% → 100%
- Error handling with task status updates

### 3. Prevent Button Spam
- Buttons automatically disabled when task is running
- Visual feedback with "Đang xử lý..." message
- Badge showing number of running tasks

### 4. TaskButton Component
- Reusable component for any action
- Auto-checks if task is running
- Disables button automatically
- Shows spinner while processing

## Next Steps (Optional)

To add task tracking to other actions, follow the pattern in `generateOutline.ts`:

```typescript
import { createTask, updateTask } from "./taskManager";

export async function yourAction(projectId: string) {
    const taskResult = await createTask(projectId, 'YOUR_TASK_TYPE');
    const taskId = taskResult.task.id;

    try {
        await updateTask(taskId, {
            status: 'RUNNING',
            progress: 10,
            message: 'Starting...',
            startedAt: new Date()
        });

        // Your action logic here
        await updateTask(taskId, { progress: 50, message: 'Half way...' });

        // More logic...
        
        await updateTask(taskId, {
            status: 'COMPLETED',
            progress: 100,
            message: 'Done!',
            completedAt: new Date()
        });

        return { success: true };
    } catch (error) {
        await updateTask(taskId, {
            status: 'FAILED',
            error: error.message,
            completedAt: new Date()
        });
        return { success: false, error: error.message };
    }
}
```

## Troubleshooting

**Q: Still getting EPERM error?**
- Make sure ALL Node processes are stopped
- Check Task Manager for lingering Node.exe processes
- Try rebooting if issue persists

**Q: Task model not found after prisma generate?**
- Check `node_modules/.prisma/client/` folder exists
- Verify migration was applied: `npx prisma migrate status`
- Try: `npx prisma db push` as alternative

**Q: Page shows blank/error after enabling?**
- Check browser console for errors
- Verify all TODO comments were properly uncommented
- Restart dev server again

## Files Modified

- ✅ `prisma/schema.prisma` - Added Task model
- ✅ `prisma/migrations/20251203150000_add_task_tracking/migration.sql`
- ✅ `actions/taskManager.ts` - All task management functions
- ⚠️ `actions/generateOutline.ts` - Integrated task tracking (commented out)
- ✅ `app/dashboard/projects/[id]/tasks/page.tsx` - Task monitor route
- ✅ `app/dashboard/projects/[id]/tasks/TaskMonitor.tsx` - UI component
- ✅ `app/dashboard/projects/[id]/TaskButton.tsx` - Reusable button
- ⚠️ `app/dashboard/projects/[id]/ProjectDetailNew.tsx` - Commented out (needs uncommenting)

---

**Ready to enable?** Follow the steps above and enjoy your new Task Tracking System! 🚀
