# Phase 3 后端扩展：训练记录保存与 AI 接口集成

## Context

Phase 3 后端核心已完成，实现了 8 种意图处理和 5 种主动推送卡片。但有两个关键功能尚未实现：

1. **训练记录保存** (`generateTrainingEditableResponse` 第 255 行 TODO)：用户说"练了卧推 60kg 8个"时，无法实际保存到数据库
2. **AI 接口调用** (`generateDefaultResponse` 第 688 行 TODO)：复杂对话只能返回随机预设回复

这两个功能是 Phase 3 完整闭环的关键。

---

## Feature 1: 训练记录保存

### 1.1 新建服务

**文件: `src/services/trainingRecordParser.ts`**

解析自然语言训练输入为结构化数据：

```typescript
// "今天练了卧推 60kg 8个、深蹲 100kg 5个"
parseTrainingInput(message)
// → { exercises: [{name: "卧推", sets: [{weight: 60, reps: 8}]}, ...], date: "today" }
```

- 处理多种格式：kg、公斤、斤、lbs
- 支持多组数表达：3组、3set
- 支持动作别名：卧推 → 杠铃卧推

**文件: `src/services/chatTrainingService.ts`**

编排保存流程：

```typescript
async function saveTrainingFromChat(userId, message, entities) {
  // 1. 解析训练数据
  const parsed = parseTrainingInput(message)

  // 2. 匹配动作到数据库
  const exercises = await matchToDatabase(parsed.exercises)

  // 3. 启动训练会话
  const training = await startTraining(userId)

  // 4. 添加每个 set
  for (const ex of exercises) {
    for (const set of ex.sets) {
      await addLogEntry(training.id, ex.id, ex.name, setNum++, set.weight, set.reps)
    }
  }

  // 5. 完成训练
  return await completeTraining(training.id)
}
```

### 1.2 修改现有文件

**`src/services/intentParser.ts`** - 增强 `extractEntities` 函数，支持训练数据的结构化提取

**`src/services/aiChatService.ts`** - 修改 `generateTrainingEditableResponse`：
- 当 `entities.exercises` 有数据时调用 `saveTrainingFromChat`
- 返回保存确认卡片（含训练 ID、总量、时长）
- 失败时返回错误信息

### 1.3 验证

```bash
# 测试解析
npx ts-node -e "import {parseTrainingInput} from './src/services/trainingRecordParser'; console.log(parseTrainingInput('卧推 60kg 8个'))"

# 测试完整流程
npm test -- trainingRecordParser
```

---

## Feature 2: AI 接口集成

### 2.1 环境变量

**文件: `src/config/env.ts`** - 添加：

```typescript
aiApiKey: process.env['AI_API_KEY'] || '',
aiApiUrl: process.env['AI_API_URL'] || 'https://api.openai.com/v1/chat/completions',
aiModel: process.env['AI_MODEL'] || 'gpt-3.5-turbo',
```

**.env.example** - 添加：

```
AI_API_KEY=your-api-key-here
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_MODEL=gpt-3.5-turbo
```

### 2.2 新建服务

**文件: `src/services/aiGatewayService.ts`**

AI 网关服务：

```typescript
interface AIRequest {
  userId: string
  message: string
  context?: {
    conversationHistory?: Array<{role: string; content: string}>
    userGoal?: string
    recentTrainings?: Array<{name: string; date: string}>
  }
}

export async function callAI(request: AIRequest): Promise<AIResponse>
```

**构建上下文：**
- 用户信息（昵称、目标、等级）
- 最近训练记录（最近 3 次）
- 系统提示词（健身 AI 助手人设）

### 2.3 修改现有文件

**`src/services/aiChatService.ts`** - 修改 `generateDefaultResponse`：

```typescript
async function generateDefaultResponse(userId, message) {
  // 有 API Key 时调用 AI
  if (env.aiApiKey) {
    const response = await callAI({ userId, message })
    if (response.content) {
      return createAIMessage(userId, {
        type: 'text',
        content: response.content
      })
    }
  }
  // 无 API Key 或失败时使用预设回复
  return createFallbackResponse(userId)
}
```

---

## 实施顺序

1. **训练记录解析器** (`trainingRecordParser.ts`) - 独立模块，便于测试
2. **训练保存服务** (`chatTrainingService.ts`) - 调用现有 trainingLogService
3. **AI 网关服务** (`aiGatewayService.ts`) - 新服务，依赖环境变量
4. **集成到 aiChatService** - 修改两个函数调用新服务

---

## 关键文件

| 操作 | 文件 |
|------|------|
| 新建 | `src/services/trainingRecordParser.ts` |
| 新建 | `src/services/chatTrainingService.ts` |
| 新建 | `src/services/aiGatewayService.ts` |
| 修改 | `src/services/intentParser.ts` |
| 修改 | `src/services/aiChatService.ts` |
| 修改 | `src/config/env.ts` |
| 修改 | `.env.example` |

---

## 测试验证

```bash
# TypeScript 编译
npx tsc --noEmit

# 单元测试
npm test -- intentParser intentChecker

# 集成测试（需数据库）
npm test -- trainingLog
```
