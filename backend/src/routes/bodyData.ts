import Router from '@koa/router'
import { authMiddleware } from '../middleware/auth'
import {
  createWeightRecord_ctrl as createWeightRecord,
  getWeightRecords_ctrl as getWeightRecords,
  createMeasurementRecord_ctrl as createMeasurementRecord,
  getMeasurementRecords_ctrl as getMeasurementRecords,
  uploadProgressPhoto,
  getProgressPhotos_ctrl as getProgressPhotos,
} from '../controllers/bodyDataController'

const router = new Router({ prefix: '/api/body-data' })
router.use(authMiddleware)

router.post('/weight', createWeightRecord)
router.get('/weight', getWeightRecords)
router.post('/measurements', createMeasurementRecord)
router.get('/measurements', getMeasurementRecords)
router.post('/photos', uploadProgressPhoto)
router.get('/photos', getProgressPhotos)

export default router