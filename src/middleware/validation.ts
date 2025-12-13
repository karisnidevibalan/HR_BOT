import { Request, Response, NextFunction } from 'express';

export const validateLeaveRequest = (req: Request, res: Response, next: NextFunction) => {
    const { employeeId, leaveType, startDate, endDate, reason } = req.body;

    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
        return res.status(400).json({ message: 'All fields are required for leave request.' });
    }

    next();
};

export const validateWfhRequest = (req: Request, res: Response, next: NextFunction) => {
    const { employeeId, startDate, endDate, reason } = req.body;

    if (!employeeId || !startDate || !endDate || !reason) {
        return res.status(400).json({ message: 'All fields are required for work from home request.' });
    }

    next();
};

export const validateQuery = (req: Request, res: Response, next: NextFunction) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ message: 'Query is required.' });
    }

    next();
};