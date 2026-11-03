@echo off
chcp 65001 >NUL
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local.ps1"
