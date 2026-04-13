/**
 * 肌肉 code → 中文名 映射表
 * 来源：backend/src/seeds/muscles.json
 */

export interface MuscleInfo {
  code: string
  name: string
  category: string
}

export const MUSCLE_MAP: Record<string, string> = {
  // 胸部
  CHEST: '胸部',
  CHEST_UPPER: '上胸',
  CHEST_MIDDLE: '中胸',
  CHEST_LOWER: '下胸',

  // 背部
  BACK: '背部',
  LATS: '背阔肌',
  TRAPS: '斜方肌',
  TRAPS_UPPER: '斜方肌上束',
  TRAPS_MIDDLE: '斜方肌中束',
  TRAPS_LOWER: '斜方肌下束',
  RHOMBOID: '菱形肌',
  LOWER_BACK: '下背',

  // 腿部
  LEGS: '腿部',
  QUADS: '股四头肌',
  HAMSTRINGS: '腘绳肌',
  GLUTES: '臀肌',
  ADDUCTORS: '内收肌',
  ABDUCTORS: '外展肌',
  CALVES: '小腿',

  // 肩部
  SHOULDERS: '肩部',
  DELTS_FRONT: '三角肌前束',
  DELTS_MIDDLE: '三角肌中束',
  DELTS_REAR: '三角肌后束',

  // 手臂
  ARMS: '手臂',
  BICEPS: '肱二头肌',
  TRICEPS: '肱三头肌',
  BRACHIALIS: '肱肌',
  FOREARMS: '前臂',

  // 核心
  CORE: '核心',
  ABS: '腹肌',
  ABS_UPPER: '上腹',
  ABS_LOWER: '下腹',
  OBLIQUES: '腹斜肌',
  TRANSVERSE: '腹横肌',
}

/**
 * 将肌肉 code 数组转换为中文名称数组
 */
export function translateMuscles(codes: string[]): string[] {
  return codes.map(code => MUSCLE_MAP[code] || code)
}
