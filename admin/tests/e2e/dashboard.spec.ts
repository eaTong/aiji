import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('用户名').fill('admin')
    await page.getByLabel('密码').fill('admin123')
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display statistics cards', async ({ page }) => {
    await expect(page.getByText('总用户数')).toBeVisible()
    await expect(page.getByText('今日新增')).toBeVisible()
    await expect(page.getByText('总训练次数')).toBeVisible()
    await expect(page.getByText('今日训练')).toBeVisible()
  })
})
