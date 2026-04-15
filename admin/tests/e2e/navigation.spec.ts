import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('用户名').fill('admin')
    await page.getByLabel('密码').fill('admin123')
    await page.getByRole('button', { name: '登录' }).click()
  })

  test('should navigate to all pages via sidebar', async ({ page }) => {
    const menuItems = [
      { label: '看板', path: '/dashboard' },
      { label: '用户管理', path: '/users' },
      { label: '动作库', path: '/exercises' },
      { label: '计划模板', path: '/plans' },
      { label: '知识库', path: '/knowledge' },
      { label: '推送运营', path: '/push' },
      { label: '设置', path: '/settings' },
    ]

    for (const item of menuItems) {
      await page.getByText(item.label, { exact: true }).click()
      await expect(page).toHaveURL(item.path)
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
