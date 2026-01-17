/**
 * Utility script to revoke all features from a staff member
 * Usage: node scripts/revoke-all-features.js <employeeId> <adminId>
 * Example: node scripts/revoke-all-features.js EMP001 admin123
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

async function revokeAllFeatures(employeeId, adminId) {
  try {
    console.log(`Revoking all features from employee: ${employeeId}`)
    
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
    
    // Revoke all features
    for (const feature of ALL_FEATURES) {
      await prisma.staffFeatureAccess.upsert({
        where: {
          employeeId_feature: {
            employeeId: employee.id,
            feature: feature
          }
        },
        update: {
          isAllowed: false,
          grantedBy: adminId,
          updatedAt: new Date()
        },
        create: {
          employeeId: employee.id,
          feature: feature,
          isAllowed: false,
          grantedBy: adminId
        }
      })
      
      console.log(`✗ Revoked ${feature} feature`)
    }
    
    console.log(`\n🚫 Successfully revoked all ${ALL_FEATURES.length} features from ${employee.name}!`)
    
  } catch (error) {
    console.error('Error revoking features:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)

if (args.length !== 2) {
  console.log('Usage: node scripts/revoke-all-features.js <employeeId> <adminId>')
  console.log('Example: node scripts/revoke-all-features.js EMP001 admin123')
  process.exit(1)
}

const [employeeId, adminId] = args

revokeAllFeatures(employeeId, adminId)