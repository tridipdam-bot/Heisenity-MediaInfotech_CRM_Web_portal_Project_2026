-- CreateTable
CREATE TABLE `teams` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `teams_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `field_engineers_teamId_idx` ON `field_engineers`(`teamId`);

-- AddForeignKey
ALTER TABLE `field_engineers` ADD CONSTRAINT `field_engineers_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
