/**
 * Utility script to list all IN_OFFICE staff and their feature access
 * Usage: node scripts/list-staff-features.js
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

async function listStaffFeatures() {
  try {
    console.log('📋 Staff Feature Access Report')
    console.log('=' .repeat(50))
    
    // Get all IN_OFFICE employees
    const employees = await prisma.employee.findMany({
      where: { role: 'IN_OFFICE' },
      include: {
        featureAccess: true
      },
      orderBy: { employeeId: 'asc' }
    })
    
    if (employees.length === 0) {
      console.log('No IN_OFFICE employees found.')
      return
    }
    
    for (const employee of employees) {
      console.log(`\n👤 ${employee.name} (${employee.employeeId})`)
      console.log(`   Email: ${employee.email}`)
      console.log(`   Status: ${employee.status}`)
      
      // Create feature access map
      const featureMap = {}
      employee.featureAccess.forEach(access => {
        featureMap[access.feature] = access.isAllowed
      })
      
      console.log('   Features:')
      let enabledCount = 0
      
      for (const feature of ALL_FEATURES) {
        const isEnabled = featureMap[feature] || false
        const status = isEnabled ? '✅' : '❌'
        console.log(`     ${status} ${feature}`)
        if (isEnabled) enabledCount++
      }
      
      console.log(`   Summary: ${enabledCount}/${ALL_FEATURES.length} features enabled`)
      
      if (enabledCount === ALL_FEATURES.length) {
        console.log('   🎉 ALL FEATURES GRANTED!')
      } else if (enabledCount === 0) {
        console.log('   🚫 NO FEATURES GRANTED')
      }
    }
    
    console.log(`\n📊 Total IN_OFFICE employees: ${employees.length}`)
    
  } catch (error) {
    console.error('Error listing staff features:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listStaffFeatures()