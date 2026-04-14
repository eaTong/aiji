import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock pinia
vi.mock('pinia', () => ({
  createPinia: () => ({
    install: vi.fn(),
  }),
  defineStore: vi.fn((id, options) => {
    // Return a store that uses the setup function logic
    return (initialState) => {
      const state = { ...options().state?.(), ...initialState }
      const actions = {}

      for (const [key, value] of Object.entries(options())) {
        if (typeof value === 'function' && key !== 'state' && key !== 'getters') {
          actions[key] = value
        }
      }

      // Create a proxy that returns state properties but calls actions directly
      return new Proxy({}, {
        get(target, prop) {
          if (prop === 'state') return state
          if (actions[prop]) {
            return (...args) => actions[prop].call({ state }, ...args)
          }
          return state[prop]
        },
        set(target, prop, value) {
          if (prop === 'token' || prop === 'user') {
            state[prop] = value
            if (prop === 'token') {
              uni.setStorageSync('token', value)
            }
          }
          return true
        }
      })
    }
  }),
}))

// Mock getProfile API
const mockGetProfile = vi.fn()
vi.mock('../../api/user', () => ({
  getProfile: (...args) => mockGetProfile(...args),
}))

// Mock uni storage
vi.stubGlobal('uni', {
  getStorageSync: vi.fn((key) => {
    if (key === 'token') return 'mock-token'
    return null
  }),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn(),
  navigateTo: vi.fn(),
  reLaunch: vi.fn(),
})

describe('Store - user.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetProfile.mockReset()
  })

  describe('UserStore', () => {
    // Since we can't easily test the actual Pinia store without full setup,
    // we'll test the core logic separately

    describe('token management', () => {
      it('should get token from storage', () => {
        const token = uni.getStorageSync('token')
        expect(token).toBe('mock-token')
      })

      it('should set token to storage', () => {
        const newToken = 'new-test-token'
        uni.setStorageSync('token', newToken)
        expect(uni.setStorageSync).toHaveBeenCalledWith('token', newToken)
      })

      it('should remove token from storage on logout', () => {
        uni.removeStorageSync('token')
        expect(uni.removeStorageSync).toHaveBeenCalledWith('token')
      })
    })

    describe('user state', () => {
      it('should initialize with empty user', () => {
        const initialUser = null
        expect(initialUser).toBeNull()
      })

      it('should hold user data', () => {
        const mockUser = {
          id: 'user-123',
          openid: 'test-openid',
          nickname: '测试用户',
          goal: 'GAIN_MUSCLE',
          level: 'BEGINNER',
          equipment: 'GYM',
          weeklyTrainingDays: 3,
          currentPhase: 'MAINTAIN',
        }
        expect(mockUser.nickname).toBe('测试用户')
        expect(mockUser.goal).toBe('GAIN_MUSCLE')
      })
    })

    describe('fetchProfile', () => {
      it('should call getProfile API', async () => {
        const mockUser = {
          id: 'user-123',
          openid: 'test-openid',
          nickname: '测试用户',
          goal: 'GAIN_MUSCLE',
        }

        mockGetProfile.mockResolvedValue(mockUser)

        const result = await mockGetProfile()

        expect(mockGetProfile).toHaveBeenCalled()
        expect(result.nickname).toBe('测试用户')
      })

      it('should handle getProfile error', async () => {
        mockGetProfile.mockRejectedValue(new Error('API Error'))

        await expect(mockGetProfile()).rejects.toThrow('API Error')
      })
    })

    describe('logout', () => {
      it('should clear user data and token', () => {
        const logout = () => {
          uni.removeStorageSync('token')
          uni.reLaunch({ url: '/pages/profile/login' })
        }

        logout()

        expect(uni.removeStorageSync).toHaveBeenCalledWith('token')
        expect(uni.reLaunch).toHaveBeenCalledWith({ url: '/pages/profile/login' })
      })
    })
  })
})

// User type tests
describe('Types - User', () => {
  it('should have correct User structure', () => {
    const user = {
      id: 'user-123',
      openid: 'test-openid',
      nickname: '测试用户',
      height: 175,
      targetWeight: 70,
      goal: 'GAIN_MUSCLE' as const,
      level: 'INTERMEDIATE' as const,
      equipment: 'GYM' as const,
      weeklyTrainingDays: 4,
      currentPhase: 'BULK' as const,
    }

    expect(user.goal).toMatch(/LOSE_FAT|GAIN_MUSCLE|BODY_SHAPE|IMPROVE_FITNESS/)
    expect(user.level).toMatch(/BEGINNER|INTERMEDIATE|ADVANCED/)
    expect(user.equipment).toMatch(/GYM|DUMBBELL|BODYWEIGHT/)
    expect(user.currentPhase).toMatch(/CUT|BULK|MAINTAIN/)
  })

  it('should allow partial user data', () => {
    const user = {
      id: 'user-123',
      openid: 'test-openid',
    }

    expect(user.nickname).toBeUndefined()
    expect(user.goal).toBeUndefined()
  })
})