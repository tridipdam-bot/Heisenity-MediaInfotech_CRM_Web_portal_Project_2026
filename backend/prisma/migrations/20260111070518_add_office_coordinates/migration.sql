-- AlterTable
ALTER TABLE `system_configurations` ADD COLUMN `latitude` DECIMAL(10, 8) NULL,
    ADD COLUMN `longitude` DECIMAL(11, 8) NULL,
    ADD COLUMN `radius` INTEGER NULL DEFAULT 100;
