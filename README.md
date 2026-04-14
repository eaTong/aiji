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

### 环境要求

- **MySQL**: >= 8.0
- **数据库名称**: `aiji` (可在 .env 中配置)

### 1. MySQL 安装与配置

**macOS (使用 Homebrew)**

```bash
brew install mysql
brew services start mysql
mysql_secure_installation
```

**Ubuntu/Debian**

```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql_secure_installation
```

**Windows**

下载 MySQL Installer: https://dev.mysql.com/downloads/installer/

### 2. 创建数据库

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE aiji CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 验证
SHOW DATABASES;
```

### 3. 数据库配置

在 `backend/.env` 中配置数据库连接：

```env
DATABASE_URL="mysql://user:password@localhost:3306/aiji"
```

格式说明：
```
mysql://用户名:密码@主机地址:端口号/数据库名
```

### 4. Prisma 数据模型

#### 核心模型

| 模型 | 说明 | 主要字段 |
|------|------|----------|
| **User** | 用户档案 | openid, nickname, goal, level, equipment |
| **WeightRecord** | 体重记录 | userId, weight, recordedAt |
| **MeasurementRecord** | 围度记录 | userId, chest, waist, hip, arms, thighs |
| **Exercise** | 动作库 | name, muscle, equipment, difficulty |
| **TrainingLog** | 训练日志 | userId, date, notes |
| **LogEntry** | 训练动作明细 | exerciseId, sets, reps, weight |
| **RecoveryStatus** | 肌群恢复状态 | userId, muscle, score |
| **WorkoutPlan** | 训练计划 | userId, name, startDate |
| **PlanDay** | 计划日 | planId, dayOfWeek, trainingType |
| **ChatMessage** | 聊天消息 | userId, role, type, content |
| **ChatSession** | 会话 | userId, status, context |
| **PushQueue** | 推送队列 | userId, type, isRead |
| **Achievement** | 成就 | userId, type, unlockedAt |

#### 枚举类型

```prisma
// 用户目标
enum Goal {
  LOSE_FAT      // 减脂
  GAIN_MUSCLE   // 增肌
  BODY_SHAPE    // 塑形
  IMPROVE_FITNESS // 提升体能
}

// 用户等级
enum Level {
  BEGINNER      // 初学者
  INTERMEDIATE  // 中级
  ADVANCED      // 高级
}

// 器材类型
enum Equipment {
  GYM          // 健身房
  DUMBBELL     // 哑铃
  BODYWEIGHT   // 自重
}

// 训练类型
enum TrainingType {
  PUSH         // 推
  PULL         // 拉
  LEGS         // 腿
  UPPER        // 上身
  LOWER        // 下身
  FULL_BODY    // 全身
}

// 阶段
enum Phase {
  MAINTAIN     // 维持
  CUT          // 减脂期
  BULK         // 增肌期
}
```

### 5. Prisma 工作流程

#### 初始化新项目

```bash
cd backend

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 中的 DATABASE_URL

# 3. 生成 Prisma Client
npm run prisma:generate

# 4. 创建数据库迁移
npm run prisma:migrate

# 5. （可选）填充种子数据
npm run db:seed
```

#### 日常开发

```bash
# 启动开发服务器（自动处理迁移）
npm run dev

# 或分步操作
npm run prisma:generate   # 同步 schema 变更
npm run prisma:migrate     # 执行迁移
npm run db:seed           # 填充测试数据
npm run db:studio         # 打开 Prisma Studio 可视化管理
```

#### 修改数据模型

```bash
# 1. 编辑 prisma/schema.prisma

# 2. 创建迁移
npm run prisma:migrate -- --name 描述迁移名称

# 3. 推送变更到数据库（开发环境）
npx prisma db push

# 4. 重新生成 Client
npm run prisma:generate
```

#### 重置数据库

```bash
# 重置迁移（会删除所有数据）
npm run prisma:migrate:reset

# 仅删除并重建
npx prisma migrate drop
npm run prisma:migrate
```

### 6. Prisma 命令参考

| 命令 | 说明 |
|------|------|
| `npm run prisma:generate` | 生成 Prisma Client |
| `npm run prisma:migrate` | 执行数据库迁移 |
| `npm run prisma:migrate -- --name xxx` | 创建新迁移 |
| `npm run prisma:migrate:reset` | 重置数据库 |
| `npm run prisma:migrate:dev` | 开发模式迁移（创建迁移 + 执行） |
| `npx prisma db push` | 推送 schema 到数据库（不创建迁移文件） |
| `npx prisma db pull` | 从数据库拉取 schema |
| `npm run db:seed` | 填充种子数据 |
| `npm run db:studio` | 打开 Prisma Studio |
| `npx prisma db execute` | 执行 SQL |

### 7. Prisma Studio 可视化

启动 Prisma Studio 查看和管理数据库数据：

```bash
npm run db:studio
```

浏览器访问 http://localhost:5555

### 8. 常见问题

**Q: 迁移失败怎么办？**

```bash
# 查看迁移状态
npx prisma migrate status

# 重置到指定迁移
npx prisma migrate resolve --rolled-back "20240101000000_init"
```

**Q: 如何查看生成的 SQL？**

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel
```

**Q: 如何在代码中使用 Prisma Client？**

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 查询
const users = await prisma.user.findMany()

// 创建
const user = await prisma.user.create({
  data: { openid: 'xxx', nickname: 'xxx' }
})

// 更新
await prisma.user.update({
  where: { id: 'xxx' },
  data: { nickname: 'yyy' }
})

// 删除
await prisma.user.delete({ where: { id: 'xxx' } })
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