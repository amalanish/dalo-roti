$AppDir = $PSScriptRoot
if (-not $AppDir) { $AppDir = Get-Location }

$PythonDir = Join-Path $AppDir "python-portable"
$PythonExe = Join-Path $PythonDir "python.exe"
$ZipFile = Join-Path $AppDir "python-portable.zip"
$Url = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip"

if (-not (Test-Path $PythonExe)) {
    Write-Host "Portable Python not found. Downloading from python.org..." -ForegroundColor Cyan
    if (-not (Test-Path $PythonDir)) {
        New-Item -ItemType Directory -Path $PythonDir | Out-Null
    }
    
    Write-Host "Downloading $Url..." -ForegroundColor Yellow
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $Url -OutFile $ZipFile -UseBasicParsing
    
    Write-Host "Extracting to $PythonDir..." -ForegroundColor Yellow
    Expand-Archive -Path $ZipFile -DestinationPath $PythonDir -Force
    
    Write-Host "Cleaning up download..." -ForegroundColor Yellow
    Remove-Item $ZipFile -Force
    Write-Host "Python environment setup complete!" -ForegroundColor Green
} else {
    Write-Host "Python environment already exists." -ForegroundColor Green
}

Write-Host "Starting Python Backend Server..." -ForegroundColor Green
Write-Host "Server will be available at http://localhost:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
& $PythonExe server.py
