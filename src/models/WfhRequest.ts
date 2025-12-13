export class WfhRequest {
    id: string;
    employeeId: string;
    startDate: Date;
    endDate: Date;
    reason: string;

    constructor(id: string, employeeId: string, startDate: Date, endDate: Date, reason: string) {
        this.id = id;
        this.employeeId = employeeId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.reason = reason;
    }
}