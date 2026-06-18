# =========================================================
# Normaliza tipografía y maquetación del documento editado.
# Resetea: espaciado entre letras, escala de fuente, kerning,
# sangrías, interlineado y espaciado entre párrafos.
# =========================================================

$src = "C:\Users\popet\OneDrive\Desktop\Tesis_TeleImport_Editada.docx"
$out = "C:\Users\popet\OneDrive\Desktop\Tesis_TeleImport_Formateada.docx"

# Constantes Word
$wdAlignParaJustify  = 3
$wdAlignParaLeft     = 0
$wdAlignParaCenter   = 1
$wdLineSpace1pt5     = 1   # wdLineSpace1pt5 (interlineado fijo 1.5)
$wdLineSpaceSingle   = 0
$wdFormatXMLDocument = 12

$cm = 28.3464567  # 1 cm en puntos

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    $doc = $word.Documents.Open($src, $false, $false)

    # ---------------------------------------------------------
    # 1) Reset GLOBAL de caracteres: spacing, scale, kerning,
    #    position, expanded/condensed, all caps locales, etc.
    # ---------------------------------------------------------
    $all = $doc.Content
    $all.Font.Spacing = 0          # espacio entre letras: normal
    $all.Font.Scaling = 100        # escala horizontal 100%
    $all.Font.Kerning = 0          # kerning desactivado
    $all.Font.Position = 0         # sin superíndice/subíndice manual
    $all.Font.Emboss   = $false
    $all.Font.Engrave  = $false
    $all.Font.Shadow   = $false
    $all.Font.Outline  = $false
    $all.Font.DoubleStrikeThrough = $false
    $all.Font.StrikeThrough       = $false
    # Limpiar resaltados de fondo
    $all.HighlightColorIndex = 0

    # ---------------------------------------------------------
    # 2) Recorrer párrafos y aplicar maquetación limpia.
    #    Heading 1/2/3 conservan su jerarquía pero se normalizan
    #    a Arial con tamaños homogéneos.
    # ---------------------------------------------------------
    $total = $doc.Paragraphs.Count
    for ($i = 1; $i -le $total; $i++) {
        $p = $doc.Paragraphs.Item($i)
        $style = ""
        try { $style = $p.Style.NameLocal } catch { $style = "" }

        # Reset sangrías y tabulaciones residuales
        $pf = $p.Format
        $pf.LeftIndent       = 0
        $pf.RightIndent      = 0
        $pf.FirstLineIndent  = 0
        $pf.CharacterUnitLeftIndent      = 0
        $pf.CharacterUnitRightIndent     = 0
        $pf.CharacterUnitFirstLineIndent = 0
        $pf.WidowControl     = $true

        # Detectar si es título
        $isHeading = $style -match "Heading|Tít|Tit"

        if ($isHeading) {
            $p.Range.Font.Name = "Arial"
            # Tamaños por nivel
            if ($style -match "1") { $p.Range.Font.Size = 16; $p.Range.Font.Bold = $true; $pf.SpaceBefore = 24; $pf.SpaceAfter = 12 }
            elseif ($style -match "2") { $p.Range.Font.Size = 14; $p.Range.Font.Bold = $true; $pf.SpaceBefore = 18; $pf.SpaceAfter = 9 }
            elseif ($style -match "3") { $p.Range.Font.Size = 12; $p.Range.Font.Bold = $true; $pf.SpaceBefore = 12; $pf.SpaceAfter = 6 }
            else { $p.Range.Font.Size = 12; $p.Range.Font.Bold = $true; $pf.SpaceBefore = 12; $pf.SpaceAfter = 6 }
            $p.Range.Font.Color = 0x1F3864    # azul oscuro
            $p.Alignment = $wdAlignParaLeft
            $pf.LineSpacingRule = $wdLineSpaceSingle
        } else {
            $p.Range.Font.Name  = "Arial"
            $p.Range.Font.Size  = 11
            $p.Range.Font.Bold  = $false
            $p.Range.Font.Color = 0    # negro
            $p.Range.Font.Spacing = 0
            $p.Range.Font.Scaling = 100
            $p.Range.Font.Kerning = 0
            $p.Alignment = $wdAlignParaJustify
            $pf.LineSpacingRule = $wdLineSpace1pt5
            $pf.SpaceBefore = 0
            $pf.SpaceAfter  = 6
        }
    }

    # ---------------------------------------------------------
    # 3) Tablas: forzar Arial 11, padding y alineación
    # ---------------------------------------------------------
    foreach ($tbl in $doc.Tables) {
        $tbl.Range.Font.Name = "Arial"
        $tbl.Range.Font.Size = 10
        $tbl.Range.Font.Spacing = 0
        $tbl.Range.Font.Scaling = 100
        try { $tbl.TopPadding    = 4 } catch {}
        try { $tbl.BottomPadding = 4 } catch {}
        try { $tbl.LeftPadding   = 6 } catch {}
        try { $tbl.RightPadding  = 6 } catch {}
        foreach ($row in $tbl.Rows) {
            try { $row.AllowBreakAcrossPages = $false } catch {}
        }
    }

    # ---------------------------------------------------------
    # 4) Márgenes y configuración de página
    # ---------------------------------------------------------
    $ps = $doc.PageSetup
    $ps.TopMargin    = 2.5 * $cm
    $ps.BottomMargin = 2.5 * $cm
    $ps.LeftMargin   = 3.0 * $cm
    $ps.RightMargin  = 2.5 * $cm
    $ps.HeaderDistance = 1.25 * $cm
    $ps.FooterDistance = 1.25 * $cm

    # ---------------------------------------------------------
    # 5) Encabezados y pies de página: tipografía coherente
    # ---------------------------------------------------------
    foreach ($section in $doc.Sections) {
        $h = $section.Headers.Item(1).Range
        $h.Font.Name = "Arial"
        $h.Font.Size = 9
        $h.Font.Spacing = 0
        $h.Font.Scaling = 100
        $h.Font.Italic = $true
        $h.ParagraphFormat.Alignment = $wdAlignParaJustify
        $h.ParagraphFormat.LineSpacingRule = $wdLineSpaceSingle

        $f = $section.Footers.Item(1).Range
        $f.Font.Name = "Arial"
        $f.Font.Size = 9
        $f.Font.Spacing = 0
        $f.Font.Scaling = 100
        $f.ParagraphFormat.Alignment = $wdAlignParaCenter
        $f.ParagraphFormat.LineSpacingRule = $wdLineSpaceSingle
    }

    # ---------------------------------------------------------
    # 6) Guardar
    # ---------------------------------------------------------
    $doc.SaveAs([ref]$out, [ref]$wdFormatXMLDocument)
    $doc.Close($false)
    Write-Host "OK -> $out"

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
