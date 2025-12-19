"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setChatRoutes = setChatRoutes;
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const router = (0, express_1.Router)();
function setChatRoutes(app) {
    app.post('/api/chat', chatController_1.chatController);
}
//# sourceMappingURL=chat.js.map