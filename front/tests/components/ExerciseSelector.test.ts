import { describe, it, expect } from 'vitest'

// ExerciseSelector 过滤逻辑测试
describe('ExerciseSelector - 搜索过滤逻辑', () => {
  interface Exercise {
    id: string
    name: string
    nameEn?: string
    category: string
  }

  const mockExercises: Exercise[] = [
    { id: '1', name: '杠铃卧推', nameEn: 'Barbell Bench Press', category: 'CHEST' },
    { id: '2', name: '哑铃上斜卧推', nameEn: 'Dumbbell Incline Press', category: 'CHEST' },
    { id: '3', name: '引体向上', nameEn: 'Pull Up', category: 'BACK' },
    { id: '4', name: '杠铃弯举', nameEn: 'Barbell Curl', category: 'ARMS' },
    { id: '5', name: '深蹲', nameEn: 'Squat', category: 'LEGS' },
  ]

  function filterExercises(
    exercises: Exercise[],
    keyword: string,
    category: string
  ): Exercise[] {
    let result = exercises

    // 按分类过滤
    if (category) {
      result = result.filter((ex) => ex.category === category)
    }

    // 按关键词过滤（模糊匹配）
    if (keyword) {
      const kw = keyword.toLowerCase().trim()
      if (kw) {
        result = result.filter((ex) => {
          const name = ex.name.toLowerCase()
          const nameEn = (ex.nameEn || '').toLowerCase()
          return name.includes(kw) || nameEn.includes(kw)
        })
      }
    }

    return result
  }

  describe('分类筛选', () => {
    it('应返回所有分类的动作用于空分类', () => {
      const result = filterExercises(mockExercises, '', '')
      expect(result.length).toBe(5)
    })

    it('应筛选出指定分类的动作', () => {
      const result = filterExercises(mockExercises, '', 'CHEST')
      expect(result.length).toBe(2)
      expect(result.every((ex) => ex.category === 'CHEST')).toBe(true)
    })

    it('应筛选出背部动作', () => {
      const result = filterExercises(mockExercises, '', 'BACK')
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('引体向上')
    })
  })

  describe('关键词搜索', () => {
    it('应通过中文名搜索', () => {
      const result = filterExercises(mockExercises, '卧推', '')
      expect(result.length).toBe(2)
    })

    it('应通过英文名搜索', () => {
      const result = filterExercises(mockExercises, 'curl', '')
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('杠铃弯举')
    })

    it('应支持部分匹配', () => {
      const result = filterExercises(mockExercises, '杠铃', '')
      expect(result.length).toBe(2) // 杠铃卧推, 杠铃弯举
    })

    it('应忽略大小写', () => {
      const result = filterExercises(mockExercises, 'BENCH', '')
      expect(result.length).toBe(1)
    })

    it('空关键词应返回所有', () => {
      const result = filterExercises(mockExercises, '', '')
      expect(result.length).toBe(5)
    })
  })

  describe('组合筛选', () => {
    it('应同时支持分类和关键词筛选', () => {
      const result = filterExercises(mockExercises, '杠铃', 'CHEST')
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('杠铃卧推')
    })

    it('关键词不匹配分类时应返回空', () => {
      const result = filterExercises(mockExercises, '弯举', 'CHEST')
      expect(result.length).toBe(0)
    })
  })
})

// E1RM 计算测试
describe('E1RM 计算', () => {
  function calcE1RM(weight: number, reps: number): number {
    if (reps <= 0) return 0
    return Math.round(weight * (1 + reps / 30) * 10) / 10
  }

  describe('calcE1RM', () => {
    it('应使用 Epley 公式计算', () => {
      // 100kg × 10次 = 100 × (1 + 10/30) = 133.3kg
      expect(calcE1RM(100, 10)).toBeCloseTo(133.3, 1)
    })

    it('应保留1位小数', () => {
      // 80kg × 8次 = 80 × (1 + 8/30) = 101.3kg
      expect(calcE1RM(80, 8)).toBe(101.3)
    })

    it('次数为0时应返回0', () => {
      expect(calcE1RM(100, 0)).toBe(0)
    })

    it('次数为1时应返回略高于重量的值（Epley公式特性）', () => {
      // 100 * (1 + 1/30) = 103.3
      expect(calcE1RM(100, 1)).toBeCloseTo(103.3, 1)
    })

    it('大重量少次数', () => {
      // 120kg × 5次 = 120 × (1 + 5/30) = 140kg
      expect(calcE1RM(120, 5)).toBe(140)
    })

    it('小重量多次数', () => {
      // 40kg × 20次 = 40 × (1 + 20/30) = 66.7kg
      expect(calcE1RM(40, 20)).toBeCloseTo(66.7, 1)
    })
  })
})

// 训练容量计算测试
describe('训练容量计算', () => {
  function calcSetVolume(weight: number, reps: number, isWarmup: boolean): number {
    if (isWarmup) return 0
    return weight * reps
  }

  function calcTotalVolume(
    exercises: Array<{ weight: number; reps: number; sets: number; isWarmup: boolean }>
  ): number {
    return exercises.reduce((total, ex) => {
      return total + calcSetVolume(ex.weight, ex.reps, ex.isWarmup) * ex.sets
    }, 0)
  }

  describe('calcSetVolume', () => {
    it('普通组容量 = 重量 × 次数', () => {
      expect(calcSetVolume(60, 10, false)).toBe(600)
    })

    it('热身组容量 = 0', () => {
      expect(calcSetVolume(40, 10, true)).toBe(0)
    })
  })

  describe('calcTotalVolume', () => {
    it('应计算多组总容量', () => {
      const exercises = [
        { weight: 60, reps: 10, sets: 3, isWarmup: false }, // 60*10*3 = 1800
      ]
      expect(calcTotalVolume(exercises)).toBe(1800)
    })

    it('应跳过热身组', () => {
      const exercises = [
        { weight: 40, reps: 10, sets: 1, isWarmup: true },  // 跳过 = 0
        { weight: 80, reps: 10, sets: 3, isWarmup: false }, // 80*10*3 = 2400
      ]
      expect(calcTotalVolume(exercises)).toBe(2400)
    })

    it('应计算多个动作', () => {
      const exercises = [
        { weight: 60, reps: 10, sets: 3, isWarmup: false }, // 1800
        { weight: 28, reps: 12, sets: 3, isWarmup: false },  // 1008
      ]
      expect(calcTotalVolume(exercises)).toBe(2808)
    })
  })
})
