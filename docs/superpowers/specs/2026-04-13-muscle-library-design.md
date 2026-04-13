# 肌肉库设计文档

**创建时间**：2026-04-13
**状态**：设计阶段，待实现

---

## 一、目标

建立肌肉层级库，支持：
1. 动作库导入时的肌肉名称翻译（英文 → 中文）
2. 训练后肌肉恢复状态追踪（部位级）
3. 动作按肌肉部位筛选

---

## 二、Muscle 模型设计

### 2.1 Prisma Schema

```prisma
model Muscle {
  id            String        @id @default(uuid())
  code          String        @unique  // 唯一标识，如 "CHEST_UPPER"
  name          String                   // 中文名称，如 "上胸"
  aliases       String[]                 // 英文别名，如 ["upper chest", "upper pecs"]
  category      MuscleCategory           // 所属大类
  parentCode    String?                  // 上级代码，顶级为 null
  recoveryHours Int        @default(48)  // 基础恢复时间（小时）
  createdAt     DateTime    @default(now())

  primaryExercises   ExerciseMuscle[] @relation("PrimaryMuscle")
  secondaryExercises ExerciseMuscle[] @relation("SecondaryMuscle")
}

enum MuscleCategory {
  CHEST
  BACK
  LEGS
  SHOULDERS
  ARMS
  CORE
}
```

### 2.2 层级结构

```
CHEST (胸部)
├── CHEST_UPPER (上胸)        ← parentCode: CHEST
├── CHEST_MIDDLE (中胸)       ← parentCode: CHEST
└── CHEST_LOWER (下胸)        ← parentCode: CHEST

BACK (背部)
├── LATS (背阔肌)             ← parentCode: BACK
├── TRAPS (斜方肌)            ← parentCode: BACK
├── TRAPS_UPPER (斜方肌上束)  ← parentCode: TRAPS
├── TRAPS_MIDDLE (斜方肌中束) ← parentCode: TRAPS
├── TRAPS_LOWER (斜方肌下束)  ← parentCode: TRAPS
├── RHOMBOID (菱形肌)         ← parentCode: BACK
└── LOWER_BACK (下背)         ← parentCode: BACK

LEGS (腿部)
├── QUADS (股四头肌)          ← parentCode: LEGS
├── HAMSTRINGS (腘绳肌)       ← parentCode: LEGS
├── GLUTES (臀肌)             ← parentCode: LEGS
├── ADDUCTORS (内收肌)        ← parentCode: LEGS
├── ABDUCTORS (外展肌)        ← parentCode: LEGS
└── CALVES (小腿)             ← parentCode: LEGS

SHOULDERS (肩部)
├── DELTS (三角肌)            ← parentCode: SHOULDERS
├── DELTS_FRONT (三角肌前束)  ← parentCode: DELTS
├── DELTS_MIDDLE (三角肌中束) ← parentCode: DELTS
└── DELTS_REAR (三角肌后束)   ← parentCode: DELTS

ARMS (手臂)
├── BICEPS (肱二头肌)         ← parentCode: ARMS
├── TRICEPS (肱三头肌)        ← parentCode: ARMS
├── BRACHIALIS (肱肌)         ← parentCode: ARMS
└── FOREARMS (前臂)           ← parentCode: ARMS

CORE (核心)
├── ABS (腹肌)                ← parentCode: CORE
├── ABS_UPPER (上腹)          ← parentCode: ABS
├── ABS_LOWER (下腹)          ← parentCode: ABS
├── OBLIQUES (腹斜肌)         ← parentCode: CORE
└── TRANSVERSE (腹横肌)       ← parentCode: CORE
```

### 2.3 恢复时间参考

| 肌肉类型 | recoveryHours | 说明 |
|----------|---------------|------|
| 大肌群（胸、背、臀、腿） | 72h | 恢复较慢 |
| 中等肌群（肩、臂、腹） | 48h | 标准恢复 |
| 小肌群（前臂、小腿） | 24h | 恢复较快 |

---

## 三、Exercise-Muscle 中间表

### 3.1 Prisma Schema

```prisma
model ExerciseMuscle {
  id          String     @id @default(uuid())
  exerciseId  String
  muscleId    String
  role        MuscleRole  // PRIMARY / SECONDARY
  ratio       Float      @default(1.0)  // 主肌群 1.0，辅肌群 0.5
  createdAt   DateTime   @default(now())

  exercise    Exercise   @relation(fields: [exerciseId], references: [id], onDelete: Cascade)
  muscle      Muscle     @relation(fields: [muscleId], references: [id])

  @@unique([exerciseId, muscleId])
}

enum MuscleRole {
  PRIMARY
  SECONDARY
}
```

### 3.2 说明

- `ratio`: 用于肌肉容量计算，主肌群 1.0，辅肌群 0.5
- `@@unique`: 同一动作同一肌肉只能有一条记录

---

## 四、Exercise 模型调整

### 4.1 移除 Json 字段

原 `primaryMuscles` 和 `secondaryMuscles` 为 Json，现改为中间表关联：

```prisma
model Exercise {
  id            String   @id @default(uuid())
  name          String
  nameEn        String?
  category      ExerciseCategory
  equipment     Equipment
  instructions  String?
  commonMistakes String?
  videoUrl      String?
  isCustom      Boolean  @default(false)
  isFavorite    Boolean  @default(false)
  userId        String?
  createdAt     DateTime @default(now())

  user          User?     @relation(fields: [userId], references: [id])
  logEntries    LogEntry[]
  plannedExercises PlannedExercise[]

  // 改为中间表关联
  primaryMuscles   ExerciseMuscle[] @relation("ExercisePrimaryMuscles")
  secondaryMuscles ExerciseMuscle[] @relation("ExerciseSecondaryMuscles")
}
```

---

## 五、RecoveryStatus 调整

### 5.1 muscleStatus Json 结构

```typescript
// muscleStatus 结构（按 muscle.code 存储）
{
  "CHEST_UPPER": 80,    // 上胸恢复状态 0-100
  "CHEST_MIDDLE": 75,
  "CHEST_LOWER": 70,
  "DELTS_FRONT": 60,
  "BICEPS": 90
}
```

### 5.2 计算逻辑

```
训练完成时：
1. 读取 LogEntry.muscleVolumes（动作主辅肌群容量）
2. 对每个参与的肌肉：
   - 获取 Muscle.recoveryHours（基础恢复时间）
   - 计算实际恢复时间 = recoveryHours × (实际容量 / 标准容量)
   - 更新 muscleStatus[m] = max(0, 100 - 恢复进度百分比)

每日凌晨恢复：
- 对每个肌肉：muscleStatus[m] = min(100, muscleStatus[m] + 恢复增量)
- 恢复增量 = (24 / recoveryHours) × 100 × 调整系数
```

---

## 六、free-exercise-db 肌肉映射表

### 6.1 映射规则

```typescript
const MUSCLE_MAPPING: Record<string, { code: string; ratio: number }[]> = {
  // 胸部 → 拆分为上/中/下胸
  'chest': [
    { code: 'CHEST_UPPER', ratio: 0.4 },
    { code: 'CHEST_MIDDLE', ratio: 0.3 },
    { code: 'CHEST_LOWER', ratio: 0.3 },
  ],

  // 肩部 → 前/中/后束
  'shoulders': [
    { code: 'DELTS_FRONT', ratio: 0.4 },
    { code: 'DELTS_MIDDLE', ratio: 0.3 },
    { code: 'DELTS_REAR', ratio: 0.3 },
  ],

  // 背部
  'lats': [{ code: 'LATS', ratio: 1.0 }],
  'traps': [{ code: 'TRAPS', ratio: 1.0 }],
  'lower back': [{ code: 'LOWER_BACK', ratio: 1.0 }],
  'middle back': [{ code: 'RHOMBOID', ratio: 1.0 }],

  // 腿部
  'quadriceps': [{ code: 'QUADS', ratio: 1.0 }],
  'hamstrings': [{ code: 'HAMSTRINGS', ratio: 1.0 }],
  'glutes': [{ code: 'GLUTES', ratio: 1.0 }],
  'calves': [{ code: 'CALVES', ratio: 1.0 }],
  'abductors': [{ code: 'ABDUCTORS', ratio: 1.0 }],
  'adductors': [{ code: 'ADDUCTORS', ratio: 1.0 }],

  // 手臂
  'biceps': [{ code: 'BICEPS', ratio: 1.0 }],
  'triceps': [{ code: 'TRICEPS', ratio: 1.0 }],
  'forearms': [{ code: 'FOREARMS', ratio: 1.0 }],

  // 核心
  'abdominals': [
    { code: 'ABS_UPPER', ratio: 0.5 },
    { code: 'ABS_LOWER', ratio: 0.5 },
  ],

  // 未知/未覆盖 → AI 辅助判断
}
```

### 6.2 边缘情况处理

- 对于 free-exercise-db 中没有直接对应的肌肉（如 `"rotator"`）
- 优先查 `aliases` 别名表匹配
- 匹配失败时记录到待处理列表，由 AI 辅助判断或人工处理

---

## 七、Muscle 种子数据

### 7.1 初始数据

约 35 个肌肉部位，包含：
- 6 个顶级部位（CHEST/BACK/LEGS/SHOULDERS/ARMS/CORE）
- ~29 个细分部位

### 7.2 存储位置

```json
// backend/src/seeds/muscles.json
[
  {
    "code": "CHEST",
    "name": "胸部",
    "aliases": ["chest", "pectorals"],
    "category": "CHEST",
    "parentCode": null,
    "recoveryHours": 72
  },
  {
    "code": "CHEST_UPPER",
    "name": "上胸",
    "aliases": ["upper chest", "upper pecs", "upper pectorals"],
    "category": "CHEST",
    "parentCode": "CHEST",
    "recoveryHours": 72
  },
  ...
]
```

---

## 八、实现里程碑

- [ ] M1: 创建 Muscle 模型和种子数据
- [ ] M2: 创建 ExerciseMuscle 中间表
- [ ] M3: 调整 Exercise 模型（移除 Json 字段）
- [ ] M4: 迁移现有动作数据到新结构
- [ ] M5: 更新 RecoveryStatus 计算逻辑
- [ ] M6: 调整 free-exercise-db 导入脚本
- [ ] M7: 更新前端动作库页面

---

## 九、Exercise 模型调整

### 9.1 Prisma Schema

```prisma
model Exercise {
  id            String   @id @default(uuid())
  name          String
  nameEn        String?
  category      ExerciseCategory
  equipment     Equipment
  instructions  String?
  instructionsZh String?  // AI 翻译后的中文说明
  commonMistakes String?  // AI 生成的易错点
  warnings      String?   // AI 生成的注意事项
  videoUrl      String?
  isCustom      Boolean  @default(false)
  isFavorite    Boolean  @default(false)
  userId        String?
  createdAt     DateTime @default(now())

  user          User?     @relation(fields: [userId], references: [id])
  logEntries    LogEntry[]
  plannedExercises PlannedExercise[]

  primaryMuscles   ExerciseMuscle[] @relation("ExercisePrimaryMuscles")
  secondaryMuscles ExerciseMuscle[] @relation("ExerciseSecondaryMuscles")
}
```

### 9.2 新增字段说明

| 字段 | 来源 | 说明 |
|------|------|------|
| name | AI 翻译 | 中文动作名称 |
| nameEn | free-exercise-db | 英文原名 |
| instructions | free-exercise-db | 英文动作步骤 |
| instructionsZh | AI 翻译 | 中文动作步骤 |
| commonMistakes | AI 生成 | 易错点 |
| warnings | AI 生成 | 注意事项 |

---

## 十、动作导入流程

### 10.1 整体流程

```
free-exercise-db (800+ 动作)
        ↓
1. 过滤：只保留 strength/cardio/stretching 等有效分类
        ↓
2. 肌肉映射：primaryMuscles/secondaryMuscles → Muscle.code
           （查别名表 + 预设比例）
        ↓
3. AI 增强：分批翻译（中译）+ 生成 warnings/mistakes
           （8 批 × 100 动作，并发处理）
        ↓
4. 写入 Exercise + ExerciseMuscle 中间表
        ↓
5. 导入完成
```

### 10.2 AI 增强策略

**分批并发处理**：
```
每批 10 个动作，共 80 批，同时并发执行（建议并发数 5-10）

输入（每批）：
{
  "exercises": [
    {
      "nameEn": "Barbell Bench Press",
      "primaryMuscles": ["CHEST_UPPER", "CHEST_MIDDLE", "CHEST_LOWER"],
      "secondaryMuscles": ["DELTS_FRONT", "TRICEPS"],
      "instructions": "Step 1...\nStep 2...\n..."
    },
    // ... 共 10 个动作
  ]
}

输出（每批）：
{
  "exercises": [
    {
      "name": "杠铃卧推",
      "instructionsZh": "1. 平躺在卧推凳上...\n2. 双手握杠...\n...",
      "warnings": ["不要过度拱腰", "下降速度要控制"],
      "mistakes": ["握距过宽", "肩部前伸过多"]
    },
    // ... 共 10 个结果
  ]
}
```

### 10.3 肌肉映射表

```typescript
const MUSCLE_MAPPING: Record<string, { code: string; ratio: number }[]> = {
  // 胸部 → 上/中/下胸
  'chest': [
    { code: 'CHEST_UPPER', ratio: 0.4 },
    { code: 'CHEST_MIDDLE', ratio: 0.3 },
    { code: 'CHEST_LOWER', ratio: 0.3 },
  ],

  // 肩部 → 前/中/后束
  'shoulders': [
    { code: 'DELTS_FRONT', ratio: 0.4 },
    { code: 'DELTS_MIDDLE', ratio: 0.3 },
    { code: 'DELTS_REAR', ratio: 0.3 },
  ],

  // 背部
  'lats': [{ code: 'LATS', ratio: 1.0 }],
  'traps': [{ code: 'TRAPS', ratio: 1.0 }],
  'lower back': [{ code: 'LOWER_BACK', ratio: 1.0 }],
  'middle back': [{ code: 'RHOMBOID', ratio: 1.0 }],

  // 腿部
  'quadriceps': [{ code: 'QUADS', ratio: 1.0 }],
  'hamstrings': [{ code: 'HAMSTRINGS', ratio: 1.0 }],
  'glutes': [{ code: 'GLUTES', ratio: 1.0 }],
  'calves': [{ code: 'CALVES', ratio: 1.0 }],
  'abductors': [{ code: 'ABDUCTORS', ratio: 1.0 }],
  'adductors': [{ code: 'ADDUCTORS', ratio: 1.0 }],

  // 手臂
  'biceps': [{ code: 'BICEPS', ratio: 1.0 }],
  'triceps': [{ code: 'TRICEPS', ratio: 1.0 }],
  'forearms': [{ code: 'FOREARMS', ratio: 1.0 }],

  // 核心
  'abdominals': [
    { code: 'ABS_UPPER', ratio: 0.5 },
    { code: 'ABS_LOWER', ratio: 0.5 },
  ],

  // 未知 → AI 辅助判断或跳过
}
```

### 10.4 边缘情况处理

| 情况 | 处理方式 |
|------|----------|
| free-exercise-db 肌肉无映射 | 记录到 `unmapped-muscles.json`，AI 辅助判断 |
| AI 返回过短或解析失败 | 重试 3 次，标记待人工审核 |
| 动作已存在（重复） | 跳过，计入报告 |

---

## 十一、实现里程碑

- [ ] M1: 创建 Muscle 模型和种子数据
- [ ] M2: 创建 ExerciseMuscle 中间表
- [ ] M3: 调整 Exercise 模型（新增字段）
- [ ] M4: 创建肌肉映射表（aliases + mapping）
- [ ] M5: 编写动作导入脚本（过滤 → 映射 → AI 增强 → 写入）
- [ ] M6: 执行导入，验证数据质量
- [ ] M7: 更新前端动作库页面（如需）

---

## 十二、风险与注意事项

1. **数据迁移**：现有 Exercise 数据需要迁移到新结构
2. **前端适配**：动作库页面需要适配新的肌肉关联查询方式
3. **恢复计算公式**：需要根据实际训练数据调参
4. **别名覆盖度**：free-exercise-db 可能有边缘肌肉名称未覆盖
5. **AI 调用量**：800 动作分 8 批并发，单次成本约 $0.5-2
