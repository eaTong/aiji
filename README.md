# AI己 - 健身 AI 助手小程序

> 微信小程序，为健身人群提供全面的 AI 助手服务

## 项目简介

AI己是一款微信小程序，作为健身人群的全面 AI 助手，支持：

- **智能对话** - 与 AI 健身助手自然语言对话
- **训练推荐** - 基于恢复状态的智能训练推荐
- **记录追踪** - 体重、围度、训练记录一站式管理
- **数据可视化** - 训练趋势、PR 进度一目了然
- **主动关怀** - 早安日报、过度预警、周报推送

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

## 项目结构

```
aiji/
├── docs/                         # 项目文档
│   ├── 需求/                     # 需求分析
│   ├── 计划/                     # 执行计划
│   ├── superpowers/             # Superpowers 规划
│   └── 技术文档/                 # 技术规格
├── front/                        # 前端小程序代码
└── backend/                     # 后端服务代码
    ├── prisma/                  # 数据库 schema 和迁移
    ├── src/
    │   ├── controllers/         # 控制器
    │   ├── services/              # 业务逻辑
    │   ├── routes/               # 路由定义
    │   ├── middleware/           # 中间件
    │   ├── jobs/                 # 定时任务
    │   └── types/                # 类型定义
    └── tests/                    # 测试文件
```

## 环境要求

- **Node.js**: >= 18.0.0
- **MySQL**: >= 8.0
- **npm** 或 **yarn**
- **微信开发者工具** (前端调试)

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/eaTong/aiji.git
cd aiji
```

### 2. 配置后端

```bash
cd backend

# 复制环境变量配置
cp .env.example .env
```

编辑 `.env` 文件，配置数据库和其他服务：

```env
DATABASE_URL="mysql://user:password@localhost:3306/aiji"
JWT_SECRET="your-jwt-secret-min-32-chars"
JWT_EXPIRES_IN="7d"
WX_APPID=your-wx-appid
WX_SECRET=your-wx-secret
PORT=3000
```

### 3. 安装后端依赖

```bash
npm install
```

### 4. 初始化数据库

```bash
# 生成 Prisma Client
npm run prisma:generate

# 执行数据库迁移
npm run prisma:migrate

# （可选）填充种子数据
npm run db:seed
```

### 5. 启动后端开发服务器

```bash
npm run dev
```

后端服务将在 http://localhost:3000 启动

### 6. 配置前端

```bash
cd ../front
```

编辑 `project.config.json` 或微信开发者工具中的小程序 AppID

### 7. 安装前端依赖

```bash
npm install
```

### 8. 启动前端开发服务器

```bash
npm run dev
```

使用微信开发者工具导入 `front` 目录，选择小程序项目进行开发调试。

## 开发命令

### 后端

```bash
cd backend

npm run dev              # 启动开发服务器 (ts-node)
npm run build            # 编译 TypeScript
npm test                 # 运行所有测试
npm test -- --watch     # 监听模式运行测试
npm run db:setup        # 初始化数据库
npm run db:seed         # 填充种子数据
npm run db:studio        # 打开 Prisma Studio
```

### 前端

```bash
cd front

npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm test                 # 运行测试
npm run test:watch       # 监听模式运行测试
npm run test:coverage    # 生成覆盖率报告
```

## 数据库

### 主要数据模型

- **User** - 用户档案（目标/器材/等级）
- **WeightRecord** - 体重记录
- **MeasurementRecord** - 围度记录
- **Exercise** - 动作库
- **TrainingLog/LogEntry** - 训练记录
- **RecoveryStatus** - 肌群恢复状态
- **WorkoutPlan/PlanDay** - 训练计划
- **ChatMessage** - 聊天消息
- **ChatSession** - 会话管理
- **PushQueue** - 推送队列

### Prisma 命令

```bash
npm run prisma:generate   # 生成 Prisma Client
npm run prisma:migrate   # 执行数据库迁移
npm run prisma:studio    # 打开可视化数据库管理
npm run prisma:migrate:reset  # 重置数据库
```

## 测试

### 运行测试

```bash
# 后端测试
cd backend
npm test

# 前端测试
cd front
npm test
```

### 测试覆盖率目标

| 模块 | 覆盖率目标 |
|------|-----------|
| Services | ≥ 80% |
| Controllers | ≥ 70% |
| Utils | ≥ 90% |
| API 层 | ≥ 70% |
| Store | ≥ 70% |

## API 文档

### 认证接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/login | 微信登录 |
| POST | /api/auth/register | 注册 |
| GET | /api/auth/profile | 获取用户资料 |
| PUT | /api/auth/profile | 更新用户资料 |

### 身体数据接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/body/weight | 获取体重记录 |
| POST | /api/body/weight | 记录体重 |
| GET | /api/body/measurements | 获取围度记录 |
| POST | /api/body/measurements | 记录围度 |

### 训练接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/training/recommend | 获取训练推荐 |
| GET | /api/training/logs | 获取训练记录 |
| POST | /api/training/logs | 创建训练记录 |
| GET | /api/training/plans | 获取训练计划 |

### AI 对话接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/chat/init | 获取初始化信息 |
| GET | /api/chat/messages | 获取消息列表 |
| POST | /api/chat/send | 发送消息 |
| POST | /api/chat/confirm | 确认保存记录 |
| GET | /api/chat/push | 获取未读推送 |

## 文档

更多技术文档位于 `docs/` 目录：

- [CLAUDE.md](CLAUDE.md) - Claude Code 开发指南
- [技术文档/](docs/技术文档/) - 详细技术规格
- [计划/](docs/计划/) - 项目执行计划

## License

ISC