# AI己 Backend

AI己微信小程序的Node.js后端服务

## 技术栈

- **运行时**: Node.js 18+
- **框架**: Koa + TypeScript
- **ORM**: Prisma
- **数据库**: MySQL 8.0
- **认证**: JWT + 微信登录

## 环境配置

在 `.env` 文件中配置以下环境变量：

```env
DATABASE_URL="mysql://用户:密码@localhost:3306/aiji"
JWT_SECRET="your-jwt-secret-min-32-chars"
JWT_EXPIRES_IN="7d"
WX_APPID=你的微信AppID
WX_SECRET=你的微信Secret
PORT=3000
```

**注意**: 如果密码包含特殊字符（如 `@`），需要URL编码。例如 `eaTong@123.com` 应写为 `eaTong%40123.com`

## 数据库初始化

### 1. 创建数据库

首先在MySQL中创建数据库：

```sql
CREATE DATABASE aiji CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 运行迁移

```bash
# 开发环境 - 创建并应用迁移
npm run db:setup

# 或分步执行
npm run prisma:generate   # 生成Prisma Client
npm run prisma:migrate    # 执行数据库迁移

# 重置数据库（会清空所有数据）
npm run prisma:migrate:reset

# 生产环境
npm run prisma:deploy
```

### 3. 查看数据库（可选）

```bash
npm run db:studio
```

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式启动
npm run dev

# 构建生产版本
npm run build

# 运行测试
npm test

# 测试监听模式
npm run test:watch
```

## API接口

服务启动后访问 `http://localhost:3000`

### 主要接口

| 模块 | 路径 | 说明 |
|------|------|------|
| 认证 | `/api/auth/*` | 微信登录、JWT认证 |
| 用户 | `/api/users/*` | 用户信息管理 |
| 身体数据 | `/api/body-data/*` | 体重、围度、照片记录 |
| 训练 | `/api/training-logs/*` | 训练日志 |
| 动作库 | `/api/exercises/*` | 动作管理 |
| 恢复状态 | `/api/recovery/*` | 恢复状态计算 |
| 训练计划 | `/api/workout-plans/*` | 训练计划 |

## 数据库模型

- `User` - 用户信息
- `WeightRecord` - 体重记录
- `MeasurementRecord` - 围度记录
- `ProgressPhoto` - 进度照片
- `Exercise` - 动作库
- `TrainingLog` - 训练日志
- `LogEntry` - 训练记录明细
- `RecoveryStatus` - 恢复状态
- `WorkoutPlan` - 训练计划
- `PlanDay` - 计划日程
- `PlannedExercise` - 计划动作

## License

ISC
