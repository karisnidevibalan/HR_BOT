export interface Employee {
    id: string;
    name: string;
    email: string;
}
export interface LeaveRequest {
    id: string;
    employeeId: string;
    leaveType: string;
    startDate: Date;
    endDate: Date;
    reason: string;
}
export interface WfhRequest {
    id: string;
    employeeId: string;
    startDate: Date;
    endDate: Date;
    reason: string;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
}
export interface ApiRequest {
    body: any;
    params: any;
    query: any;
}
//# sourceMappingURL=index.d.ts.map