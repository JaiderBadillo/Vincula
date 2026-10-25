@echo off
title Bolsa de Empleo - Vincula UTS
color 0A

echo ========================================================
echo           BOLSA DE EMPLEO - VINCULA UTS
echo ========================================================
echo.

:: Moverse a la carpeta del frontend sin importar desde donde se ejecute
cd /d "%~dp0frontend"

:: 1. Verificar si Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] No se encontro Node.js instalado en el sistema.
    echo Por favor descarga e instala Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Verificar dependencias (node_modules)
if not exist "node_modules\" (
    echo [INFO] Carpeta node_modules no encontrada.
    echo Instalando dependencias con npm install, por favor espera...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [ERROR] Ocurrio un problema al instalar dependencias.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencias instaladas con exito.
    echo.
)

:: 3. Verificar si el servidor ya esta corriendo en el puerto 5173
netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] El servidor ya se encuentra ACTIVO en el puerto 5173.
    echo Abriendo la aplicacion en tu navegador...
    start "" "http://localhost:5173/"
    ping 127.0.0.1 -n 2 >nul
    exit /b 0
)

echo [OK] Iniciando servidor de desarrollo Vite...
echo.
echo  Enlaces directos disponibles:
echo    - Inicio (Landing):   http://localhost:5173/
echo    - Dashboard:          http://localhost:5173/dashboard
echo    - Explorar Vacantes:  http://localhost:5173/dashboard/vacantes
echo    - Iniciar Sesion:     http://localhost:5173/login
echo.
echo  Abriendo http://localhost:5173/ en tu navegador predeterminado...
echo  (Presiona Ctrl + C en esta ventana cuando desees detener el servidor)
echo ========================================================
echo.

:: Abrir navegador en 2 segundos cuando Vite ya haya inicializado
start "" cmd /c "ping 127.0.0.1 -n 3 >nul & start http://localhost:5173/"

:: Ejecutar servidor de desarrollo
call npm run dev

pause
