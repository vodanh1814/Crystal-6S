@echo off
chcp 65001 >nul
title Crystal 5S Audit - Tự Động Đưa Lên Cloudflare (1-Click Deploy)
cd /d "%~dp0"
node scripts\auto_setup.mjs --cloud
pause
