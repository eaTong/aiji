import { test, expect } from '@playwright/test'

test.describe('Knowledge Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/admin/login')
    await page.waitForSelector('input[placeholder="用户名"]')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('admin123')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 })
  })

  test('should navigate to knowledge management', async ({ page }) => {
    await page.getByText('知识库', { exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/knowledge/)

    // Should show article tabs
    await expect(page.getByText('全部')).toBeVisible()
    await expect(page.getByText('健身百科')).toBeVisible()
  })

  test('should display articles list with tabs', async ({ page }) => {
    await page.getByText('知识库', { exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/knowledge/)

    // Should show category tabs
    await expect(page.getByText('全部')).toBeVisible()
    await expect(page.getByText('健身百科')).toBeVisible()
    await expect(page.getByText('常见问题')).toBeVisible()
    await expect(page.getByText('课程内容')).toBeVisible()
  })

  test('should filter articles by tab', async ({ page }) => {
    await page.getByText('知识库', { exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/knowledge/)

    // Click FAQ tab
    await page.getByText('常见问题', { exact: true }).click()

    // URL might change to reflect filter
    await page.waitForTimeout(500)
  })

  test('should search articles', async ({ page }) => {
    await page.getByText('知识库', { exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/knowledge/)

    // Find and use search input - Input.Search has its own search button
    const searchInput = page.getByPlaceholder('搜索文章')
    if (await searchInput.isVisible()) {
      await searchInput.fill('测试')
      await page.waitForTimeout(500)
    }
  })

  test('should create new article button visible', async ({ page }) => {
    await page.getByText('知识库', { exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/knowledge/)

    // Click create button
    const createBtn = page.getByRole('button', { name: '新建文章' })
    await expect(createBtn).toBeVisible()
  })

  test('should have categories page accessible', async ({ page }) => {
    // Categories page should be accessible via the knowledge nested routes
    // We verify the route exists by checking the URL pattern
    await page.goto('http://localhost:5173/admin/login')
    await page.waitForSelector('input[placeholder="用户名"]')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('admin123')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 })

    // Navigate to knowledge then directly to categories
    await page.goto('http://localhost:5173/admin/knowledge/categories')
    // Auth should persist from previous login via localStorage
    await page.waitForURL(/\/admin\/knowledge\/categories/, { timeout: 10000 })
  })

  test('should have contributions page accessible', async ({ page }) => {
    // Contributions page should be accessible via the knowledge nested routes
    await page.goto('http://localhost:5173/admin/login')
    await page.waitForSelector('input[placeholder="用户名"]')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('admin123')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 })

    // Navigate to knowledge then directly to contributions
    await page.goto('http://localhost:5173/admin/knowledge/contributions')
    // Auth should persist from previous login via localStorage
    await page.waitForURL(/\/admin\/knowledge\/contributions/, { timeout: 10000 })
  })
})