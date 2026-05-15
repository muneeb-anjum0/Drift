import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { loginController, logoutController, meController, registerController } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', registerController);
authRouter.post('/login', loginController);
authRouter.get('/me', authMiddleware, meController);
authRouter.post('/logout', authMiddleware, logoutController);
