@echo off
rem Instala a Agenda Casa Aurea neste PC:
rem copia o app para a pasta do usuario (AppData\Local\CasaAurea) e cria o atalho na Area de Trabalho.
rem Nao baixa nada da internet e nao mexe em configuracoes do Windows.
set "CA_ORIGEM=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-Expression ((Get-Content -LiteralPath '%~f0' -Raw -Encoding UTF8) -split '#--POWERSHELL--#')[2]"
echo.
pause
exit /b

#--POWERSHELL--#
$ErrorActionPreference = 'Stop'
$origem = $env:CA_ORIGEM
$destino = Join-Path $env:LOCALAPPDATA 'CasaAurea'
$nome = 'Agenda Casa ' + [char]0x00C1 + 'urea'
try {
  $html = Get-ChildItem -LiteralPath $origem -Filter '*.html' | Select-Object -First 1
  $ico = Join-Path $origem 'casa-aurea.ico'
  if (-not $html -or -not (Test-Path -LiteralPath $ico)) {
    Write-Host 'Nao achei os arquivos do app. Deixe este instalador na mesma pasta do arquivo .html e do casa-aurea.ico.'
    exit 1
  }
  New-Item -ItemType Directory -Force -Path $destino | Out-Null
  $app = Join-Path $destino 'agenda.html'
  Copy-Item -LiteralPath $html.FullName -Destination $app -Force
  Copy-Item -LiteralPath $ico -Destination (Join-Path $destino 'casa-aurea.ico') -Force

  $edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") |
    Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  $atalho = Join-Path ([Environment]::GetFolderPath('Desktop')) ($nome + '.lnk')
  $lnk = (New-Object -ComObject WScript.Shell).CreateShortcut($atalho)
  if ($edge) {
    # Abre numa janela propria, sem barra de endereco, como um aplicativo
    $lnk.TargetPath = $edge
    $lnk.Arguments = '--app="' + ([Uri]$app).AbsoluteUri + '"'
  } else {
    $lnk.TargetPath = $app
  }
  $lnk.IconLocation = (Join-Path $destino 'casa-aurea.ico') + ',0'
  $lnk.WorkingDirectory = $destino
  $lnk.Description = $nome
  $lnk.Save()
  Write-Host ('Pronto! O atalho "' + $nome + '" esta na Area de Trabalho.')
} catch {
  Write-Host ('Nao consegui instalar: ' + $_.Exception.Message)
  exit 1
}
