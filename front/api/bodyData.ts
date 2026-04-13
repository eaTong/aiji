import { request } from './request'
import { WeightRecord, MeasurementRecord, ProgressPhoto } from '../types'

export function createWeightRecord(data: {
  weight: number
  recordedAt: string
  note?: string
}): Promise<WeightRecord> {
  return request<WeightRecord>('POST', '/api/body-data/weight', data)
}

export function getWeightRecords(
  startDate: string,
  endDate: string
): Promise<{ records: WeightRecord[] }> {
  return request<{ records: WeightRecord[] }>(
    'GET',
    `/api/body-data/weight?startDate=${startDate}&endDate=${endDate}`
  )
}

export function createMeasurement(
  data: Record<string, unknown>
): Promise<MeasurementRecord> {
  return request<MeasurementRecord>('POST', '/api/body-data/measurements', data)
}

export function getMeasurements(
  startDate: string,
  endDate: string
): Promise<MeasurementRecord[]> {
  return request<MeasurementRecord[]>(
    'GET',
    `/api/body-data/measurements?startDate=${startDate}&endDate=${endDate}`
  )
}

export function uploadPhoto(data: {
  photoUrl: string
  angle: string
  recordedAt: string
}): Promise<ProgressPhoto> {
  return request<ProgressPhoto>('POST', '/api/body-data/photos', data)
}

export function getPhotos(): Promise<ProgressPhoto[]> {
  return request<ProgressPhoto[]>('GET', '/api/body-data/photos')
}