/**
 * 数据库迁移脚本
 * 使用 prisma db execute 执行 SQL
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Achievement 表 SQL
const createAchievementTable = `
CREATE TABLE IF NOT EXISTS \`Achievement\` (
  \`id\` VARCHAR(191) NOT NULL DEFAULT (UUID()),
  \`userId\` VARCHAR(191) NOT NULL,
  \`type\` VARCHAR(191) NOT NULL,
  \`name\` VARCHAR(191) NOT NULL,
  \`description\` TEXT,
  \`icon\` VARCHAR(191),
  \`unlockedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`Achievement_userId_type_key\` (\`userId\`, \`type\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`

// 添加 User.achievements 关系（通过外键）
const addAchievementRelation = `
ALTER TABLE \`Achievement\` ADD CONSTRAINT \`Achievement_userId_fkey\`
FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE;
`

async function migrate() {
  console.log('开始数据库迁移...')

  try {
    // 检查 Achievement 表是否已存在
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Achievement'
    `

    if (tables.length > 0) {
      console.log('Achievement 表已存在，跳过创建')
    } else {
      console.log('创建 Achievement 表...')
      await prisma.$executeRawUnsafe(createAchievementTable)
      console.log('Achievement 表创建成功')
    }

    // 验证表结构
    const columns = await prisma.$queryRaw`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Achievement'
    `
    console.log('Achievement 表结构:', columns)

    console.log('迁移完成!')
  } catch (error) {
    console.error('迁移失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrate()
