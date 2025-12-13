import { Router, Application } from 'express';
import { chatController } from '../controllers/chatController';

const router = Router();

export function setChatRoutes(app: Application) {
    app.post('/api/chat', chatController);
}