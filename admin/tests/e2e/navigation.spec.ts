import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/admin/login')
    await page.waitForSelector('input[placeholder="用户名"]')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('admin123')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 })
  })

  test('should navigate to all pages via sidebar', async ({ page }) => {
    const menuItems = [
      { label: '看板', path: '/admin/dashboard' },
      { label: '用户管理', path: '/admin/users' },
      { label: '动作库', path: '/admin/exercises' },
      { label: '计划模板', path: '/admin/plans' },
      { label: '知识库', path: '/admin/knowledge' },
      { label: '推送运营', path: '/admin/push' },
      { label: '设置', path: '/admin/settings' },
    ]

    for (const item of menuItems) {
      await page.getByText(item.label, { exact: true }).click()
      await expect(page).toHaveURL(new RegExp(item.path))
    }
  })

  test('should show admin avatar in header', async ({ page }) => {
    await expect(page.locator('.ant-avatar')).toBeVisible()
  })

  test('should logout via dropdown', async ({ page }) => {
    await page.locator('.ant-avatar').click()
    await page.getByText('退出登录').click()

    await expect(page).toHaveURL(/\/login/)
  })
})