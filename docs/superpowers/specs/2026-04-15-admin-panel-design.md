# 后台运营端设计方案

## 1. 概述

**目标：** 建立独立的运营端前端，与小程序后台共用，复用现有数据库和后端服务。

**范围：**
- 用户+内容管理（用户列表、动作库、训练计划模板）
- 数据统计（基础看板、训练数据）
- 内容运营（推送模板、定时任务、发送记录）

## 2. 技术选型

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Ant Design 5 + TypeScript |
| 后端路由 | Koa (现有) + 新增 /admin/* 路由 |
| 认证 | 独立 JWT，admin role 区分 |
| 部署 | 子路径 `/admin/` |

## 3. 项目结构

```
aiji/
├── admin/                    # 新建: React 运营端
│   ├── src/
│   │   ├── pages/           # 页面
│   │   ├── components/      # 通用组件
│   │   ├── services/       # API 调用
│   │   ├── stores/         # 状态管理
│   │   ├── types/          # TypeScript 类型
│   │   └── utils/          # 工具函数
│   └── package.json
├── backend/                  # 现有: Koa 后端
│   └── src/
│       ├── routes/admin/    # 新增: admin 路由
│       ├── controllers/admin/ # 新增
│       └── services/admin/  # 新增
└── front/                   # 现有: uni-app 小程序
```

## 4. 数据模型扩展

### 4.1 User 表扩展

```prisma
model User {
  // ... 现有字段
  role         UserRole  @default(USER)
}

enum UserRole {
  USER    // 普通用户
  ADMIN   // 运营管理员
}
```

### 4.2 Admin 操作日志表

```prisma
model AdminLog {
  id        String   @id @default(uuid())
  adminId   String
  action    String   // "UPDATE_USER", "DELETE_EXERCISE"
  target    String   // 资源 ID
  detail    Json?    // 变更详情
  createdAt DateTime @default(now())
}
```

## 5. 后端 API 设计

### 5.1 认证模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /admin/api/auth/login | 管理员登录 |
| POST | /admin/api/auth/logout | 登出 |
| GET | /admin/api/auth/profile | 当前管理员信息 |

### 5.2 用户管理模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/api/users | 用户列表（分页+筛选） |
| GET | /admin/api/users/:id | 用户详情 |
| PUT | /admin/api/users/:id | 更新用户 |
| PUT | /admin/api/users/:id/disable | 禁用/启用用户 |

### 5.3 动作库模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/api/exercises | 动作列表 |
| GET | /admin/api/exercises/:id | 动作详情 |
| POST | /admin/api/exercises | 创建动作 |
| PUT | /admin/api/exercises/:id | 更新动作 |
| DELETE | /admin/api/exercises/:id | 删除动作 |

### 5.4 训练计划模板模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/api/plans | 模板列表 |
| GET | /admin/api/plans/:id | 模板详情 |
| POST | /admin/api/plans | 创建模板 |
| PUT | /admin/api/plans/:id | 更新模板 |
| DELETE | /admin/api/plans/:id | 删除模板 |

### 5.5 数据统计模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/api/stats/overview | 概览数据（用户数、今日训练、活跃用户） |
| GET | /admin/api/stats/users | 用户增长趋势（支持日期范围） |
| GET | /admin/api/stats/training | 训练数据统计（训练次数、容量、热门动作） |

### 5.6 推送运营模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/api/push/templates | 模板列表 |
| POST | /admin/api/push/templates | 创建模板 |
| PUT | /admin/api/push/templates/:id | 更新模板 |
| DELETE | /admin/api/push/templates/:id | 删除模板 |
| GET | /admin/api/push/tasks | 定时任务列表 |
| POST | /admin/api/push/tasks | 创建定时任务 |
| PUT | /admin/api/push/tasks/:id | 更新定时任务 |
| DELETE | /admin/api/push/tasks/:id | 删除定时任务 |
| POST | /admin/api/push/send | 立即发送 |
| GET | /admin/api/push/records | 发送记录 |

## 6. 运营端前端页面

### 6.1 页面结构

```
/admin/login                 # 登录页
/admin/dashboard             # 首页看板
/admin/users                 # 用户管理
  └── /admin/users/:id       # 用户详情
/admin/exercises            # 动作库
  └── /admin/exercises/:id   # 动作编辑
/admin/plans                # 训练计划模板
  └── /admin/plans/:id      # 模板详情/编辑
/admin/push                 # 推送运营
  ├── /admin/push/templates # 模板管理
  ├── /admin/push/tasks     # 定时任务
  └── /admin/push/records   # 发送记录
/admin/settings             # 系统设置
```

### 6.2 看板页面

- 用户统计卡片（总用户、今日新增、活跃用户）
- 训练数据卡片（今日训练次数、总容量）
- 待处理事项（待审核内容、异常数据）

## 7. 部署方案

### 7.1 构建产物

- `admin/` 构建后放入 `backend/public/admin/`
- Nginx 配置子路径转发

### 7.2 代理配置

```
/admin/*        -> React static files (index.html)
/admin/api/*    -> Koa /admin/api/*
```

## 8. 安全考虑

- Admin JWT token 独立于用户 token
- 后端 middleware 验证 `role === ADMIN`
- 所有操作记录 AdminLog
- 敏感操作（如删除）需二次确认

## 9. 实现顺序

1. 后端：admin 路由基础架构 + 认证
2. 后端：用户管理 API
3. 后端：动作库 API
4. 后端：数据统计 API
5. 后端：推送运营 API
6. 前端：项目搭建 + 登录 + 看板
7. 前端：用户管理页面
8. 前端：动作库页面
9. 前端：训练计划页面
10. 前端：推送运营页面
