@echo off
chcp 65001 >nul
title Đóng Gói Bộ Cài Đặt 5S Audit (Mang Đi Triển Khai Cho Công Ty Khác)
cd /d "%~dp0"
echo ======================================================================
echo   ĐANG ĐÓNG GÓI BỘ CÀI ĐẶT SẠCH (BỎ QUA NODE_MODULES ^& DỮ LIỆU CŨ)...
echo ======================================================================
powershell -NoProfile -Command ^
  "$exclude = @('node_modules', '.wrangler', 'dist', '.dev.vars', 'Crystal_5S_Installer.zip', '*.tsbuildinfo', 'cookies*.txt');" ^
  "$files = Get-ChildItem -Path . -Exclude $exclude;" ^
  "if (Test-Path 'Crystal_5S_Installer.zip') { Remove-Item 'Crystal_5S_Installer.zip' -Force };" ^
  "Compress-Archive -Path $files.FullName -DestinationPath 'Crystal_5S_Installer.zip' -Force;" ^
  "Write-Host '✔ Đã tạo xong file bộ cài sạch: Crystal_5S_Installer.zip' -ForegroundColor Green"
echo.
echo Bạn chỉ cần copy file "Crystal_5S_Installer.zip" này sang máy tính hoặc công ty mới,
echo giải nén ra và nhấp đúp vào "Khởi_Chạy_Crystal_5S.bat" hoặc "Đưa_Lên_Cloudflare_Tự_Động.bat"!
pause
