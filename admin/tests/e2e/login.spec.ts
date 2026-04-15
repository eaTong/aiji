import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/admin/login')
    await page.waitForSelector('input[placeholder="用户名"]')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('admin123')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 })
    // After login, should be on dashboard (body should not be empty)
    await expect(page.locator('body')).not.toHaveText('')
  })

  test('should show error with invalid credentials and stay on login', async ({ page }) => {
    await page.goto('http://localhost:5173/admin/login')
    await page.waitForSelector('input[placeholder="用户名"]')
    await page.locator('input[placeholder="用户名"]').fill('admin')
    await page.locator('input[placeholder="密码"]').fill('wrongpassword')
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(2000)
    // Should still be on login page
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto('http://localhost:5173/admin/dashboard')
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})