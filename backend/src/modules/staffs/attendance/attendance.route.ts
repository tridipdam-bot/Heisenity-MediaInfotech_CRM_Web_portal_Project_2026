// modules/staffs/attendance/attendance.route.ts
import { Router } from "express";

import {
  createAttendance,
  detectDevice,
  getLocationData,
  checkRemainingAttempts,
  getAssignedLocation,
  getAttendanceRecords,
} from "@/modules/staffs/attendance/attendance.controller";

const router = Router();

/**
 * =========================
 * Attendance Core
 * =========================
 */

// Get attendance records
// GET /attendance
router.get("/", getAttendanceRecords);

// Mark attendance (with location validation)
// POST /attendance
router.post("/", createAttendance);

// Detect device (browser, OS, etc.)
// GET /attendance/device
router.get("/device", detectDevice);

// Resolve location data (lat/lng → address)
// Supports:
//  - GET /attendance/location?latitude=..&longitude=..
//  - POST /attendance/location
//  - GET /attendance/location/:latitude/:longitude
router
  .route("/location")
  .get(getLocationData)
  .post(getLocationData);

router.get("/location/:latitude/:longitude", getLocationData);

/**
 * =========================
 * Location & Validation
 * =========================
 */

// Check remaining location validation attempts
// GET /attendance/attempts/:employeeId
router.get("/attempts/:employeeId", checkRemainingAttempts);

// Get assigned location for employee (today)
// GET /attendance/assigned-location/:employeeId
router.get("/assigned-location/:employeeId", getAssignedLocation);

export default router;
