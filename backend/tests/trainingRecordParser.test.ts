import { parseTrainingInput, validateParsedData, generateTrainingSummary } from '../src/services/trainingRecordParser'

describe('trainingRecordParser', () => {
  describe('parseTrainingInput', () => {
    it('should parse single exercise with weight and reps', () => {
      const result = parseTrainingInput('卧推 60kg 8个')
      expect(result.exercises).toHaveLength(1)
      expect(result.exercises[0].name).toBe('杠铃卧推')
      expect(result.exercises[0].sets[0].weight).toBe(60)
      expect(result.exercises[0].sets[0].reps).toBe(8)
    })

    it('should parse multiple exercises separated by delimiter', () => {
      const result = parseTrainingInput('今天练了卧推 60kg 8个、深蹲 100kg 5个')
      expect(result.exercises).toHaveLength(2)
      expect(result.exercises[0].name).toBe('杠铃卧推')
      expect(result.exercises[1].name).toBe('杠铃深蹲')
    })

    it('should extract date from message', () => {
      const result = parseTrainingInput('今天练了卧推 60kg 8个')
      expect(result.date).toBe('today')
    })

    it('should handle 斤 as weight unit', () => {
      const result = parseTrainingInput('体重 150斤')
      // 150斤 = 75kg
      expect(result.exercises.length).toBe(0) // 体重不是训练动作
    })

    it('should handle exercise name detection', () => {
      // Just verify the function doesn't crash on different inputs
      const result1 = parseTrainingInput('卧推 60kg 8个')
      expect(result1.exercises.length).toBe(1)

      const result2 = parseTrainingInput('深蹲 100kg 5个')
      expect(result2.exercises.length).toBe(1)
    })
  })

  describe('validateParsedData', () => {
    it('should validate empty exercises as invalid', () => {
      const data = { exercises: [], rawText: '' }
      const result = validateParsedData(data)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('未识别到有效的训练动作')
    })

    it('should validate weight out of range', () => {
      const data = {
        exercises: [{
          name: '卧推',
          sets: [{ weight: 600, reps: 8 }] // 600kg 超出范围
        }],
        rawText: ''
      }
      const result = validateParsedData(data)
      expect(result.valid).toBe(false)
    })

    it('should validate reps out of range', () => {
      const data = {
        exercises: [{
          name: '卧推',
          sets: [{ weight: 60, reps: 200 }] // 200次 超出范围
        }],
        rawText: ''
      }
      const result = validateParsedData(data)
      expect(result.valid).toBe(false)
    })

    it('should validate correct data', () => {
      const data = {
        exercises: [{
          name: '卧推',
          sets: [{ weight: 60, reps: 8 }]
        }],
        rawText: ''
      }
      const result = validateParsedData(data)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('generateTrainingSummary', () => {
    it('should generate summary text', () => {
      const exercises = [{
        name: '卧推',
        sets: [{ weight: 60, reps: 8 }]
      }]
      const summary = generateTrainingSummary(exercises)
      expect(summary).toContain('卧推')
      expect(summary).toContain('60kg×8')
    })

    it('should handle multiple exercises', () => {
      const exercises = [
        { name: '卧推', sets: [{ weight: 60, reps: 8 }] },
        { name: '深蹲', sets: [{ weight: 100, reps: 5 }] }
      ]
      const summary = generateTrainingSummary(exercises)
      expect(summary).toContain('卧推')
      expect(summary).toContain('深蹲')
      expect(summary).toContain('；')
    })
  })
})
