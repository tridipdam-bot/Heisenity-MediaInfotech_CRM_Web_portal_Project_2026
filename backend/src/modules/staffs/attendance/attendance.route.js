// modules/staffs/attendance/attendance.route.ts
import { Router } from "express";
import { createAttendance, detectDevice, checkRemainingAttempts, getAttendanceRecords, deleteAttendanceRecord, } from "@/modules/staffs/attendance/attendance.controller";
import { exportAttendanceToExcel, exportAttendanceToPDF, } from "@/modules/staffs/attendance/attendance.export";
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
// Delete attendance record
// DELETE /attendance/:id
router.delete("/:id", deleteAttendanceRecord);
// Detect device (browser, OS, etc.)
// GET /attendance/device
router.get("/device", detectDevice);
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
// Export attendance to PDF
// GET /attendance/export/pdf", exportAttendanceToPDF);
router.get("/export/pdf", exportAttendanceToPDF);
export default router;
