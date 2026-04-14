# 聊天卡片组件拆分重构方案

**创建时间**：2026-04-14
**状态**：待实施

---

## 一、目标

将首页 `CardComponent.vue` 中的所有卡片类型拆分为独立的 `.vue` 文件，采用混合方案：
- **P0 核心卡片**：独立组件 + TypeScript 接口类型化
- **P2-P3 其他卡片**：统一渲染组件

---

## 二、文件结构

```
front/components/chat/cards/
├── index.ts                          # 统一导出
├── types.ts                         # 所有卡片类型定义
├── WeightRecordCard.vue              # P0 - 体重记录
├── TrainingRecommendCard.vue         # P0 - 训练推荐
├── TrainingEditableCard.vue          # P0 - 训练记录可编辑
├── RecoveryStatusCard.vue            # P1 - 恢复状态
├── MorningReportCard.vue             # P1 - 早安日报
├── WeeklyReportCard.vue              # P1 - 周报
├── AchievementCard.vue               # P1 - 成就
└── LegacyCardRenderer.vue            # P2-P3 其他卡片统一渲染
```

---

## 三、卡片优先级

| 优先级 | cardType | 组件文件 | 类型化 |
|--------|----------|----------|--------|
| P0 | `training-editable` | TrainingEditableCard.vue | ✅ |
| P0 | `weight-record` | WeightRecordCard.vue | ✅ |
| P0 | `training-recommend` | TrainingRecommendCard.vue | ✅ |
| P1 | `recovery-status` | RecoveryStatusCard.vue | ✅ |
| P1 | `morning-report` | MorningReportCard.vue | ✅ |
| P1 | `weekly-report` | WeeklyReportCard.vue | ✅ |
| P1 | `achievement` | AchievementCard.vue | ✅ |
| P2 | 其他 9 种 | LegacyCardRenderer.vue | ❌ |

---

## 四、P0 卡片接口定义（基于实际返回数据）

### TrainingEditableCard

```typescript
interface TrainingEditableCardData {
  date: string
  exercises: Array<{
    name: string
    sets: number
    totalVolume?: number
  }>
  summary?: string
  saved?: boolean
  directSave?: boolean
  error?: string
  totalVolume?: number
  trainingId?: string
  duration?: number
}
```

### WeightRecordCard

```typescript
interface WeightRecordCardData {
  latestWeight?: number
  lastRecordDate?: string
  weight?: number
  date?: string
  unit?: 'kg' | 'lbs'
  saved?: boolean
  directSave?: boolean
  error?: string
}
```

### TrainingRecommendCard

```typescript
interface TrainingRecommendCardData {
  name: string
  type?: 'rest_day' | 'completed_today' | 'new_recommendation' | 'overtraining_warning'
  duration?: number
  exercises?: Array<{
    name: string
    sets: number
    reps?: string
    lastWeight?: number
  }>
  reason?: string
  completed?: boolean
  muscleScores?: Record<string, number>
  warningLevel?: 'mild' | 'moderate' | 'high'
  warnings?: string[]
  suggestions?: string[]
}
```

---

## 五、Props 统一接口

```typescript
interface BaseCardProps {
  cardData: T
  actions?: CardAction[]
  disabled?: boolean
}

interface CardAction {
  id: string
  label: string
  action: 'navigate' | 'dismiss' | 'confirm' | 'cancel' | 'regenerate' | 'edit' | 'share' | 'callback'
  target?: string
}

const emit = defineEmits<{
  action: [actionId: string]
}>()
```

---

## 六、注册中心 index.ts

```typescript
export { default as WeightRecordCard } from './WeightRecordCard.vue'
export { default as TrainingRecommendCard } from './TrainingRecommendCard.vue'
export { default as TrainingEditableCard } from './TrainingEditableCard.vue'
export { default as RecoveryStatusCard } from './RecoveryStatusCard.vue'
export { default as MorningReportCard } from './MorningReportCard.vue'
export { default as WeeklyReportCard } from './WeeklyReportCard.vue'
export { default as AchievementCard } from './AchievementCard.vue'
export { default as LegacyCardRenderer } from './LegacyCardRenderer.vue'

export const cardTypeMap = {
  'weight-record': WeightRecordCard,
  'training-recommend': TrainingRecommendCard,
  'training-editable': TrainingEditableCard,
  'recovery-status': RecoveryStatusCard,
  'morning-report': MorningReportCard,
  'weekly-report': WeeklyReportCard,
  'achievement': AchievementCard,
} as const

export type CardType = keyof typeof cardTypeMap
```

---

## 七、CardComponent.vue 重构

```vue
<template>
  <component
    :is="cardComponents[cardType]"
    v-if="cardType && cardComponents[cardType]"
    :card-data="cardData"
    :actions="actions"
    :disabled="disabled"
    @action="handleAction"
  />
  <LegacyCardRenderer
    v-else-if="cardType"
    :card-type="cardType"
    :card-data="cardData"
    :actions="actions"
    :disabled="disabled"
    @action="handleAction"
  />
  <view v-else class="default-card">
    <text>{{ JSON.stringify(cardData) }}</text>
  </view>
</template>

<script setup lang="ts">
import { cardTypeMap } from './cards/index'

const props = defineProps<{
  cardType?: string
  cardData: Record<string, any>
  actions?: CardAction[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

const cardComponents = { ...cardTypeMap }

function handleAction(actionId: string) {
  emit('action', actionId)
}
</script>
```

---

## 八、实施步骤

### Step 1: 创建类型文件
- 创建 `front/components/chat/cards/types.ts`
- 定义所有卡片类型接口

### Step 2: 创建 P0 卡片组件
- WeightRecordCard.vue
- TrainingRecommendCard.vue
- TrainingEditableCard.vue

### Step 3: 创建 P1 卡片组件
- RecoveryStatusCard.vue
- MorningReportCard.vue
- WeeklyReportCard.vue
- AchievementCard.vue

### Step 4: 创建 LegacyCardRenderer
- 统一渲染 P2-P3 其他 9 种卡片

### Step 5: 创建 index.ts
- 统一导出所有组件和类型映射

### Step 6: 重构 CardComponent.vue
- 使用动态组件渲染

### Step 7: 单元测试
- 为每个卡片组件编写测试

---

## 九、CHITCHAT 需求（后续）

> **当 intent = "CHITCHAT" 时**，后台需要发送用户近期训练记录和基本数据给 AI，让 AI 以健身教练身份对话。

**涉及文件**：
- `backend/src/services/aiChatService.ts` - 检测 CHITCHAT 意图，查询用户数据发送给 AI
- `backend/src/services/chatService.ts` - 传递用户上下文

**AI 系统提示词增强**：
```
你是一位专业、友善的健身教练。用户正在闲聊，请基于以下用户数据（近期训练、体重变化、目标等）用自然的方式回应，可以适当给予鼓励、建议或分享健身知识。
```

---

## 十、后端类型修正（建议）

当前后端 `TrainingEditableData` 类型定义与实际返回严重不符，建议后续修正：

```typescript
// 实际返回 vs 类型定义对比
// 实际: { name, sets, totalVolume }
// 定义: { id, name, muscle, sets: [{setNumber, targetReps, ...}] }
```

---
