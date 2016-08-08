@echo off
title excel2sql-tool by Jun.li
mode con cols=50 lines=40
::设置窗口位置后自动重新调用本批处理
set rr="HKCU\Console\%%SystemRoot%%_system32_cmd.exe"
reg delete %rr% /f>nul
reg add %rr% /v "WindowPosition" /t REG_DWORD /d 0x0640309 /f>nul
::call "%~dpnx0"
:code
color 1F
cd src
node main
pause