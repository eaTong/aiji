import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/admin/login')
    await page.waitForSelector('input[placeholder="用户名"]')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('admin123')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 })
    // Wait for sidebar to be visible
    await page.waitForSelector('.ant-layout-sider', { timeout: 10000 })
  })

  test('should display statistics cards', async ({ page }) => {
    await expect(page.getByText('总用户数')).toBeVisible()
    await expect(page.getByText('今日新增')).toBeVisible()
    await expect(page.getByText('总训练次数')).toBeVisible()
    await expect(page.getByText('今日训练')).toBeVisible()
  })
})