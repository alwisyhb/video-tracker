@echo off
echo ========================================================
echo   Membangun Aplikasi Android Alwi Video Tracker (.APK)
echo ========================================================
call npm.cmd run build
call npx.cmd cap sync android
cd android
call gradlew.bat assembleDebug
cd ..
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "Alwi_Video_Tracker.apk"
    echo.
    echo [SUKSES] File APK berhasil dibuat: c:\F\Project_Tracker\Alwi_Video_Tracker.apk
    echo Silakan kirim file Alwi_Video_Tracker.apk ke HP Android Anda dan install!
) else (
    echo.
    echo [INFO] Anda juga dapat membuka proyek di Android Studio dengan perintah:
    echo npx cap open android
)
pause
