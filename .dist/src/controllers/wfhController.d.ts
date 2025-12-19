import { Request, Response } from 'express';
interface WFHRequestBody {
    employeeName: string;
    date: string;
    reason?: string;
}
export declare const wfhController: {
    applyWFH(req: Request<{}, {}, WFHRequestBody>, res: Response): Promise<Response<any, Record<string, any>>>;
    getWFHStatus(req: Request<{
        id: string;
    }>, res: Response): Promise<Response<any, Record<string, any>>>;
};
export {};
//# sourceMappingURL=wfhController.d.ts.map