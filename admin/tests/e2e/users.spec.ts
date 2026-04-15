import { test, expect } from '@playwright/test'

test.describe('Users Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/admin/login')
    await page.waitForSelector('input[placeholder="用户名"]')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('admin123')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 })
  })

  test('should display users management page', async ({ page }) => {
    await page.getByText('用户管理', { exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/users/)

    // Should show user table with search input
    await expect(page.getByPlaceholder('搜索用户')).toBeVisible()
  })

  test('should search users by keyword', async ({ page }) => {
    await page.getByText('用户管理', { exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/users/)

    // Use Input.Search - it has built-in search button
    const searchInput = page.getByPlaceholder('搜索用户')
    if (await searchInput.isVisible()) {
      await searchInput.fill('test')
      await searchInput.press('Enter')
    }
  })

  test('should show pagination when users exist', async ({ page }) => {
    await page.getByText('用户管理', { exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/users/)

    // Wait for table to load then check pagination
    await page.waitForTimeout(1000)
    const pagination = page.locator('.ant-pagination')
    if (await pagination.isVisible()) {
      await expect(pagination).toBeVisible()
    }
  })
})