# =============================================================
# Edición académica directa de "tesis recortada.docx"
# Aplica correcciones ortográficas, gramaticales, de estilo y
# de jerarquía de títulos directamente sobre el documento.
# Conserva texto, imágenes, diagramas y alcance original.
# =============================================================

$src = "C:\Users\popet\OneDrive\Desktop\tesis recortada.docx"
$out = "C:\Users\popet\OneDrive\Desktop\Tesis_TeleImport_Editada.docx"

# Constantes Word
$wdReplaceAll       = 2
$wdFindContinue     = 1
$wdPageBreak        = 7
$wdAlignParaJustify = 3
$wdAlignParaCenter  = 1
$wdStyleHeading1    = -2
$wdStyleHeading2    = -3
$wdStyleHeading3    = -4
$wdStyleNormal      = -1
$wdFormatXMLDocument = 12

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    $doc = $word.Documents.Open($src, $false, $true)  # ReadOnly = true

    # -------------------------------------------------------------
    # 1) Eliminar placeholders y texto basura
    # -------------------------------------------------------------
    $junkReplacements = @(
        @("aaHora de Fin: 15:30 HSHora de Fin: 15:30 HS", ""),
        @("Hora de Fin: 15:30 HSHora de Fin: 15:30 HS", "Hora de Fin: 15:30 HS")
    )

    foreach ($pair in $junkReplacements) {
        $find = $doc.Content.Find
        $find.ClearFormatting()
        $find.Replacement.ClearFormatting()
        $find.Text = $pair[0]
        $find.Replacement.Text = $pair[1]
        $find.Forward = $true
        $find.Wrap = $wdFindContinue
        $find.MatchCase = $true
        $find.Execute([ref]$pair[0], [ref]$false, [ref]$true, [ref]$false, [ref]$false, [ref]$false, [ref]$true,
                      [ref]$wdFindContinue, [ref]$false, [ref]$pair[1], [ref]$wdReplaceAll) | Out-Null
    }

    # Eliminar párrafos consistentes únicamente en "aa", "a" o "Hora de Fin: 15:30 HS" sueltos
    $junkTexts = @("aa", "a")
    $i = $doc.Paragraphs.Count
    while ($i -ge 1) {
        $p = $doc.Paragraphs.Item($i)
        $t = $p.Range.Text.Trim([char]13, [char]7, ' ', "`t", "`r", "`n")
        if ($junkTexts -contains $t) {
            $p.Range.Delete() | Out-Null
        }
        $i--
    }

    # Eliminar las dos líneas duplicadas "Hora de Fin: 15:30 HS" sueltas en el cap 4
    # (las que aparecen después del primer bloque de entrevista de logística)
    # Solo eliminamos a partir de la 3ra aparición en adelante (las 2 primeras pueden ser legítimas).
    $count = 0
    for ($i = 1; $i -le $doc.Paragraphs.Count; $i++) {
        $p = $doc.Paragraphs.Item($i)
        $t = $p.Range.Text.Trim([char]13, ' ', "`t", "`r", "`n")
        if ($t -eq "Hora de Fin: 15:30 HS") {
            $count++
            if ($count -ge 2) {
                $p.Range.Delete() | Out-Null
                $i--
            }
        }
    }

    # -------------------------------------------------------------
    # 2) Correcciones ortográficas y gramaticales (case-sensitive)
    # -------------------------------------------------------------
    # Pares: [find, replace, matchCase, wholeWord]
    $orthography = @(
        # Tildes y errores
        @("administrara",          "administrará",          $true, $true),
        @("catalogo",              "catálogo",              $true, $true),
        @("Auditoria",             "Auditoría",             $true, $true),
        @("auditoria",             "auditoría",             $true, $true),
        @("notificara",            "notificará",            $true, $true),
        @("diagnostico",           "diagnóstico",           $true, $true),
        @("seria",                 "sería",                 $true, $true),
        @("en caminarnos",         "encaminarnos",          $false, $false),
        @("trasferencias",         "transferencias",        $true, $true),
        @("responsivos",           "responsivo",            $true, $true),
        # Correcciones de mayúsculas mal pegadas
        @("COFORME",               "CONFORME",              $true, $true),
        @("LOANTERIOR",            "LO ANTERIOR",           $true, $true),
        @("TIEMPODEPENDE",         "TIEMPO DEPENDE",        $true, $true),
        @("ATRAVES",               "A TRAVÉS",              $true, $true),
        @("LOGISTICAN°2",          "LOGÍSTICA N° 2",        $true, $true),
        @("LOGISTICAN°",           "LOGÍSTICA N° ",         $true, $false),
        @("ATENCI ON",             "ATENCIÓN",              $true, $false),
        @("TELEIMPORTS.A.",        "TELE IMPORT S.A.",      $true, $false),
        @("TELE IMPORTS.A.",       "TELE IMPORT S.A.",      $true, $false),
        @("SCIPIONIRICARDO",       "SCIPIONI RICARDO",      $true, $false),
        @("Tele Import SA",        "Tele Import S.A.",      $true, $false),
        # Tildes en mayúsculas del Cap 4
        @("ORGANIZACION",          "ORGANIZACIÓN",          $true, $true),
        @("ATENCION",              "ATENCIÓN",              $true, $true),
        @("LOGISTICA",             "LOGÍSTICA",             $true, $true),
        @("MERCADERIA",            "MERCADERÍA",            $true, $true),
        @("ELECTRONICOS",          "ELECTRÓNICOS",          $true, $true),
        @("OBSERVACION",           "OBSERVACIÓN",           $true, $true),
        @("PROBLEMATICA",          "PROBLEMÁTICA",          $true, $true),
        @("DESPACHO DE MERCADERIA","DESPACHO DE MERCADERÍA",$true, $false),
        @("ANALISIS",              "ANÁLISIS",              $true, $true),
        @("INFORMACION",           "INFORMACIÓN",           $true, $true),
        # Tildes acentuales sueltas
        @("Cuil/Cuit",             "CUIL / CUIT",           $true, $false),
        # Limpieza de títulos (case sensitive — sólo el título exacto)
        @("Limites",               "Límites",               $true, $true),
        # Ítem 7 mal redactado en la entrevista 1
        @("¿Quién O QUIENES",      "¿QUIÉN O QUIÉNES",      $true, $false),
        # Corregir "esta" verbo en casos puntuales del cap 4 y 5
        @("EN CASO QUE EL PRODUCTO NO ESTE", "EN CASO DE QUE EL PRODUCTO NO ESTÉ", $true, $false),
        @("SI ESTA COFORME",       "SI ESTÁ CONFORME",      $true, $false),
        @("SI ESTA CONFORME",      "SI ESTÁ CONFORME",      $true, $false),
        @("SI ESTA MUY DEMANDADO", "SI ESTÁ MUY DEMANDADO", $true, $false),
        @("EN CASO QUE",           "EN CASO DE QUE",        $true, $false),
        @("el producto este en el deposito", "el producto esté en el depósito", $false, $false),
        @("el producto este en el depósito", "el producto esté en el depósito", $false, $false),
        @("el producto esta en el deposito", "el producto está en el depósito", $false, $false),
        @("verifica su existencia en el deposito", "verifica su existencia en el depósito", $false, $false),
        @("En el caso que",        "En el caso de que",     $false, $false),
        @("en caso que",           "en caso de que",        $false, $false),
        # Capítulos: unificar a "Capítulo N:"
        @("CAPITULO 3:",           "Capítulo 3:",           $true, $false),
        @("CAPITULO 4:",           "Capítulo 4:",           $true, $false),
        @("CAPITULO 5:",           "Capítulo 5:",           $true, $false),
        # Eliminar duplicaciones de texto fugitivas
        @("Hora de Inicio: 15:00 HSHora de Fin: 15:30 HS", "Hora de Inicio: 15:00 HS`nHora de Fin: 15:30 HS", $true, $false)
    )

    foreach ($r in $orthography) {
        $f = $doc.Content.Find
        $f.ClearFormatting()
        $f.Replacement.ClearFormatting()
        $f.Text = $r[0]
        $f.Replacement.Text = $r[1]
        $f.Forward = $true
        $f.Wrap = $wdFindContinue
        $f.MatchCase = [bool]$r[2]
        $f.MatchWholeWord = [bool]$r[3]
        $f.Execute([ref]$r[0], [ref]$r[2], [ref]$r[3], [ref]$false, [ref]$false, [ref]$false, [ref]$true,
                   [ref]$wdFindContinue, [ref]$false, [ref]$r[1], [ref]$wdReplaceAll) | Out-Null
    }

    # -------------------------------------------------------------
    # 3) Aplicar jerarquía de títulos correcta
    # -------------------------------------------------------------
    $titleStyleMap = @{
        "Capítulo 3: Mandato del Proyecto" = $wdStyleHeading1
        "Capítulo 4: Análisis del Sistema. Relevamiento y Recolección de Información" = $wdStyleHeading1
        "Capítulo 5: Diagnóstico del proyecto" = $wdStyleHeading1
        "Descripción de la Empresa" = $wdStyleHeading2
        "Problemática Encontrada" = $wdStyleHeading2
        "Objetivo" = $wdStyleHeading2
        "Límites" = $wdStyleHeading2
        "Alcance" = $wdStyleHeading2
        "ENTREVISTAS" = $wdStyleHeading2
        "ANÁLISIS DE PROCESOS INTERNOS MEDIANTE LAS TECNICAS DE OBSERVACION DIRECTA, ENTREVISTA Y ANALISIS DE DOCUMENTACION" = $wdStyleHeading2
        "Identificación del problema" = $wdStyleHeading2
        "Matriz de priorización de problema" = $wdStyleHeading3
        "Relación mandato-diagnostico" = $wdStyleHeading2
        "Relación mandato-diagnóstico" = $wdStyleHeading2
        "Población Objetivo" = $wdStyleHeading2
        "Actores involucrados" = $wdStyleHeading2
        "Operación: Venta" = $wdStyleHeading3
        "Flujograma del proceso de ventas" = $wdStyleHeading3
    }

    # Recorrer todos los párrafos y aplicar estilos
    $totalParas = $doc.Paragraphs.Count
    for ($p = 1; $p -le $totalParas; $p++) {
        $para = $doc.Paragraphs.Item($p)
        $txt = $para.Range.Text.Trim([char]13, [char]7, ' ', "`t", "`r", "`n")
        if ($titleStyleMap.ContainsKey($txt)) {
            try { $para.Style = $titleStyleMap[$txt] } catch {}
        }
        # Quitar Heading6 de líneas que no son títulos (campos de planilla, ítems de lista)
        $notTitles = @(
            "PERSONAS A CARGO:1", "PERSONAS A CARGO:5",
            "PERSONAS A CARGO: 1", "PERSONAS A CARGO: 5",
            "Cliente.", "Operario de depósito.", "Operario de deposito."
        )
        if ($notTitles -contains $txt) {
            try { $para.Style = $wdStyleNormal } catch {}
        }
    }

    # -------------------------------------------------------------
    # 4) Insertar saltos de página antes de cada capítulo
    # -------------------------------------------------------------
    $chapterStarts = @(
        "Capítulo 3: Mandato del Proyecto",
        "Capítulo 4: Análisis del Sistema. Relevamiento y Recolección de Información",
        "Capítulo 5: Diagnóstico del proyecto"
    )

    foreach ($title in $chapterStarts) {
        $find = $doc.Content.Find
        $find.ClearFormatting()
        $find.Text = $title
        $find.Forward = $true
        $find.Wrap = $wdFindContinue
        if ($find.Execute()) {
            # Verificar que no estemos al inicio del documento
            $r = $find.Parent
            if ($r.Start -gt 0) {
                $prev = $doc.Range($r.Start - 1, $r.Start)
                if ($prev.Text -ne [string][char]12) {
                    # Insertar salto de página al inicio del párrafo
                    $insertAt = $doc.Range($r.Start, $r.Start)
                    $insertAt.InsertBreak($wdPageBreak)
                }
            }
        }
    }

    # -------------------------------------------------------------
    # 5) Formato del cuerpo de texto: fuente Arial, justificado, interlineado 1.5
    # -------------------------------------------------------------
    $allText = $doc.Content
    $allText.Font.Name = "Arial"
    # No aplicar tamaño global para no romper títulos
    foreach ($par in $doc.Paragraphs) {
        $st = $par.Style
        $styleName = ""
        try { $styleName = $st.NameLocal } catch { $styleName = "" }
        if ($styleName -notmatch "Heading|Título|Titulo") {
            $par.Range.Font.Name = "Arial"
            $par.Range.Font.Size = 11
            $par.Alignment = $wdAlignParaJustify
            $par.LineSpacingRule = 5  # wdLineSpace1pt5
            $par.LineSpacing = 18
            $par.SpaceAfter = 6
        }
    }

    # -------------------------------------------------------------
    # 6) Configurar márgenes (2.5 cm) y encabezado/pie de página
    # -------------------------------------------------------------
    $pageSetup = $doc.PageSetup
    $cmToPoints = 28.3464567  # 1 cm ≈ 28.35 pt
    $pageSetup.TopMargin    = 2.5 * $cmToPoints
    $pageSetup.BottomMargin = 2.5 * $cmToPoints
    $pageSetup.LeftMargin   = 2.5 * $cmToPoints
    $pageSetup.RightMargin  = 2.5 * $cmToPoints

    # Encabezado: título del trabajo
    foreach ($section in $doc.Sections) {
        $header = $section.Headers.Item(1).Range
        $header.Text = "Tesis — Tele Import S.A."
        $header.Font.Name = "Arial"
        $header.Font.Size = 9
        $header.Font.Italic = $true
        $header.Font.ColorIndex = 16  # gris
        $header.ParagraphFormat.Alignment = $wdAlignParaJustify
        # Pie de página: número de página
        $footer = $section.Footers.Item(1).Range
        $footer.Text = "Página "
        $footer.Font.Name = "Arial"
        $footer.Font.Size = 9
        $footer.ParagraphFormat.Alignment = $wdAlignParaCenter
        # Insertar campo PAGE al final
        $footer.Collapse(0)  # wdCollapseEnd
        $section.Footers.Item(1).Range.Fields.Add($footer, -1, "PAGE", $true) | Out-Null
    }

    # -------------------------------------------------------------
    # 7) Guardar como nuevo archivo
    # -------------------------------------------------------------
    $doc.SaveAs([ref]$out, [ref]$wdFormatXMLDocument)
    $doc.Close($false)

    Write-Host "OK"
    Write-Host "Salida: $out"

} catch {
    Write-Host "ERROR: $_"
    Write-Host $_.ScriptStackTrace
} finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

if (Test-Path $out) {
    $info = Get-Item $out
    Write-Host ("Tamano final: {0:N0} bytes" -f $info.Length)
}
