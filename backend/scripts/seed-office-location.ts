import { PrismaClient } from '../generated/prisma'

const prisma = new PrismaClient()

async function seedOfficeLocation() {
  try {
    console.log('🌱 Seeding office location configuration...')

    // Check if office location already exists
    const existingConfig = await prisma.systemConfiguration.findUnique({
      where: { key: 'office_location' }
    })

    if (existingConfig) {
      console.log(`✅ Office location already configured: "${existingConfig.value}"`)
      return
    }

    // Create default office location
    await prisma.systemConfiguration.create({
      data: {
        key: 'office_location',
        value: 'Main Office'
      }
    })

    console.log('✅ Default office location configured: "Main Office"')
    console.log('💡 You can change this in the Office Attendance Settings page')

  } catch (error) {
    console.error('❌ Error seeding office location:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedOfficeLocation()
    .then(() => {
      console.log('🎉 Office location seeding completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Office location seeding failed:', error)
      process.exit(1)
    })
}

export { seedOfficeLocation }