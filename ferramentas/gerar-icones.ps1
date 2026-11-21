# Gera os ícones do app (PNG para iPhone/navegador e .ico para o atalho do Windows).
# Uso: powershell -ExecutionPolicy Bypass -File ferramentas\gerar-icones.ps1
# Desenho: arco dourado (uma porta, a "casa") sobre fundo verde-escuro.
Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$pasta = Join-Path $raiz 'icones'
New-Item -ItemType Directory -Force -Path $pasta | Out-Null

$fundo = [System.Drawing.ColorTranslator]::FromHtml('#16302B')
$ouroClaro = [System.Drawing.ColorTranslator]::FromHtml('#F3D27A')
$ouroEscuro = [System.Drawing.ColorTranslator]::FromHtml('#B8862B')

function New-Arco([float]$cx, [float]$base, [float]$largura, [float]$altura) {
  # Retângulo com o topo em semicírculo
  $r = $largura / 2
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $topoReto = $base - $altura + $r
  $p.AddLine($cx - $r, $base, $cx - $r, $topoReto)
  $p.AddArc($cx - $r, $topoReto - $r, $largura, $largura, 180, 180)
  $p.AddLine($cx + $r, $topoReto, $cx + $r, $base)
  $p.CloseFigure()
  return $p
}

function New-Icone([int]$s, [bool]$cantosRedondos) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::Transparent)

  $pincelFundo = New-Object System.Drawing.SolidBrush($fundo)
  if ($cantosRedondos) {
    $raio = [float]($s * 0.22)
    $q = New-Object System.Drawing.Drawing2D.GraphicsPath
    $q.AddArc(0, 0, $raio * 2, $raio * 2, 180, 90)
    $q.AddArc($s - $raio * 2, 0, $raio * 2, $raio * 2, 270, 90)
    $q.AddArc($s - $raio * 2, $s - $raio * 2, $raio * 2, $raio * 2, 0, 90)
    $q.AddArc(0, $s - $raio * 2, $raio * 2, $raio * 2, 90, 90)
    $q.CloseFigure()
    $g.FillPath($pincelFundo, $q)
  } else {
    $g.FillRectangle($pincelFundo, 0, 0, $s, $s)
  }

  $cx = [float]($s / 2)
  $base = [float]($s * 0.74)
  $ret = New-Object System.Drawing.RectangleF(0, [float]($s * 0.2), $s, [float]($s * 0.6))
  $ouro = New-Object System.Drawing.Drawing2D.LinearGradientBrush($ret, $ouroClaro, $ouroEscuro, 90)

  $externo = New-Arco $cx $base ([float]($s * 0.48)) ([float]($s * 0.52))
  $g.FillPath($ouro, $externo)
  $porta = New-Arco $cx $base ([float]($s * 0.24)) ([float]($s * 0.30))
  $g.FillPath($pincelFundo, $porta)
  # degrau
  $g.FillRectangle($ouro, [float]($cx - $s * 0.31), $base, [float]($s * 0.62), [float]($s * 0.045))

  $g.Dispose()
  return $bmp
}

function Save-Png($bmp, $nome) {
  $caminho = Join-Path $pasta $nome
  $bmp.Save($caminho, [System.Drawing.Imaging.ImageFormat]::Png)
  return $caminho
}

# PNGs: fundo inteiro (o iPhone e o Android arredondam sozinhos)
foreach ($t in @(@(512, 'icone-512.png'), @(192, 'icone-192.png'), @(180, 'apple-touch-icon.png'))) {
  $b = New-Icone $t[0] $false
  Save-Png $b $t[1] | Out-Null
  $b.Dispose()
}

# .ico para o atalho do Windows (cantos arredondados), com PNG dentro de cada tamanho
$tamanhos = @(16, 32, 48, 256)
$imagens = @()
foreach ($t in $tamanhos) {
  $b = New-Icone $t $true
  $ms = New-Object System.IO.MemoryStream
  $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $imagens += , $ms.ToArray()
  $b.Dispose()
}
$saida = New-Object System.IO.MemoryStream
$w = New-Object System.IO.BinaryWriter($saida)
$w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]$tamanhos.Count)
$offset = 6 + 16 * $tamanhos.Count
for ($i = 0; $i -lt $tamanhos.Count; $i++) {
  $t = $tamanhos[$i]
  $lado = if ($t -ge 256) { 0 } else { $t }
  $w.Write([byte]$lado); $w.Write([byte]$lado); $w.Write([byte]0); $w.Write([byte]0)
  $w.Write([UInt16]1); $w.Write([UInt16]32)
  $w.Write([UInt32]$imagens[$i].Length); $w.Write([UInt32]$offset)
  $offset += $imagens[$i].Length
}
foreach ($img in $imagens) { $w.Write($img) }
$w.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $pasta 'casa-aurea.ico'), $saida.ToArray())
$w.Dispose()

Write-Output "Ícones gerados em $pasta"
