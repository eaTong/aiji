import { PhotoAngle } from '@prisma/client'
import { AuthContext } from '../types'
import { success } from '../types'
import {
  createWeightRecord,
  getWeightRecords,
  createMeasurementRecord,
  getMeasurementRecords,
  MeasurementInput,
  createProgressPhoto,
  getProgressPhotos,
} from '../services/bodyDataService'

export async function createWeightRecord_ctrl(ctx: AuthContext) {
  const { weight, recordedAt, note } = ctx.request.body as {
    weight: number; recordedAt: string; note?: string
  }
  const record = await createWeightRecord(ctx.state.user.userId, weight, recordedAt, note)
  ctx.body = success(record)
}

export async function getWeightRecords_ctrl(ctx: AuthContext) {
  const { startDate = '2020-01-01', endDate = '2099-12-31' } = ctx.query as Record<string, string>
  const data = await getWeightRecords(ctx.state.user.userId, startDate, endDate)
  ctx.body = success(data)
}

export async function createMeasurementRecord_ctrl(ctx: AuthContext) {
  const input = ctx.request.body as MeasurementInput
  const record = await createMeasurementRecord(ctx.state.user.userId, input)
  ctx.body = success(record)
}

export async function getMeasurementRecords_ctrl(ctx: AuthContext) {
  const { startDate = '2020-01-01', endDate = '2099-12-31' } = ctx.query as Record<string, string>
  const records = await getMeasurementRecords(ctx.state.user.userId, startDate, endDate)
  ctx.body = success(records)
}

export async function uploadProgressPhoto(ctx: AuthContext) {
  const { photoUrl, angle, recordedAt } = ctx.request.body as {
    photoUrl: string; angle: PhotoAngle; recordedAt: string
  }
  const photo = await createProgressPhoto(ctx.state.user.userId, photoUrl, angle, recordedAt)
  ctx.body = success(photo)
}

export async function getProgressPhotos_ctrl(ctx: AuthContext) {
  const photos = await getProgressPhotos(ctx.state.user.userId)
  ctx.body = success(photos)
}