export class LeaveRequest {
    id: string;
    employeeId: string;
    leaveType: string;
    startDate: Date;
    endDate: Date;
    reason: string;

    constructor(id: string, employeeId: string, leaveType: string, startDate: Date, endDate: Date, reason: string) {
        this.id = id;
        this.employeeId = employeeId;
        this.leaveType = leaveType;
        this.startDate = startDate;
        this.endDate = endDate;
        this.reason = reason;
    }
}