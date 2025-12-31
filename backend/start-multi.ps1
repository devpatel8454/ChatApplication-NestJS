# Start Server 1 on Port 3000
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\nestjs\websockect\backend; `$env:PORT=3000; npm run start:dev"

# Start Server 2 on Port 3001
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\nestjs\websockect\backend; `$env:PORT=3001; npm run start:dev"

# Start Server 3 on Port 3002
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd d:\nestjs\websockect\backend; `$env:PORT=3002; npm run start:dev"

Write-Host "Three backend instances are starting on:" -ForegroundColor Cyan
Write-Host " - http://192.168.29.185:3000" -ForegroundColor White
Write-Host " - http://192.168.29.185:3001" -ForegroundColor White
Write-Host " - http://192.168.29.185:3002" -ForegroundColor White
Write-Host "They are all synchronized via Redis!" -ForegroundColor Green

