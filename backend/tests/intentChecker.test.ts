import { checkIntentCompleteness, isValidNumber, isInReasonableRange, parseNumberInput, parseUnit } from '../src/services/intentChecker'

describe('intentChecker', () => {
  describe('checkIntentCompleteness', () => {
    it('should not require clarification for complete weight intent', () => {
      const result = checkIntentCompleteness('RECORD_WEIGHT', {
        weight: 70,
        unit: 'kg'
      })
      expect(result.shouldClarify).toBe(false)
    })

    it('should require clarification for incomplete weight intent', () => {
      const result = checkIntentCompleteness('RECORD_WEIGHT', {})
      expect(result.shouldClarify).toBe(true)
      expect(result.missingFields.length).toBeGreaterThan(0)
    })

    it('should not require clarification for greeting', () => {
      const result = checkIntentCompleteness('GREETING', {})
      expect(result.shouldClarify).toBe(false)
    })

    it('should handle weight with default unit', () => {
      const result = checkIntentCompleteness('RECORD_WEIGHT', {
        weight: 70
      })
      expect(result).toBeDefined()
    })
  })

  describe('isValidNumber', () => {
    it('should validate correct numbers', () => {
      expect(isValidNumber(70)).toBe(true)
      expect(isValidNumber('70.5')).toBe(true)
      expect(isValidNumber(-5)).toBe(true)
    })

    it('should reject invalid values', () => {
      expect(isValidNumber(NaN)).toBe(false)
      expect(isValidNumber('abc')).toBe(false)
      expect(isValidNumber(undefined)).toBe(false)
    })
  })

  describe('isInReasonableRange', () => {
    it('should validate weight in reasonable range', () => {
      expect(isInReasonableRange(70, 'weight')).toBe(true)
      expect(isInReasonableRange(20, 'weight')).toBe(true)
      expect(isInReasonableRange(300, 'weight')).toBe(true)
    })

    it('should reject weight out of range', () => {
      expect(isInReasonableRange(10, 'weight')).toBe(false)
      expect(isInReasonableRange(500, 'weight')).toBe(false)
    })

    it('should validate reps in reasonable range', () => {
      expect(isInReasonableRange(10, 'reps')).toBe(true)
      expect(isInReasonableRange(1, 'reps')).toBe(true)
    })

    it('should reject reps out of range', () => {
      expect(isInReasonableRange(0, 'reps')).toBe(false)
      expect(isInReasonableRange(200, 'reps')).toBe(false)
    })
  })

  describe('parseNumberInput', () => {
    it('should parse standard numbers', () => {
      expect(parseNumberInput('70')).toBe(70)
      expect(parseNumberInput('70.5')).toBe(70.5)
    })

    it('should parse simple chinese numbers', () => {
      expect(parseNumberInput('七')).toBe(7)
    })
  })

  describe('parseUnit', () => {
    it('should parse weight units', () => {
      expect(parseUnit('kg')).toBe('kg')
      expect(parseUnit('公斤')).toBe('kg')
      expect(parseUnit('斤')).toBe('斤')
    })

    it('should parse length units', () => {
      expect(parseUnit('cm')).toBe('cm')
      expect(parseUnit('厘米')).toBe('cm')
    })
  })
})
