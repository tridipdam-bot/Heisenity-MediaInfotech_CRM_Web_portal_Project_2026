import { Router } from "express";

import {
  createAttendance,
  detectDevice,
  checkRemainingAttempts,
  getAttendanceRecords,
  deleteAttendanceRecord,
  getPendingApprovals,
  approveAttendanceRecord,
  rejectAttendanceRecord,
  dayClockOutController,
} from "./attendance.controller";

import {
  exportAttendanceToExcel
} from "./attendance.export";

import dailyAttendanceRoutes from './daily-attendance.route';

const router = Router();

/**
 * =========================
 * Attendance Core
 * =========================
 */

// Get attendance records
// GET /attendance
router.get("/", getAttendanceRecords);

// Mark attendance (simplified without location validation)
// POST /attendance
router.post("/", createAttendance);

// Day clock-out for field engineers
// POST /attendance/day-clock-out
router.post("/day-clock-out", dayClockOutController);

// Delete attendance record
// DELETE /attendance/:id
router.delete("/:id", deleteAttendanceRecord);

// Detect device (browser, OS, etc.)
// GET /attendance/device
router.get("/device", detectDevice);

/**
 * =========================
 * Attendance Approval
 * =========================
 */

// Get pending attendance approvals
// GET /attendance/pending-approvals
router.get("/pending-approvals", getPendingApprovals);

// Approve attendance
// POST /attendance/:attendanceId/approve
router.post("/:attendanceId/approve", approveAttendanceRecord);

// Reject attendance
// POST /attendance/:attendanceId/reject
router.post("/:attendanceId/reject", rejectAttendanceRecord);

/**
 * =========================
 * Validation
 * =========================
 */

// Check remaining attempts
// GET /attendance/attempts/:employeeId
router.get("/attempts/:employeeId", checkRemainingAttempts);

/**
 * =========================
 * Export Functions
 * =========================
 */

// Export attendance to Excel
// GET /attendance/export/excel
router.get("/export/excel", exportAttendanceToExcel);

/**
 * =========================
 * Daily Attendance (Clock-in/Clock-out)
 * =========================
 */

// Daily attendance routes (clock-in/clock-out for field engineers)
router.use('/', dailyAttendanceRoutes);

export default router;
