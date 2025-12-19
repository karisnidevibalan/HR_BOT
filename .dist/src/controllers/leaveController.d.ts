import { Request, Response } from 'express';
interface LeaveRequestBody {
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
}
export declare const leaveController: {
    applyLeave(req: Request<{}, {}, LeaveRequestBody>, res: Response): Promise<Response<any, Record<string, any>>>;
    getLeaveStatus(req: Request<{
        id: string;
    }>, res: Response): Promise<Response<any, Record<string, any>>>;
};
export {};
//# sourceMappingURL=leaveController.d.ts.map