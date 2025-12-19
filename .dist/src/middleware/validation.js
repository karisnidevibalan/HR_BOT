"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validateWfhRequest = exports.validateLeaveRequest = void 0;
const validateLeaveRequest = (req, res, next) => {
    const { employeeId, leaveType, startDate, endDate, reason } = req.body;
    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
        return res.status(400).json({ message: 'All fields are required for leave request.' });
    }
    next();
};
exports.validateLeaveRequest = validateLeaveRequest;
const validateWfhRequest = (req, res, next) => {
    const { employeeId, startDate, endDate, reason } = req.body;
    if (!employeeId || !startDate || !endDate || !reason) {
        return res.status(400).json({ message: 'All fields are required for work from home request.' });
    }
    next();
};
exports.validateWfhRequest = validateWfhRequest;
const validateQuery = (req, res, next) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ message: 'Query is required.' });
    }
    next();
};
exports.validateQuery = validateQuery;
//# sourceMappingURL=validation.js.map