"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const wfhController_1 = require("../src/controllers/wfhController");
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
            await wfhController_1.wfhController.applyWFH(req, res);
        }
        else if (vercelReq.method === 'GET') {
            // Create a properly typed request object for getWFHStatus
            const getStatusReq = {
                ...req,
                params: { id: vercelReq.query.id }
            };
            await wfhController_1.wfhController.getWFHStatus(getStatusReq, res);
        }
        else {
            return vercelRes.status(405).json({ error: 'Method not allowed' });
        }
    }
    catch (error) {
        console.error('Error in WFH API:', error);
        return vercelRes.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
//# sourceMappingURL=wfh.js.map