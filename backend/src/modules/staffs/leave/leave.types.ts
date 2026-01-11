export interface LeaveApplication {
  id: string
  employeeId: string
  employeeName?: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  reason: string
  status: LeaveStatus
  appliedAt: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
  createdAt: string
  updatedAt: string
}

export enum LeaveType {
  SICK_LEAVE = 'SICK_LEAVE',
  CASUAL_LEAVE = 'CASUAL_LEAVE',
  ANNUAL_LEAVE = 'ANNUAL_LEAVE',
  EMERGENCY_LEAVE = 'EMERGENCY_LEAVE',
  MATERNITY_LEAVE = 'MATERNITY_LEAVE',
  PATERNITY_LEAVE = 'PATERNITY_LEAVE',
  OTHER = 'OTHER'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export interface CreateLeaveApplicationRequest {
  employeeId: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  reason: string
}

export interface ReviewLeaveApplicationRequest {
  applicationId: string
  status: LeaveStatus.APPROVED | LeaveStatus.REJECTED
  reviewNote?: string
  reviewedBy: string
}

export interface LeaveApplicationResponse {
  success: boolean
  data?: LeaveApplication
  error?: string
}

export interface LeaveApplicationsResponse {
  success: boolean
  data?: LeaveApplication[]
  error?: string
}