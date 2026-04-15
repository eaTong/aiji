import Router from '@koa/router'
import {
  listCategories, create, update, remove,
  listArticles, getArticle, createArticleHandler, updateArticleHandler, publish, deleteArticleHandler, aiGenerate,
  listContributions, review,
  stats
} from '../../controllers/admin/knowledgeController'
import { adminAuthMiddleware } from '../../middleware/adminAuth'

const router = new Router({ prefix: '/admin/api/knowledge' })

router.use(adminAuthMiddleware)

// Categories
router.get('/categories', listCategories)
router.post('/categories', create)
router.put('/categories/:id', update)
router.delete('/categories/:id', remove)

// Articles
router.get('/articles', listArticles)
router.get('/articles/:id', getArticle)
router.post('/articles', createArticleHandler)
router.put('/articles/:id', updateArticleHandler)
router.post('/articles/:id/publish', publish)
router.delete('/articles/:id', deleteArticleHandler)
router.post('/articles/:id/ai-generate', aiGenerate)

// Contributions
router.get('/contributions', listContributions)
router.post('/contributions/:id/review', review)

// Stats
router.get('/stats', stats)

export default router
