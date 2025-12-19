"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLeaveRoutes = setLeaveRoutes;
const express_1 = require("express");
const leaveController_1 = require("../controllers/leaveController");
const router = (0, express_1.Router)();
function setLeaveRoutes(app) {
    app.post('/api/leave/apply', leaveController_1.leaveController.applyLeave);
}
//# sourceMappingURL=leave.js.map