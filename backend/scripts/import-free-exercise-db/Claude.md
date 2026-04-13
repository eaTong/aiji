# free-exercise-db 数据导入脚本

## 功能

将 free-exercise-db（800+动作，Public Domain）数据导入AI己项目。

## 处理流程

1. **下载数据** - 从 GitHub 下载 free-exercise-db 原始数据
2. **字段转换** - 中英映射、分类映射、肌肉映射
3. **AI增强** - 中文说明、注意事项、易错点
4. **上传OSS** - 图片上传至阿里云OSS
5. **输出结果** - 生成最终导入数据

## 使用方法

```bash
cd backend/scripts/import-free-exercise-db
npm install
npm run import
```

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| OSS_REGION | OSS区域 | ✅ |
| OSS_ACCESS_KEY_ID | AccessKey ID | ✅ |
| OSS_ACCESS_KEY_SECRET | AccessKey Secret | ✅ |
| OSS_BUCKET | OSS Bucket名称 | ✅ |

## 目录结构

```
.
├── data/                      # 原始数据
│   ├── exercises.json         # 动作数据
│   └── images/                 # 临时图片目录
├── output/                    # 输出目录
│   ├── exercises-processed.json  # 最终处理数据
│   └── images-urls.json       # OSS图片URL映射
├── src/
│   ├── types.ts               # 类型定义
│   ├── downloader.ts         # 下载数据
│   ├── transformer.ts         # 数据转换
│   ├── aiEnricher.ts          # AI增强
│   ├── uploader.ts            # OSS上传
│   └── index.ts               # 入口
└── exercises/                 # 工作目录（中间产物）
```

## 输出格式

生成 `output/exercises-processed.json`，包含处理后的动作数据，可直接用于批量导入。

## 注意事项

- AI增强使用网络搜索，需确保网络通畅
- 图片上传前会记录本地路径，上传成功后可清理临时文件
- 并发控制：图片上传5个一组，动作处理5个一组
