# free-exercise-db 数据导入工具

将 [free-exercise-db](https://github.com/yuhonas/free-exercise-db) 数据导入 AI己 项目。

## 前提条件

已手动下载 free-exercise-db 项目到 `free-exercise-db/` 目录：

```
free-exercise-db/
├── dist/
│   └── exercises.json    # 动作数据
├── exercises/            # 动作图片
└── ...
```

## 快速开始

### 1. 安装依赖

```bash
cd backend/scripts/import-free-exercise-db
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
# 数据库（可选，使用项目根目录的 .env）
# DATABASE_URL=mysql://...

# OSS（上传图片用）
OSS_REGION=oss-cn-beijing
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
OSS_BUCKET=你的Bucket名称
```

### 3. 一键执行

```bash
npm start
```

## 分步执行

```bash
npm run copy      # 从本地 free-exercise-db 复制数据
npm run transform # 转换数据
npm run enrich    # AI增强（耗时最长）
npm run upload    # 上传图片到OSS
npm run import    # 导入数据库
```

## 执行流程

| 步骤 | 命令 | 说明 |
|------|------|------|
| 1. 复制 | `npm run copy` | 从 `free-exercise-db/` 复制到 `data/` |
| 2. 转换 | `npm run transform` | 中英映射、分类映射、肌肉中文化 |
| 3. AI增强 | `npm run enrich` | 中文说明、注意事项、易错点 |
| 4. 上传 | `npm run upload` | 图片上传至阿里云OSS |
| 5. 导入 | `npm run import` | 数据写入数据库 |

## 目录结构

```
.
├── free-exercise-db/       # 原始数据（已下载）
│   ├── dist/exercises.json
│   └── exercises/           # 图片
├── data/                    # 中间数据
│   ├── exercises.json
│   └── images/
├── output/                  # 输出
│   ├── exercises-transformed.json
│   ├── exercises-processed.json    # 最终数据
│   └── images-urls.json
└── src/
    ├── downloader.ts   # 复制
    ├── transformer.ts # 转换
    ├── aiEnricher.ts  # AI增强
    ├── uploader.ts    # 上传OSS
    ├── importer.ts    # 导入数据库
    └── index.ts       # 入口
```

## 输出

- **文件**: `output/exercises-processed.json`
- **数据库**: `Exercise` 表（跳过已存在的记录）

## 注意事项

- AI增强使用网络搜索，处理800+动作预计30-60分钟
- 并发控制：5个一组，避免请求过快
- 数据库导入使用 `skipDuplicates: true`，跳过已存在的动作
