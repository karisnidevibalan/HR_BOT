"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setWfhRoutes = setWfhRoutes;
const express_1 = require("express");
const wfhController_1 = require("../controllers/wfhController");
const router = (0, express_1.Router)();
function setWfhRoutes(app) {
    app.post('/api/wfh/apply', wfhController_1.wfhController.applyWFH);
}
//# sourceMappingURL=wfh.js.map