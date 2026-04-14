import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock uni API
const mockRequest = vi.fn()
const mockShowToast = vi.fn()
const mockNavigateTo = vi.fn()
const mockSetStorageSync = vi.fn()
const mockGetStorageSync = vi.fn()

vi.stubGlobal('uni', {
  request: mockRequest,
  showToast: mockShowToast,
  navigateTo: mockNavigateTo,
  setStorageSync: mockSetStorageSync,
  getStorageSync: mockGetStorageSync,
})

describe('API - training.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStorageSync.mockReturnValue('mock-token')
  })

  describe('recommendTraining', () => {
    it('should call POST /api/training/recommend with correct params', async () => {
      const { recommendTraining } = await import('../../api/training')

      const mockResponse = {
        code: 0,
        message: 'ok',
        data: {
          type: 'new_recommendation',
          training: {
            name: '胸部力量训练',
            duration: 45,
            type: '增肌',
            targetMuscle: 'chest',
            exercises: [],
            reason: '恢复良好',
          },
        },
      }

      // uni.request success callback receives { data: response }
      mockRequest.mockImplementation((config: any) => {
        config.success({ data: mockResponse })
        return {}
      })

      const result = await recommendTraining(false, false)

      expect(mockRequest).toHaveBeenCalled()
      const call = mockRequest.mock.calls[0][0]
      expect(call.url).toContain('/api/training/recommend')
      expect(call.method).toBe('POST')
      expect(call.data).toEqual({ forceRefresh: false, quickMode: false })
      expect(result.type).toBe('new_recommendation')
    })

    it('should pass quickMode parameter correctly', async () => {
      const { recommendTraining } = await import('../../api/training')

      const mockResponse = {
        code: 0,
        message: 'ok',
        data: { type: 'new_recommendation' },
      }

      mockRequest.mockImplementation((config: any) => {
        config.success({ data: mockResponse })
        return {}
      })

      await recommendTraining(true, true)

      const call = mockRequest.mock.calls[0][0]
      expect(call.data).toEqual({ forceRefresh: true, quickMode: true })
    })

    it('should handle need_goal response', async () => {
      const { recommendTraining } = await import('../../api/training')

      const mockResponse = {
        code: 0,
        message: 'ok',
        data: {
          type: 'need_goal',
          message: '请先设置目标',
          options: ['减脂', '增肌', '塑形', '提升体能'],
        },
      }

      mockRequest.mockImplementation((config: any) => {
        config.success({ data: mockResponse })
        return {}
      })

      const result = await recommendTraining()

      expect(result.type).toBe('need_goal')
      expect(result.options).toContain('减脂')
      expect(result.options).toContain('增肌')
    })

    it('should handle completed_today response', async () => {
      const { recommendTraining } = await import('../../api/training')

      const mockResponse = {
        code: 0,
        message: 'ok',
        data: {
          type: 'completed_today',
          message: '你今天已经练过了！',
          completedTraining: { name: '胸部训练', duration: 45 },
          suggestions: ['安排拉伸', '轻度有氧'],
        },
      }

      mockRequest.mockImplementation((config: any) => {
        config.success({ data: mockResponse })
        return {}
      })

      const result = await recommendTraining()

      expect(result.type).toBe('completed_today')
      expect(result.completedTraining?.duration).toBe(45)
    })

    it('should include muscleScores and overallScore in response', async () => {
      const { recommendTraining } = await import('../../api/training')

      const mockResponse = {
        code: 0,
        message: 'ok',
        data: {
          type: 'overtraining_warning',
          warnings: ['身体尚未完全恢复'],
          muscleScores: { chest: 55, back: 80 },
          overallScore: 65,
        },
      }

      mockRequest.mockImplementation((config: any) => {
        config.success({ data: mockResponse })
        return {}
      })

      const result = await recommendTraining()

      expect(result.warnings).toContain('身体尚未完全恢复')
      expect(result.muscleScores?.chest).toBe(55)
      expect(result.overallScore).toBe(65)
    })

    it('should handle 401 unauthorized', async () => {
      const { recommendTraining } = await import('../../api/training')

      const mockResponse = {
        code: 401,
        message: '未授权',
        data: null,
      }

      mockRequest.mockImplementation((config: any) => {
        config.success({ data: mockResponse })
        return {}
      })

      await expect(recommendTraining()).rejects.toThrow('未授权')
      expect(mockNavigateTo).toHaveBeenCalledWith({ url: '/pages/profile/login' })
    })
  })

  describe('saveTrainingRecord', () => {
    it('should call POST /api/training/record with correct params', async () => {
      const { saveTrainingRecord } = await import('../../api/training')

      const mockResponse = {
        code: 0,
        message: 'ok',
        data: {
          id: 'log-123',
          totalVolume: 1800,
          e1rm: { '杠铃卧推': 80 },
          message: '已记录！胸部训练，容量1.8t',
        },
      }

      mockRequest.mockImplementation((config: any) => {
        config.success({ data: mockResponse })
        return {}
      })

      const input = {
        date: '2026-04-14',
        trainingType: '胸部训练',
        exercises: [
          {
            exerciseId: 'ex-1',
            exerciseName: '杠铃卧推',
            sets: 3,
            reps: 10,
            weight: 60,
            weightUnit: 'kg' as const,
            isWarmup: false,
          },
        ],
        notes: '状态不错',
      }

      const result = await saveTrainingRecord(input)

      expect(mockRequest).toHaveBeenCalled()
      const call = mockRequest.mock.calls[0][0]
      expect(call.url).toContain('/api/training/record')
      expect(call.method).toBe('POST')
      expect(result.id).toBe('log-123')
      expect(result.totalVolume).toBe(1800)
      expect(result.e1rm['杠铃卧推']).toBe(80)
    })

    it('should handle error response (code != 0)', async () => {
      const { saveTrainingRecord } = await import('../../api/training')

      const mockResponse = {
        code: 1,
        message: '保存失败',
        data: null,
      }

      mockRequest.mockImplementation((config: any) => {
        config.success({ data: mockResponse })
        return {}
      })

      await expect(saveTrainingRecord({
        date: '2026-04-14',
        trainingType: '测试',
        exercises: [],
      })).rejects.toThrow('保存失败')

      expect(mockShowToast).toHaveBeenCalledWith({ title: '保存失败', icon: 'none' })
    })

    it('should handle network error', async () => {
      const { saveTrainingRecord } = await import('../../api/training')

      mockRequest.mockImplementation((config: any) => {
        config.fail({ errMsg: 'network error' })
        return {}
      })

      await expect(saveTrainingRecord({
        date: '2026-04-14',
        trainingType: '测试',
        exercises: [],
      })).rejects.toThrow()

      expect(mockShowToast).toHaveBeenCalledWith({ title: '网络错误', icon: 'none' })
    })
  })
})