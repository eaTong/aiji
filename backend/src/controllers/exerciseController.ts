import { Context } from 'koa'
import { ExerciseCategory, Equipment } from '@prisma/client'
import { getExercises, getExerciseById, toggleFavorite, ExerciseFilter } from '../services/exerciseService'
import { success } from '../types'
import { AuthContext } from '../types'

export async function listExercises(ctx: Context) {
  const { category, equipment, keyword, favorites } = ctx.query as Record<string, string>

  const filter: ExerciseFilter = {}

  if (category) {
    filter.category = category as ExerciseCategory
  }

  if (equipment) {
    filter.equipment = equipment as Equipment
  }

  if (keyword) {
    filter.keyword = keyword
  }

  if (favorites === 'true') {
    filter.favorites = true
    filter.userId = (ctx as AuthContext).state.user.userId
  }

  const exercises = await getExercises(filter)
  ctx.body = success(exercises)
}

export async function getExercise(ctx: Context) {
  const { id } = ctx.params
  const exercise = await getExerciseById(id)

  if (!exercise) {
    ctx.status = 404
    ctx.body = { code: 404, message: 'Exercise not found', data: null }
    return
  }

  ctx.body = success(exercise)
}

export async function toggleExerciseFavorite(ctx: AuthContext) {
  const { id } = ctx.params
  const userId = ctx.state.user.userId

  const exercise = await toggleFavorite(userId, id)
  ctx.body = success(exercise)
}