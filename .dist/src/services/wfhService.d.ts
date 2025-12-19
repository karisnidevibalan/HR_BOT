interface WFHServiceDeps {
    salesforce: any;
    policy: any;
    holidays: any;
}
export default class WFHService {
    private salesforce;
    private policy;
    private holidays;
    constructor({ salesforce, policy, holidays }: WFHServiceDeps);
    createWFHRequest(request: any): Promise<{
        success: boolean;
        status: string;
        requestId: string;
    }>;
    cancelWFH(requestId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getWFHBalance(userId: string): Promise<{
        used: any;
        remaining: number;
    }>;
    getWFHStatus(requestId: string): Promise<any>;
}
export {};
//# sourceMappingURL=wfhService.d.ts.map