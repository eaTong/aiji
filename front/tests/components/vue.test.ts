import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock uni API for components
vi.stubGlobal('uni', {
  showToast: vi.fn(),
  showModal: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  navigateTo: vi.fn(),
})

// 模拟 vue
const mockRef = vi.fn((val) => ({ value: val }))
const mockReactive = vi.fn((val) => val)
const mockComputed = vi.fn((fn) => ({ value: fn() }))
const mockWatch = vi.fn()

vi.mock('vue', () => ({
  ref: mockRef,
  reactive: mockReactive,
  computed: mockComputed,
  watch: mockWatch,
}))

describe('Component Logic Tests', () => {
  describe('ExerciseSelector - 组件逻辑', () => {
    // 模拟组件状态
    const createMockState = () => ({
      searchKeyword: '',
      selectedCategory: '',
      allExercises: [
        { id: '1', name: '杠铃卧推', nameEn: 'Barbell Bench Press', category: 'CHEST', equipment: 'GYM' },
        { id: '2', name: '哑铃上斜卧推', nameEn: 'Dumbbell Incline Press', category: 'CHEST', equipment: 'GYM' },
        { id: '3', name: '引体向上', nameEn: 'Pull Up', category: 'BACK', equipment: 'BODYWEIGHT' },
        { id: '4', name: '杠铃弯举', nameEn: 'Barbell Curl', category: 'ARMS', equipment: 'GYM' },
        { id: '5', name: '深蹲', nameEn: 'Squat', category: 'LEGS', equipment: 'GYM' },
      ],
    })

    const filterExercises = (state: ReturnType<typeof createMockState>) => {
      let result = state.allExercises

      if (state.selectedCategory) {
        result = result.filter(ex => ex.category === state.selectedCategory)
      }

      if (state.searchKeyword) {
        const keyword = state.searchKeyword.toLowerCase()
        result = result.filter(ex =>
          ex.name.toLowerCase().includes(keyword) ||
          (ex.nameEn && ex.nameEn.toLowerCase().includes(keyword))
        )
      }

      return result
    }

    const onCategoryChange = (state: ReturnType<typeof createMockState>, category: string) => {
      state.selectedCategory = category
    }

    const onSearch = (state: ReturnType<typeof createMockState>, keyword: string) => {
      state.searchKeyword = keyword
    }

    describe('分类筛选', () => {
      it('空分类应返回所有动作', () => {
        const state = createMockState()
        state.selectedCategory = ''
        const result = filterExercises(state)
        expect(result.length).toBe(5)
      })

      it('胸部分类应返回2个动作', () => {
        const state = createMockState()
        state.selectedCategory = 'CHEST'
        const result = filterExercises(state)
        expect(result.length).toBe(2)
        expect(result.every(ex => ex.category === 'CHEST')).toBe(true)
      })

      it('背部分类应返回1个动作', () => {
        const state = createMockState()
        state.selectedCategory = 'BACK'
        const result = filterExercises(state)
        expect(result.length).toBe(1)
        expect(result[0].name).toBe('引体向上')
      })
    })

    describe('搜索过滤', () => {
      it('中文搜索应返回结果', () => {
        const state = createMockState()
        state.searchKeyword = '卧推'
        const result = filterExercises(state)
        expect(result.length).toBe(2)
      })

      it('英文搜索应返回结果', () => {
        const state = createMockState()
        state.searchKeyword = 'curl'
        const result = filterExercises(state)
        expect(result.length).toBe(1)
        expect(result[0].name).toBe('杠铃弯举')
      })

      it('部分匹配应返回结果', () => {
        const state = createMockState()
        state.searchKeyword = '杠铃'
        const result = filterExercises(state)
        expect(result.length).toBe(2)
      })

      it('空搜索应返回所有', () => {
        const state = createMockState()
        state.searchKeyword = ''
        const result = filterExercises(state)
        expect(result.length).toBe(5)
      })
    })

    describe('组合筛选', () => {
      it('分类+搜索应同时生效', () => {
        const state = createMockState()
        state.selectedCategory = 'CHEST'
        state.searchKeyword = '杠铃'
        const result = filterExercises(state)
        expect(result.length).toBe(1)
        expect(result[0].name).toBe('杠铃卧推')
      })
    })

    describe('onCategoryChange', () => {
      it('应更新选中分类', () => {
        const state = createMockState()
        onCategoryChange(state, 'ARMS')
        expect(state.selectedCategory).toBe('ARMS')
      })
    })

    describe('onSearch', () => {
      it('应更新搜索关键词', () => {
        const state = createMockState()
        onSearch(state, '深蹲')
        expect(state.searchKeyword).toBe('深蹲')
      })
    })
  })

  describe('TrainingRecordCard - 组件逻辑', () => {
    // 模拟表单数据
    interface FormData {
      date: string
      trainingType: string
      exercises: Array<{
        exerciseId: string
        exerciseName: string
        sets: number
        reps: number
        weight: number
        isWarmup: boolean
      }>
      notes: string
    }

    const createMockForm = (): FormData => ({
      date: '2026-04-14',
      trainingType: '',
      exercises: [],
      notes: '',
    })

    const addExercise = (form: FormData, exercise: { id: string; name: string }) => {
      form.exercises.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: 3,
        reps: 10,
        weight: 0,
        isWarmup: false,
      })
    }

    const removeExercise = (form: FormData, index: number) => {
      form.exercises.splice(index, 1)
    }

    const validateForm = (form: FormData): string | null => {
      if (!form.trainingType) return '请输入训练类型'
      if (form.exercises.length === 0) return '请至少添加一个动作'
      return null
    }

    describe('addExercise', () => {
      it('应添加新动作到列表', () => {
        const form = createMockForm()
        addExercise(form, { id: 'ex-1', name: '杠铃卧推' })
        expect(form.exercises.length).toBe(1)
        expect(form.exercises[0].exerciseName).toBe('杠铃卧推')
      })

      it('新动作应有默认组数3和次数10', () => {
        const form = createMockForm()
        addExercise(form, { id: 'ex-1', name: '测试动作' })
        expect(form.exercises[0].sets).toBe(3)
        expect(form.exercises[0].reps).toBe(10)
      })

      it('新动作默认重量为0', () => {
        const form = createMockForm()
        addExercise(form, { id: 'ex-1', name: '测试动作' })
        expect(form.exercises[0].weight).toBe(0)
        expect(form.exercises[0].isWarmup).toBe(false)
      })
    })

    describe('removeExercise', () => {
      it('应删除指定索引的动作', () => {
        const form = createMockForm()
        addExercise(form, { id: 'ex-1', name: '动作1' })
        addExercise(form, { id: 'ex-2', name: '动作2' })
        expect(form.exercises.length).toBe(2)

        removeExercise(form, 0)
        expect(form.exercises.length).toBe(1)
        expect(form.exercises[0].exerciseName).toBe('动作2')
      })
    })

    describe('validateForm', () => {
      it('空训练类型应返回错误', () => {
        const form = createMockForm()
        form.trainingType = ''
        expect(validateForm(form)).toBe('请输入训练类型')
      })

      it('空动作列表应返回错误', () => {
        const form = createMockForm()
        form.trainingType = '胸部训练'
        expect(validateForm(form)).toBe('请至少添加一个动作')
      })

      it('有效表单应返回null', () => {
        const form = createMockForm()
        form.trainingType = '胸部训练'
        addExercise(form, { id: 'ex-1', name: '杠铃卧推' })
        expect(validateForm(form)).toBeNull()
      })
    })
  })

  describe('RestTimer - 组件逻辑', () => {
    interface TimerState {
      remaining: number
      isRunning: boolean
    }

    const createMockTimer = (duration: number): TimerState => ({
      remaining: duration,
      isRunning: false,
    })

    const startTimer = (state: TimerState) => {
      state.isRunning = true
    }

    const stopTimer = (state: TimerState) => {
      state.isRunning = false
    }

    const tick = (state: TimerState) => {
      if (state.isRunning && state.remaining > 0) {
        state.remaining--
      }
      if (state.remaining === 0) {
        state.isRunning = false
      }
    }

    const skipTimer = (state: TimerState) => {
      state.remaining = 0
      state.isRunning = false
    }

    describe('startTimer', () => {
      it('应设置isRunning为true', () => {
        const timer = createMockTimer(90)
        startTimer(timer)
        expect(timer.isRunning).toBe(true)
      })
    })

    describe('stopTimer', () => {
      it('应设置isRunning为false', () => {
        const timer = createMockTimer(90)
        timer.isRunning = true
        stopTimer(timer)
        expect(timer.isRunning).toBe(false)
      })
    })

    describe('tick', () => {
      it('应减少剩余时间', () => {
        const timer = createMockTimer(90)
        timer.isRunning = true
        tick(timer)
        expect(timer.remaining).toBe(89)
      })

      it('运行时时间为0时应停止', () => {
        const timer = createMockTimer(1)
        timer.isRunning = true
        tick(timer)
        expect(timer.remaining).toBe(0)
        expect(timer.isRunning).toBe(false)
      })

      it('未运行时不应减少', () => {
        const timer = createMockTimer(90)
        timer.isRunning = false
        tick(timer)
        expect(timer.remaining).toBe(90)
      })
    })

    describe('skipTimer', () => {
      it('应立即归零并停止', () => {
        const timer = createMockTimer(90)
        timer.isRunning = true
        skipTimer(timer)
        expect(timer.remaining).toBe(0)
        expect(timer.isRunning).toBe(false)
      })
    })
  })
})