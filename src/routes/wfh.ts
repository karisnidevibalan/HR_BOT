import { Router, Application } from 'express';
import { wfhController } from '../controllers/wfhController';

const router = Router();

export function setWfhRoutes(app: Application) {
    app.post('/api/wfh/apply', wfhController.applyWFH);
}