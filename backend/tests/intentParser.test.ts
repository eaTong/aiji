import { parseIntent, extractEntities, isNegativeIntent, isAffirmativeIntent, isDeferIntent, isCorrectionIntent, fuzzyMatchIntent } from '../src/services/intentParser'

describe('intentParser', () => {
  describe('parseIntent', () => {
    it('should parse weight recording intent', () => {
      const result = parseIntent('我体重 70kg')
      expect(result.type).toBe('RECORD_WEIGHT')
      expect(result.entities.number).toBe(70)
      expect(result.entities.unit).toBe('kg')
    })

    it('should parse training recommendation intent', () => {
      const result = parseIntent('今天练什么好？')
      expect(['TRAINING_RECOMMEND', 'RECORD_TRAINING']).toContain(result.type)
    })

    it('should parse greeting intent', () => {
      const result = parseIntent('你好')
      expect(result.type).toBe('GREETING')
    })

    it('should parse recovery query intent', () => {
      const result = parseIntent('胸肌恢复了吗？')
      expect(result.type).toBe('QUERY_RECOVERY')
    })

    it('should return UNKNOWN for empty message', () => {
      const result = parseIntent('')
      expect(result.type).toBe('UNKNOWN')
    })
  })

  describe('extractEntities', () => {
    it('should extract number', () => {
      const result = extractEntities('体重 75.5kg', 'RECORD_WEIGHT')
      expect(result.number).toBe(75.5)
    })

    it('should extract unit', () => {
      const result = extractEntities('体重 75 公斤', 'RECORD_WEIGHT')
      expect(result.unit).toBe('公斤')
    })

    it('should extract muscle group', () => {
      const result = extractEntities('练胸部', 'TRAINING_RECOMMEND')
      expect(result.muscle).toBe('chest')
    })

    it('should extract date', () => {
      const result = extractEntities('昨天练了', 'RECORD_TRAINING')
      expect(result.date).toBe('yesterday')
    })
  })

  describe('isNegativeIntent', () => {
    it('should detect negative intent', () => {
      expect(isNegativeIntent('不')).toBe(true)
      expect(isNegativeIntent('算了')).toBe(true)
      expect(isNegativeIntent('取消')).toBe(true)
    })

    it('should not detect negative for positive intent', () => {
      expect(isNegativeIntent('好的')).toBe(false)
      expect(isNegativeIntent('是')).toBe(false)
    })
  })

  describe('isAffirmativeIntent', () => {
    it('should detect affirmative intent', () => {
      expect(isAffirmativeIntent('是')).toBe(true)
      expect(isAffirmativeIntent('好的')).toBe(true)
      expect(isAffirmativeIntent('ok')).toBe(true)
    })
  })

  describe('isDeferIntent', () => {
    it('should detect defer intent', () => {
      expect(isDeferIntent('等会儿再说')).toBe(true)
      expect(isDeferIntent('先不')).toBe(true)
    })
  })

  describe('isCorrectionIntent', () => {
    it('should detect correction intent', () => {
      expect(isCorrectionIntent('不对')).toBe(true)
      expect(isCorrectionIntent('错了')).toBe(true)
    })
  })

  describe('fuzzyMatchIntent', () => {
    it('should match intent patterns', () => {
      const result = fuzzyMatchIntent('今天体重 70kg')
      const weightMatches = result.filter(m => m.intent === 'RECORD_WEIGHT')
      expect(weightMatches.length).toBeGreaterThanOrEqual(1)
    })
  })
})
