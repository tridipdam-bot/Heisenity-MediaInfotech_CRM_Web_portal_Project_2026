-- Migration: Separate Task and Attendance Tables
-- This migration removes task-related fields from attendance table
-- and adds check-in/check-out fields to task table

-- Step 1: Add new fields to Task table
ALTER TABLE tasks ADD COLUMN checkIn DATETIME NULL;
ALTER TABLE tasks ADD COLUMN checkOut DATETIME NULL;

-- Step 2: Migrate existing data from attendance to tasks
-- Copy taskStartTime to task.checkIn and taskEndTime to task.checkOut
UPDATE tasks 
SET checkIn = (
  SELECT 
    CASE 
      WHEN a.taskStartTime IS NOT NULL 
      THEN STR_TO_DATE(CONCAT(DATE(a.date), ' ', a.taskStartTime), '%Y-%m-%d %H:%i')
      ELSE NULL 
    END
  FROM attendances a 
  WHERE a.taskId = tasks.id 
  LIMIT 1
),
checkOut = (
  SELECT 
    CASE 
      WHEN a.taskEndTime IS NOT NULL 
      THEN STR_TO_DATE(CONCAT(DATE(a.date), ' ', a.taskEndTime), '%Y-%m-%d %H:%i')
      ELSE NULL 
    END
  FROM attendances a 
  WHERE a.taskId = tasks.id 
  LIMIT 1
);

-- Step 3: Remove task-related fields from attendance table
ALTER TABLE attendances DROP COLUMN taskId;
ALTER TABLE attendances DROP COLUMN taskStartTime;
ALTER TABLE attendances DROP COLUMN taskEndTime;
ALTER TABLE attendances DROP COLUMN taskLocation;

-- Step 4: Remove the foreign key index that's no longer needed
DROP INDEX idx_attendances_taskId ON attendances;

-- Step 5: Add indexes for new task fields
CREATE INDEX idx_tasks_checkIn ON tasks(checkIn);
CREATE INDEX idx_tasks_checkOut ON tasks(checkOut);
CREATE INDEX idx_tasks_status_checkIn ON tasks(status, checkIn);