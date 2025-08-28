Write-Host "Cargando variables de entorno..." -ForegroundColor Green
Write-Host ""

# Cargar variables desde .env.local
Get-Content .env.local | ForEach-Object { 
    if ($_ -match "^([^#][^=]+)=(.*)$") { 
        $varName = $matches[1].Trim()
        $varValue = $matches[2].Trim()
        
        # Establecer variable de entorno
        [Environment]::SetEnvironmentVariable($varName, $varValue, "Process")
        
        # Mostrar variable cargada (ocultar contraseñas)
        if ($varName -match "PASSWORD|KEY") {
            Write-Host "✅ $varName = ***HIDDEN***" -ForegroundColor Green
        } else {
            Write-Host "✅ $varName = $varValue" -ForegroundColor Green
        }
    } 
}

Write-Host ""
Write-Host "Variables cargadas. Lanzando servidor..." -ForegroundColor Green
npm run dev
