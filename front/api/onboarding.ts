import { request } from './request'
import { OnboardingData, OnboardingResult } from '../types'

/**
 * 提交引导问卷答案
 */
export function completeOnboarding(data: OnboardingData): Promise<OnboardingResult> {
  return request<OnboardingResult>('POST', '/api/onboarding/complete', data as unknown as Record<string, unknown>)
}

/**
 * 获取引导状态
 */
export function getOnboardingStatus(): Promise<{ hasCompletedOnboarding: boolean }> {
  return request<{ hasCompletedOnboarding: boolean }>('GET', '/api/onboarding/status')
}
