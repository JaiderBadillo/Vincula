@echo off
setlocal
title Vincula - Iniciando proyecto
color 0A

:: Puertos. El 8000 suele estar ocupado por otros servidores (por ejemplo PHP), por eso el backend usa el 8010.
if not defined API_PORT set "API_PORT=8010"
if not defined WEB_PORT set "WEB_PORT=5173"
set "ROOT=%~dp0"
:: Ruta opcional a abrir en el navegador, por ejemplo: abrir_proyecto.bat dashboard
set "OPEN_PATH=%~1"
:: Tiene prioridad sobre frontend\.env: el frontend siempre habla con el backend de este script
set "VITE_API_BASE_URL=http://localhost:%API_PORT%/api/v1"

echo ========================================================
echo           BOLSA DE EMPLEO - VINCULA UTS
echo ========================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    color 0C
    echo [ERROR] No se encontro Node.js. Instalalo desde https://nodejs.org/
    pause
    exit /b 1
)
where python >nul 2>nul
if errorlevel 1 (
    color 0C
    echo [ERROR] No se encontro Python. Instalalo desde https://www.python.org/
    pause
    exit /b 1
)

echo [1/4] Revisando dependencias del backend...
cd /d "%ROOT%backend"
python -m pip install -q -r requirements.txt
if errorlevel 1 (
    color 0C
    echo [ERROR] No se pudieron instalar las dependencias del backend.
    pause
    exit /b 1
)

echo [2/4] Revisando dependencias del frontend...
cd /d "%ROOT%frontend"
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 (
    color 0C
    echo [ERROR] No se pudieron instalar las dependencias del frontend.
    pause
    exit /b 1
)

echo [3/4] Backend (API) en el puerto %API_PORT%...
netstat -ano | findstr ":%API_PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo       Ya estaba activo.
) else (
    start "Vincula - Backend (puerto %API_PORT%)" /d "%ROOT%backend" cmd /k python -m uvicorn app.main:app --reload --port %API_PORT%
)
call :wait "http://localhost:%API_PORT%/docs" 90
if errorlevel 1 (
    color 0E
    echo [AVISO] El backend no respondio en 90 segundos. Revisa la ventana "Vincula - Backend".
) else (
    echo       Backend listo: http://localhost:%API_PORT%/docs
)

echo [4/4] Frontend en el puerto %WEB_PORT%...
netstat -ano | findstr ":%WEB_PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo       Ya estaba activo. Si ves errores de importacion, cierra su ventana y vuelve a abrir este archivo.
) else (
    start "Vincula - Frontend (puerto %WEB_PORT%)" /d "%ROOT%frontend" cmd /k npm run dev -- --force --port %WEB_PORT% --strictPort
)
call :wait "http://localhost:%WEB_PORT%/" 90
if errorlevel 1 (
    color 0E
    echo [AVISO] El frontend no respondio en 90 segundos. Revisa la ventana "Vincula - Frontend".
    pause
    exit /b 1
)

echo.
echo ========================================================
echo  Todo listo:
echo    - Aplicacion:  http://localhost:%WEB_PORT%/
echo    - API (docs):  http://localhost:%API_PORT%/docs
echo  Para detener todo, cierra las ventanas "Vincula - ..."
echo ========================================================
start "" "http://localhost:%WEB_PORT%/%OPEN_PATH%"
ping -n 4 127.0.0.1 >nul
exit /b 0

:: Espera hasta que la URL responda: call :wait URL SEGUNDOS  (devuelve 0 si respondio)
:wait
for /l %%i in (1,1,%~2) do (
    curl -s -o nul -m 2 %1 && exit /b 0
    ping -n 2 127.0.0.1 >nul
)
exit /b 1
