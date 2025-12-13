import { Router, Application } from 'express';
import { leaveController } from '../controllers/leaveController';

const router = Router();

export function setLeaveRoutes(app: Application) {
    app.post('/api/leave/apply', leaveController.applyLeave);
}