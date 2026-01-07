@echo off
echo Setting up Teams feature...
echo.

cd /d "%~dp0\.."

echo Step 1: Generating Prisma Client...
call npx prisma generate

echo.
echo Step 2: Running database migration...
call npx prisma migrate deploy

echo.
echo Step 3: Seeding sample teams (optional)...
set /p SEED="Do you want to seed sample teams? (y/n): "
if /i "%SEED%"=="y" (
    call npx ts-node prisma/seed-teams.ts
)

echo.
echo ✅ Teams feature setup complete!
echo.
echo Next steps:
echo 1. Restart your backend server
echo 2. Assign employees to teams using the employee management API
echo 3. Test the team selection in the Assign Task page
echo.
echo For more information, see backend/TEAM_FEATURE_README.md
pause
