#!/bin/bash

echo "Setting up Teams feature..."
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/.."

echo "Step 1: Generating Prisma Client..."
npx prisma generate

echo ""
echo "Step 2: Running database migration..."
npx prisma migrate deploy

echo ""
echo "Step 3: Seeding sample teams (optional)..."
read -p "Do you want to seed sample teams? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    npx ts-node prisma/seed-teams.ts
fi

echo ""
echo "✅ Teams feature setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart your backend server"
echo "2. Assign employees to teams using the employee management API"
echo "3. Test the team selection in the Assign Task page"
echo ""
echo "For more information, see backend/TEAM_FEATURE_README.md"
