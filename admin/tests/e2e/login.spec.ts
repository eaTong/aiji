import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('用户名').fill('admin')
    await page.getByLabel('密码').fill('admin123')
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('数据看板')).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('用户名').fill('admin')
    await page.getByLabel('密码').fill('wrongpassword')
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page.getByText('用户名或密码错误')).toBeVisible()
  })

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login/)
  })
})
