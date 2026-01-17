/**
 * Utility script to grant all features to a staff member
 * Usage: node scripts/grant-all-features.js <employeeId> <adminId>
 * Example: node scripts/grant-all-features.js EMP001 admin123
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const ALL_FEATURES = [
  'DASHBOARD',
  'PROJECT', 
  'TASK_MANAGEMENT',
  'PAYROLL',
  'VEHICLE',
  'CUSTOMERS',
  'EMPLOYEES',
  'TEAMS',
  'TENDERS',
  'STOCK',
  'LEAVE_MANAGEMENT',
  'FIELD_ENGINEER_ATTENDANCE',
  'INOFFICE_ATTENDANCE',
  'CUSTOMER_SUPPORT_REQUESTS',
  'STAFF_FEATURE_ACCESS'
]

async function grantAllFeatures(employeeId, adminId) {
  try {
    console.log(`Granting all features to employee: ${employeeId}`)
    
    // Check if employee exists and is IN_OFFICE
    const employee = await prisma.employee.findFirst({
      where: { employeeId: employeeId }
    })
    
    if (!employee) {
      console.error(`Employee with ID ${employeeId} not found`)
      return
    }
    
    if (employee.role !== 'IN_OFFICE') {
      console.error(`Employee ${employeeId} is not an IN_OFFICE employee (role: ${employee.role})`)
      return
    }
    
    console.log(`Found employee: ${employee.name} (${employee.email})`)
    
    // Grant all features
    for (const feature of ALL_FEATURES) {
      await prisma.staffFeatureAccess.upsert({
        where: {
          employeeId_feature: {
            employeeId: employee.id,
            feature: feature
          }
        },
        update: {
          isAllowed: true,
          grantedBy: adminId,
          updatedAt: new Date()
        },
        create: {
          employeeId: employee.id,
          feature: feature,
          isAllowed: true,
          grantedBy: adminId
        }
      })
      
      console.log(`✓ Granted ${feature} feature`)
    }
    
    console.log(`\n🎉 Successfully granted all ${ALL_FEATURES.length} features to ${employee.name}!`)
    
  } catch (error) {
    console.error('Error granting features:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)

if (args.length !== 2) {
  console.log('Usage: node scripts/grant-all-features.js <employeeId> <adminId>')
  console.log('Example: node scripts/grant-all-features.js EMP001 admin123')
  process.exit(1)
}

const [employeeId, adminId] = args

grantAllFeatures(employeeId, adminId)