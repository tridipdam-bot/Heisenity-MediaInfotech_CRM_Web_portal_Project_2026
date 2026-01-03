import { ATTENDANCE_STATUS } from "./attendance.constants"

export type AttendanceStatus =
  typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS]

export interface AttendanceRecord {
  employeeId: string
  timestamp: string
  location: string
  ipAddress: string
  deviceInfo: string
  photo?: string
  status: AttendanceStatus
}