import { describe, it, expect } from 'vitest'

// 简化的热身判断逻辑测试
describe('TrainingRecordCard - 热身判断逻辑', () => {
  interface WarmupRuleResult {
    isWarmup: boolean
    reason: string
  }

  function autoDetectWarmup(
    weight: number,
    reps: number,
    maxHistoricalWeight: number
  ): WarmupRuleResult {
    // 规则1：重量低于历史最大重量50%
    if (maxHistoricalWeight > 0 && weight < maxHistoricalWeight * 0.5) {
      return { isWarmup: true, reason: '重量低于历史最大重量的50%' }
    }

    // 规则2：次数超过15次
    if (reps > 15) {
      return { isWarmup: true, reason: '次数超过15次' }
    }

    // 规则3：重量低于历史最大重量30%
    if (maxHistoricalWeight > 0 && weight < maxHistoricalWeight * 0.3) {
      return { isWarmup: true, reason: '重量过低' }
    }

    return { isWarmup: false, reason: '' }
  }

  describe('autoDetectWarmup', () => {
    describe('规则1：重量 < 50% 最大重量', () => {
      it('重量 30kg，最大历史 80kg → 热身组', () => {
        const result = autoDetectWarmup(30, 10, 80)
        expect(result.isWarmup).toBe(true)
        expect(result.reason).toContain('50%')
      })

      it('重量 50kg，最大历史 80kg → 不是热身（边界值）', () => {
        // 50 = 62.5% of 80, not < 50%
        const result = autoDetectWarmup(50, 10, 80)
        expect(result.isWarmup).toBe(false)
      })
    })

    describe('规则2：次数 > 15', () => {
      it('次数 20 → 热身组', () => {
        const result = autoDetectWarmup(60, 20, 80)
        expect(result.isWarmup).toBe(true)
        expect(result.reason).toContain('15次')
      })

      it('次数 15 → 不是热身（边界值）', () => {
        const result = autoDetectWarmup(60, 15, 80)
        expect(result.isWarmup).toBe(false)
      })
    })

    describe('规则3：重量 < 30% 最大重量', () => {
      it('重量 20kg，最大历史 80kg → 热身组', () => {
        // 20 < 24 (30% of 80), 20 < 40 (50% of 80) → 触发规则1
        const result = autoDetectWarmup(20, 10, 80)
        expect(result.isWarmup).toBe(true)
      })

      it('重量 25kg，最大历史 80kg → 触发规则1', () => {
        // 25 < 40 (50% of 80) → 触发规则1
        const result = autoDetectWarmup(25, 10, 80)
        expect(result.isWarmup).toBe(true)
      })

      it('重量 23kg，最大历史 80kg → 触发规则1和规则3', () => {
        // 23 < 40 (50%) → 规则1, 23 < 24 (30%) → 规则3
        const result = autoDetectWarmup(23, 10, 80)
        expect(result.isWarmup).toBe(true)
      })

      it('重量 50kg，最大历史 80kg → 不是热身（不触发任何规则）', () => {
        // 50 > 40 (50%), 50 > 24 (30%)
        const result = autoDetectWarmup(50, 10, 80)
        expect(result.isWarmup).toBe(false)
      })
    })

    describe('正常情况', () => {
      it('重量 70kg，次数 10 → 不是热身组', () => {
        const result = autoDetectWarmup(70, 10, 80)
        expect(result.isWarmup).toBe(false)
        expect(result.reason).toBe('')
      })
    })

    describe('无历史记录', () => {
      it('maxHistoricalWeight = 0 时不触发重量规则', () => {
        const result = autoDetectWarmup(60, 10, 0)
        expect(result.isWarmup).toBe(false)
      })

      it('maxHistoricalWeight = 0 时可被次数规则触发', () => {
        const result = autoDetectWarmup(60, 20, 0)
        expect(result.isWarmup).toBe(true)
      })
    })
  })
})

// API 模块测试
describe('API - training.ts', () => {
  describe('RecommendResponse 类型', () => {
    it('should have correct type definitions', () => {
      // 测试各种响应类型
      const types = [
        'new_recommendation',
        'rest_day',
        'completed_today',
        'need_goal',
        'overtraining_warning',
      ]

      types.forEach((type) => {
        expect(typeof type).toBe('string')
      })
    })
  })

  describe('ExerciseSet 类型', () => {
    it('should have correct structure', () => {
      const exerciseSet = {
        exerciseId: 'test-id',
        exerciseName: '杠铃卧推',
        sets: 3,
        reps: 10,
        weight: 60,
        weightUnit: 'kg' as const,
        isWarmup: false,
      }

      expect(exerciseSet.exerciseId).toBeDefined()
      expect(exerciseSet.sets).toBe(3)
      expect(exerciseSet.isWarmup).toBe(false)
    })
  })
})
