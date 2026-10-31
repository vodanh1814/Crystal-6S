@echo off
chcp 65001 >nul
title Crystal 5S Audit - Trình Cài Đặt & Khởi Chạy Tự Động (1-Click)
cd /d "%~dp0"
node scripts\auto_setup.mjs
pause
