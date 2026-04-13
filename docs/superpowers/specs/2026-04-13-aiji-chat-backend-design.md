# AI己 · Chat 后端设计规格

**创建时间**：2026-04-13
**状态**：已确认，暂未实现

---

## 一、数据模型（Prisma）

### 1.1 ChatMessage（聊天消息）

```prisma
model ChatMessage {
  id          String   @id @default(uuid())
  userId      String
  role        String   // "user" | "ai"
  type        String   // "text" | "card"
  cardType    String?  // card 时对应的 cardType
  content     String?  // text 消息内容
  cardData    Json?    // card 消息的 data 字段
  actions     Json?    // card 消息的 actions 数组
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])
}
```

### 1.2 PushQueue（推送队列）

```prisma
model PushQueue {
  id          String   @id @default(uuid())
  userId      String
  cardType    String   // 推送的卡片类型
  data        Json     // 卡片 data
  actions     Json?    // 卡片 actions
  triggerAt   DateTime // 触发时间
  sentAt      DateTime? // 已发送时间（null=待发送）
  expiresAt   DateTime // 过期时间
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])
}
```

### 1.3 PushRecord（推送记录·去重用）

```prisma
model PushRecord {
  id          String   @id @default(uuid())
  userId      String
  cardType    String
  sentAt      DateTime @default(now())

  @@index([userId, cardType, sentAt])
}
```

---

## 二、API 路由

```
/api/chat/
├── GET  /messages              # 获取消息列表
├── POST /send                  # 发送消息（自然语言）
├── POST /action                # 卡片按钮点击
├── GET  /push                  # 获取未读推送（首次打开）
└── POST /push/:id/read         # 标记推送已读
```

### 2.1 GET /api/chat/messages

**Query:** `?since=<timestamp>&limit=20`

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_xxx",
      "role": "ai",
      "type": "card",
      "cardType": "morning-report",
      "data": { ... },
      "actions": [ ... ],
      "createdAt": "2026-04-13T08:00:00Z"
    }
  ],
  "hasMore": true
}
```

### 2.2 POST /api/chat/send

**Request:**
```json
{
  "content": "今天练什么",
  "planId": "xxx"
}
```

**Response:**
```json
{
  "message": {
    "id": "msg_zzz",
    "role": "ai",
    "type": "card",
    "cardType": "training-recommend",
    "data": {
      "name": "胸部力量训练",
      "duration": 45,
      "exercises": [ ... ],
      "reason": "胸肌已恢复3天，状态良好"
    },
    "actions": [
      { "id": "start", "label": "开始训练", "action": "navigate", "target": "/pages/training/today" },
      { "id": "change", "label": "换一个", "action": "regenerate" },
      { "id": "viewPlan", "label": "查看计划", "action": "navigate", "target": "/pages/training/plan-detail" }
    ],
    "createdAt": "2026-04-13T10:00:01Z"
  }
}
```

### 2.3 POST /api/chat/action

**Request:**
```json
{
  "messageId": "msg_zzz",
  "actionId": "start",
  "params": { "planDayId": "day_123" }
}
```

**Response:**
```json
{
  "result": {
    "type": "navigate",
    "target": "/pages/training/today"
  }
}
```

### 2.4 GET /api/chat/push

**Response:**
```json
{
  "pushes": [
    {
      "id": "push_001",
      "cardType": "morning-report",
      "data": {
        "yesterdayWeight": 72.5,
        "weightChange": -0.3,
        "todayPlan": "背部 + 二头",
        "duration": 50
      },
      "triggerAt": "2026-04-13T08:00:00Z"
    }
  ]
}
```

---

## 三、Action 处理逻辑

| action | 处理逻辑 | 返回 |
|--------|----------|------|
| `navigate` | 返回跳转地址 | `{ type: "navigate", target: "..." }` |
| `save` | 调用 Service 保存数据 | `{ type: "saved", data: {...} }` |
| `regenerate` | 重新调用 AI 生成 | 追加新消息 |
| `dismiss` | 删除该消息 | `{ type: "dismissed" }` |
| `callback` | 执行自定义逻辑 | `{ type: "callback", result: {...} }` |

---

## 四、服务层设计

```
services/
├── chatService.ts        # 消息存取、Action 处理分发
├── aiChatService.ts      # AI 对话、结构化输出
└── pushService.ts        # 推送触发判断、队列管理
```

### 4.1 chatService.ts

```typescript
export async function getMessages(userId: string, since?: Date, limit = 20)
export async function sendMessage(userId: string, content: string, planId?: string)
export async function handleCardAction(userId: string, messageId: string, actionId: string, params?: object)
export async function getUnreadPushes(userId: string)
export async function markPushAsRead(pushId: string)
```

### 4.2 aiChatService.ts

```typescript
export async function chat(userId: string, message: string, context: ChatContext): Promise<ChatMessage>
async function buildContext(userId: string): Promise<AIContext>
function parseAIResponse(raw: string): ParsedResponse
async function generateWeightRecordCard(userId: string): Promise<CardData>
async function generateTrainingRecommendCard(userId: string): Promise<CardData>
async function generateMorningReport(userId: string): Promise<CardData>
// ... 其他卡片
```

### 4.3 pushService.ts

```typescript
export async function checkAndEnqueuePushes()
async function checkMorningReport(userId: string): Promise<PushQueue | null>
async function checkTrainingReminder(userId: string): Promise<PushQueue | null>
async function checkOvertrainingWarning(userId: string): Promise<PushQueue | null>
async function checkWeeklyReport(userId: string): Promise<PushQueue | null>
async function checkPRBreakthrough(userId: string, logEntry: LogEntry): Promise<PushQueue | null>
```

---

## 五、AI Prompt 设计

```
你是一个专业的健身 AI 助手，名叫"AI己"。
用户通过小程序与你对话，你可以返回两种类型的回复：

1. text - 纯文字回复
2. card - 卡片回复（结构化 JSON）

当用户询问以下类型时，优先返回 card：
- "练什么" → training-recommend
- "记录训练" / "今天练了..." → training-editable
- "...怎么样"（趋势查询）→ weight-trend / recovery-status
- "我最近..." → morning-report / weekly-report

卡片必须返回以下 JSON 结构：
{
  "type": "card",
  "cardType": "<类型>",
  "data": { ... },
  "actions": [ ... ]
}

每次回复尽量简洁，除非用户要求详细说明。
```

---

## 六、推送触发流程

```
┌─────────────────────────────────────────────────────────────┐
│                    定时任务（每分钟）                        │
├─────────────────────────────────────────────────────────────┤
│  checkMorningReport()                                       │
│  ├── 检查用户是否首次打开（当日）                            │
│  ├── 是 → 入 PushQueue（triggerAt = 现在）                  │
│  └── 否 → 跳过                                               │
│                                                              │
│  checkTrainingReminder()                                    │
│  ├── 检查当前时间 >= 19:00                                   │
│  ├── 检查用户今日有训练计划但未记录                           │
│  ├── 是 → 入 PushQueue                                      │
│  └── 否 → 跳过                                               │
│                                                              │
│  checkOvertrainingWarning()                                │
│  ├── 查询用户近5天训练日志                                    │
│  ├── 计算各肌群恢复状态                                       │
│  ├── 有肌群 < 40% → 入 PushQueue                             │
│  └── 否则 → 跳过                                             │
└─────────────────────────────────────────────────────────────┘
```

### 推送触发条件

| 触发条件 | 推送卡片 | 推送时机 |
|----------|----------|----------|
| 用户首次打开（每日） | `morning-report` | 消息流顶部 |
| 当天该练但未练（19:00后） | 训练提醒（文本消息）| 消息流顶部 |
| 某肌群恢复≥90% | `training-recommend`（可选）| 任意时间 |
| 连续高强度训练≥5天 | `overtraining-warning` | 任意时间 |
| 新增训练记录，e1RM 突破历史 | `personal-record` | 任意时间 |
| 每周一 09:00 | `weekly-report` | 消息流顶部 |
| 用户完成里程碑（连续打卡等）| `achievement` | 任意时间 |

---

## 七、数据依赖

| 卡片 | 依赖服务/数据 |
|------|----------------|
| weight-record | bodyDataService.getLatestWeight() |
| measurement-record | bodyDataService |
| training-recommend | trainingPlanService, recoveryService |
| training-editable | trainingPlanService |
| recovery-status | recoveryService.getRecoveryStatuses() |
| morning-report | bodyDataService, trainingLogService |
| weekly-report | trainingLogService, bodyDataService |
| personal-record | trainingLogService.calcE1RM() |
| overtraining-warning | recoveryService |

---

## 八、里程碑

- [ ] Phase 3.1：Chat 后端核心（消息存取、发送、AI 解析）
- [ ] Phase 3.2：推送队列与触发逻辑
- [ ] Phase 3.3：定时任务与去重机制

---

## 九、文件结构

```
backend/src/
├── models/
│   └── schema.prisma          # 新增 ChatMessage, PushQueue, PushRecord
├── routes/
│   └── chat.ts               # /api/chat/* 路由
├── controllers/
│   └── chatController.ts
├── services/
│   ├── chatService.ts        # 消息存取、Action 分发
│   ├── aiChatService.ts      # AI 对话、结构化输出
│   └── pushService.ts        # 推送触发、队列管理
└── jobs/
    └── pushChecker.ts        # 定时任务（每分钟检查推送）
```
