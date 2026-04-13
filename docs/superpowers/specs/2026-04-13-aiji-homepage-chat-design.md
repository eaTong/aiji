# AI己 · 首页对话流设计规格

**创建时间**：2026-04-13
**状态**：已确认，暂未实现

---

## 一、背景与目标

Phase 3 核心页面：AI 对话首页（Tab 1）。

用户可以通过：
1. **快捷按钮** — 一键触发常用功能
2. **自然语言输入** — 与 AI 对话，记录训练/查询状态
3. **AI 主动推送** — 基于数据阈值自动推送早安日报、预警等

所有交互以**卡片**为载体，13 种卡片类型全部支持。

---

## 二、对话形式

**AI 主动推送 + 流式对话 + 快捷按钮**

- 用户可随时输入文字与 AI 对话
- AI 回复以卡片或文本形式展示
- 快捷按钮提供常用功能的快速入口

---

## 三、快捷按钮

首页底部快捷按钮区仅两个按钮：

| 按钮 | 触发卡片 | 说明 |
|------|----------|------|
| 练什么 | 今日训练推荐卡 | AI 推荐今日训练计划 |
| 记录 | 训练记录可编辑卡 | 记录今日训练内容 |

---

## 四、卡片类型（13 种）

### 4.1 数据记录类

| cardType | 触发方式 | 交互 |
|----------|----------|------|
| `weight-record` | 快捷按钮 / 自然语言 | 输入体重 → 保存记录 |
| `measurement-record` | 快捷按钮 / 自然语言 | 录入多部位围度 → 保存 |
| `weight-trend` | 自然语言查询 | 展示 30 天折线图 |

### 4.2 训练类

| cardType | 触发方式 | 交互 |
|----------|----------|------|
| `training-recommend` | 快捷按钮「练什么」| 展示推荐计划 → 开始训练/换一个/查看计划 |
| `training-editable` | 快捷按钮「记录」| 展示可编辑表格 → 用户调整 → 保存记录 |
| `recovery-status` | 自然语言查询 | 展示肌群热力图 + 恢复百分比 |
| `exercise-detail` | 自然语言查询 | 展示动作说明、步骤、肌肉图 |
| `personal-record` | AI 主动推送（PR 突破时）| 展示新纪录 + e1RM 趋势 |

### 4.3 AI 分析类

| cardType | 触发方式 | 交互 |
|----------|----------|------|
| `morning-report` | AI 主动推送（每日首次打开）| 昨日总结 + 今日计划预览 |
| `weekly-report` | AI 主动推送（每周一 09:00）| 训练次数、容量、体重变化、AI 点评 |
| `goal-progress` | 自然语言查询 | 目标进度条 + 预测达标时间 |
| `overtraining-warning` | AI 主动推送（检测到疲劳信号）| 预警 + 调整建议 |

### 4.4 快捷操作类

| cardType | 触发方式 | 交互 |
|----------|----------|------|
| `option-choice` | AI 对话流中引导 | 2-4 选项 → 用户选择 → 继续对话 |
| `plan-preview` | AI 生成计划后 | 周视图预览 → 确认/重新生成 |
| `achievement` | AI 主动推送（里程碑达成）| 成就展示 + 分享/继续 |
| `diet-record` | 自然语言 / 快捷按钮 | 解析饮食 → 营养估算 → 保存 |

---

## 五、AI 回复结构

AI 回复统一为以下格式，由后端返回，前端根据类型渲染：

### 5.1 纯文本消息

```json
{
  "type": "text",
  "content": "今天适合练胸部，状态不错！",
  "timestamp": "2026-04-13T10:00:00Z"
}
```

### 5.2 卡片消息

```json
{
  "type": "card",
  "cardType": "training-recommend",
  "data": {
    "name": "胸部力量训练",
    "duration": 45,
    "exercises": [
      { "name": "杠铃卧推", "sets": "4×8-10", "weight": 60 },
      { "name": "哑铃上斜", "sets": "3×10-12", "weight": 28 }
    ],
    "reason": "胸肌已恢复3天，状态良好"
  },
  "actions": [
    { "id": "start", "label": "开始训练", "action": "navigate", "target": "/pages/training/today" },
    { "id": "change", "label": "换一个", "action": "regenerate" },
    { "id": "viewPlan", "label": "查看计划", "action": "navigate", "target": "/pages/training/plan-detail" }
  ],
  "timestamp": "2026-04-13T10:00:00Z"
}
```

### 5.3 cardType 枚举

```
weight-record, measurement-record, weight-trend,
training-recommend, training-editable, recovery-status,
exercise-detail, personal-record,
morning-report, weekly-report, goal-progress, overtraining-warning,
option-choice, plan-preview, achievement, diet-record
```

---

## 六、AI 主动推送触发逻辑

| 触发条件 | 推送卡片 | 推送时机 |
|----------|----------|----------|
| 用户首次打开（每日） | `morning-report` | 消息流顶部 |
| 当天该练但未练（19:00后） | 训练提醒（文本消息）| 消息流顶部 |
| 某肌群恢复≥90% | `training-recommend`（可选）| 任意时间 |
| 连续高强度训练≥5天 | `overtraining-warning` | 任意时间 |
| 新增训练记录，e1RM 突破历史 | `personal-record` | 任意时间 |
| 每周一 09:00 | `weekly-report` | 消息流顶部 |
| 用户完成里程碑（连续打卡等）| `achievement` | 任意时间 |

### 推送规则

- **首次打开推送**：每天第一次进首页，在消息流最上方插入推送内容
- **任意时间推送**：当触发条件满足时，插入消息流（需处理用户正在输入的状态）
- **推送去重**：同一类型推送 24 小时内不重复（除非是 PR 突破）

---

## 七、卡片交互规范

### 7.1 按钮类型

| action | 说明 | 行为 |
|--------|------|------|
| `navigate` | 跳转页面 | 跳转至 `target` 指定路径 |
| `save` | 保存数据 | 调用对应 API 保存数据 |
| `regenerate` | 重新生成 | 重新请求 AI 生成内容 |
| `dismiss` | 关闭卡片 | 从消息流移除该卡片 |
| `callback` | 自定义回调 | 执行 `callback` 函数 |

### 7.2 通用交互

- 卡片点击外部/取消：关闭卡片
- 保存成功后：显示成功提示，卡片内容更新
- 保存失败后：显示错误提示，保留卡片内容供修改

---

## 八、后端实现要点

### 8.1 消息流 API

```
GET  /api/chat/messages?since=<timestamp>  # 获取消息列表
POST /api/chat/send                        # 发送消息（自然语言）
POST /api/chat/action                      # 卡片按钮点击
GET  /api/chat/push                         # 获取未读推送（首次打开时）
```

### 8.2 推送队列

- 推送内容存入 Redis 队列
- 用户打开首页时拉取未读推送
- 任意时间触发：后端定时任务检查触发条件，满足则推入队列

### 8.3 AI 结构化输出

- AI 对话使用 JSON mode / tool use
- 系统提示词约定：回复时优先返回结构化卡片而非纯文本
- 推送内容由后端计算后构造，直接返回卡片 JSON

---

## 九、前端实现要点

### 9.1 消息流组件

```
components/
├── ChatMessageList.vue      # 消息流容器
├── ChatMessage.vue          # 单条消息（文本/卡片）
├── cards/
│   ├── WeightRecordCard.vue
│   ├── MeasurementRecordCard.vue
│   ├── WeightTrendCard.vue
│   ├── TrainingRecommendCard.vue
│   ├── TrainingEditableCard.vue
│   ├── RecoveryStatusCard.vue
│   ├── ExerciseDetailCard.vue
│   ├── PersonalRecordCard.vue
│   ├── MorningReportCard.vue
│   ├── WeeklyReportCard.vue
│   ├── GoalProgressCard.vue
│   ├── OvertrainingWarningCard.vue
│   ├── OptionChoiceCard.vue
│   ├── PlanPreviewCard.vue
│   ├── AchievementCard.vue
│   └── DietRecordCard.vue
└── QuickButtons.vue          # 底部快捷按钮
```

### 9.2 状态管理

- `useChatStore`（Pinia）：消息流列表、发送状态
- `usePushStore`：未读推送、推送开关

---

## 十、里程碑

- [ ] Phase 3.1：核心训练闭环（练什么 → 记录 → PR 卡）
- [ ] Phase 3.2：主动关怀（早安日报、过度预警、周报）
- [ ] Phase 3.3：扩展卡片（围度记录、体重趋势、目标进度）
- [ ] Phase 3.4：激励与饮食（成就解锁、饮食记录）

---

## 十一、依赖关系

| 前置条件 | 说明 |
|----------|------|
| Phase 2B 训练计划 | 练什么按钮依赖训练计划生成能力 |
| PR 计算算法 | 个人记录卡依赖 e1RM 计算 |
| 容量加权恢复算法 | 恢复状态卡、过度预警依赖恢复状态 |
| POST /api/training/record | 训练记录可编辑卡保存依赖此接口 |
