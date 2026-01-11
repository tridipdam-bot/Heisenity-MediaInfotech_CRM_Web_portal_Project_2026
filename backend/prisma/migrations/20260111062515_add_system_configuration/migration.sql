/*
  Warnings:

  - You are about to drop the `field_engineers` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `attendance_overrides` DROP FOREIGN KEY `attendance_overrides_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `attendances` DROP FOREIGN KEY `attendances_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `daily_locations` DROP FOREIGN KEY `daily_locations_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `field_engineers` DROP FOREIGN KEY `field_engineers_assignedBy_fkey`;

-- DropForeignKey
ALTER TABLE `field_engineers` DROP FOREIGN KEY `field_engineers_teamId_fkey`;

-- DropForeignKey
ALTER TABLE `payroll_records` DROP FOREIGN KEY `payroll_records_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `petrol_bills` DROP FOREIGN KEY `petrol_bills_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `tasks` DROP FOREIGN KEY `tasks_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `user_sessions` DROP FOREIGN KEY `user_sessions_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `vehicles` DROP FOREIGN KEY `vehicles_assignedTo_fkey`;

-- DropTable
DROP TABLE `field_engineers`;

-- CreateTable
CREATE TABLE `employees` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `role` ENUM('FIELD_ENGINEER', 'IN_OFFICE') NOT NULL DEFAULT 'FIELD_ENGINEER',
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `teamId` VARCHAR(191) NULL,
    `isTeamLeader` BOOLEAN NOT NULL DEFAULT false,
    `assignedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `employees_employeeId_key`(`employeeId`),
    UNIQUE INDEX `employees_email_key`(`email`),
    INDEX `employees_teamId_idx`(`teamId`),
    INDEX `employees_assignedBy_fkey`(`assignedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_configurations` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_configurations_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_assignedBy_fkey` FOREIGN KEY (`assignedBy`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_locations` ADD CONSTRAINT `daily_locations_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_overrides` ADD CONSTRAINT `attendance_overrides_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `petrol_bills` ADD CONSTRAINT `petrol_bills_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_records` ADD CONSTRAINT `payroll_records_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
