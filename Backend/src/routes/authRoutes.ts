import { Router } from 'express'
import { login, register } from '../controllers/authController'
import { requireDatabase } from '../middleware/requireDatabase'

const router = Router()
router.post('/register', requireDatabase, register)
router.post('/login', requireDatabase, login)

export default router
