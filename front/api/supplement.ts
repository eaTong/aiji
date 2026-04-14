import { request } from './request'

export interface SupplementRecord {
  id: string
  userId: string
  date: string
  supplement: string
  dosage: string | null
  timing: string | null
  note: string | null
  createdAt: string
}

export interface CreateSupplementData {
  supplement: string
  dosage?: string
  timing?: string
  note?: string
  date?: string
}

export const SUPPLEMENTS = [
  { value: 'protein', label: '蛋白粉', defaultDosage: '30g' },
  { value: 'creatine', label: '肌酸', defaultDosage: '5g' },
  { value: 'bcaa', label: 'BCAA', defaultDosage: '10g' },
  { value: 'pre_workout', label: '氮泵', defaultDosage: '1勺' },
  { value: 'glutamine', label: '谷氨酰胺', defaultDosage: '5g' },
  { value: 'fish_oil', label: '鱼油', defaultDosage: '2粒' },
  { value: 'multivitamin', label: '复合维生素', defaultDosage: '1粒' },
  { value: 'zma', label: '锌镁片', defaultDosage: '2粒' },
  { value: 'custom', label: '其他', defaultDosage: '' },
] as const

export const TIMINGS = [
  '早餐前',
  '早餐后',
  '午餐前',
  '午餐后',
  '训练前30分钟',
  '训练后',
  '睡前',
  '其他',
] as const

/**
 * 创建补剂记录
 */
export function createSupplement(data: CreateSupplementData): Promise<SupplementRecord> {
  return request<SupplementRecord>('POST', '/api/supplements', data as Record<string, unknown>)
}

/**
 * 获取补剂记录列表
 */
export function getSupplements(options?: { date?: string; days?: number }): Promise<SupplementRecord[]> {
  const params = new URLSearchParams()
  if (options?.date) params.append('date', options.date)
  if (options?.days) params.append('days', String(options.days))
  const query = params.toString()
  return request<SupplementRecord[]>('GET', `/api/supplements${query ? `?${query}` : ''}`)
}

/**
 * 删除补剂记录
 */
export function deleteSupplement(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>('DELETE', `/api/supplements/${id}`)
}
