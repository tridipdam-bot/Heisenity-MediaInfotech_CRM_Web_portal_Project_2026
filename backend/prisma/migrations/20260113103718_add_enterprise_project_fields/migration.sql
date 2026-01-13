-- AlterTable
ALTER TABLE `project_payments` ADD COLUMN `dueDate` DATE NULL,
    ADD COLUMN `invoiceNumber` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `project_updates` ADD COLUMN `attachments` TEXT NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `projects` ADD COLUMN `budget` DECIMAL(12, 2) NULL,
    ADD COLUMN `clientEmail` VARCHAR(191) NULL,
    ADD COLUMN `clientPhone` VARCHAR(191) NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `endDate` DATE NULL,
    ADD COLUMN `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    ADD COLUMN `progress` INTEGER NULL DEFAULT 0,
    ADD COLUMN `projectManager` VARCHAR(191) NULL,
    ADD COLUMN `tags` TEXT NULL;
