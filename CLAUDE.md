# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**AI己** 是一款微信小程序，作为健身人群的全面AI助手。

## 项目结构

```
aiji/
├── docs/                         # 文档目录
│   ├── 需求/                     # 需求分析文档
│   ├── 计划/                     # 执行计划文档
│   ├── superpowers/             # Superpowers 规划文档
│   └── 技术文档/                 # 技术规格文档
├── front/                        # 前端小程序代码 (uni-app + Vue3)
└── backend/                      # 后端服务代码 (Koa + Prisma)
```

## 开发命令

### 后端 (backend/)

```bash
cd backend

# 开发
npm run dev                  # 启动开发服务器 (ts-node)

# 测试 - 测试覆盖率需达到 80%+
npm test                     # 运行所有测试
npm test -- trainingRecommend  # 运行单个测试文件

# 数据库
npm run prisma:generate     # 生成 Prisma Client
npm run prisma:migrate      # 执行数据库迁移
npm run db:setup            # 初始化数据库
npm run db:seed             # 填充种子数据
```

### 前端 (front/)

```bash
cd front

# 开发
npm run dev                  # 启动开发服务器

# 测试 - 测试覆盖率需达到 80%+
npm test                     # 运行所有测试
npm run test:watch          # 监听模式（文件变更自动运行）
npm run test:coverage       # 生成覆盖率报告
```

## 技术栈

### 后端
- **框架**: Koa + TypeScript
- **ORM**: Prisma + MySQL
- **认证**: JWT (koa-jwt)
- **测试**: Jest + Supertest

### 前端
- **框架**: uni-app + Vue 3 + TypeScript
- **状态管理**: Pinia
- **测试**: Vitest + @vue/test-utils

## 架构模式

### 后端分层
```
Controller → Service → Prisma Client
    ↓           ↓
   路由       业务逻辑
```

- **Routes** (`src/routes/`): 路由定义，参数校验
- **Controllers** (`src/controllers/`): 请求处理，调用 Service
- **Services** (`src/services/`): 业务逻辑，数据处理
- **Models** (`src/models/`): 数据模型和种子数据

### 前端分层
```
Pages → Components/API
  ↓          ↓
页面逻辑    UI组件/接口调用
```

- **Pages** (`pages/`): 页面组件
- **Components** (`components/`): 可复用组件
- **API** (`api/`): 接口请求封装
- **Stores** (`stores/`): Pinia 状态管理

## 工作流程

### 1. 需求阶段
当用户提出需求时，先进行需求拓展分析，输出需求分析结果到 `docs/需求/`。

### 2. 计划阶段
读取需求文档，进行规划：
- 完成具体页面结构
- 定义操作流程
- 定义后台接口
- 计划文档保存到 `docs/计划/`

### 3. 开发阶段（严格按顺序执行）

1. **开发后台逻辑** - Service + Controller
2. **完成后台单元测试** - 测试覆盖率 ≥ 80%
3. **开发前端界面** - 根据后台接口实现功能
4. **前端测试** - 同步编写测试，覆盖率 ≥ 80%
5. **验证** - 操作逻辑与需求规划一致

### 4. 需求修改
修改需求文档 → 确认需求文档 → 生成计划 → 根据计划执行

## 数据模型

### 核心实体
- **User**: 用户档案（目标/器材/等级）
- **Exercise**: 动作库
- **TrainingLog/LogEntry**: 训练记录
- **RecoveryStatus**: 肌群恢复状态
- **WorkoutPlan/PlanDay**: 训练计划

### 关键计算
- **E1RM** (Epley公式): `weight × (1 + reps / 30)`
- **TotalVolume**: `sum(weight × reps)` for non-warmup sets
- **MuscleRecovery**: 基于训练容量和恢复时间的动态评分

## 测试规范

### 测试文件位置
- 后端: `backend/tests/*.test.ts`
- 前端: `front/tests/**/*.test.ts`

### 测试覆盖目标
| 模块 | 覆盖率目标 |
|------|-----------|
| Services | ≥ 80% |
| Controllers | ≥ 70% |
| Utils | ≥ 90% |
| API 层 | ≥ 70% |
| Store | ≥ 70% |

### 提交前检查
- [ ] 后端测试通过 (`npm test`)
- [ ] 前端测试通过 (`npm test`)
- [ ] TypeScript 编译通过 (`tsc --noEmit`)
