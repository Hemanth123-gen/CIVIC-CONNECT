@echo off
title CivicPulse (जनसमाधान) Server and Live Tunnel
cls
echo =================================================================
echo             CIVICPULSE CIVIC RESOLUTION PLATFORM
echo =================================================================
echo.
echo Starting backend server on port 5050...
start "CivicPulse Server" cmd /k "cd /d %~dp0 && node server.js"
timeout /t 2 >nul
echo.
echo Starting Live Cloudflare Public Tunnel...
cd /d %~dp0 && node tunnel_runner.cjs
pause
