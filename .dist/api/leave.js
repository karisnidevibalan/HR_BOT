"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const leaveController_1 = require("../src/controllers/leaveController");
async function handler(vercelReq, vercelRes) {
    // Create Express-like request and response objects
    const req = {
        ...vercelReq,
        body: vercelReq.body,
        method: vercelReq.method,
        headers: vercelReq.headers,
        params: vercelReq.query, // Map query params to params for Express compatibility
        get: (header) => vercelReq.headers[header.toLowerCase()],
    };
    const res = {
        status: (code) => {
            vercelRes.status(code);
            return {
                json: (data) => vercelRes.json(data),
                send: (data) => vercelRes.send(data),
            };
        },
        json: (data) => vercelRes.json(data),
        send: (data) => vercelRes.send(data),
        setHeader: (name, value) => vercelRes.setHeader(name, value),
    };
    try {
        // Route to the appropriate controller method based on HTTP method
        if (vercelReq.method === 'POST') {
            await leaveController_1.leaveController.applyLeave(req, res);
        }
        else if (vercelReq.method === 'GET') {
            // Create a properly typed request object for getLeaveStatus
            const getStatusReq = {
                ...req,
                params: { id: vercelReq.query.id }
            };
            await leaveController_1.leaveController.getLeaveStatus(getStatusReq, res);
        }
        else {
            return vercelRes.status(405).json({ error: 'Method not allowed' });
        }
    }
    catch (error) {
        console.error('Error in Leave API:', error);
        return vercelRes.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
//# sourceMappingURL=leave.js.map