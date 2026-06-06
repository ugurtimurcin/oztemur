using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using ClosedXML.Excel;

namespace Oztemur.API.Features.Translations;

/// <summary>
/// Renders the translation catalog as an Excel workbook that a non-technical
/// translator can fill in directly. The book has two sheets — an instructions
/// page and the data page. The data page hides the routing columns (type / id
/// / field path) behind ClosedXML's column.Hide() so the translator sees only
/// three meaningful columns: human context, source text, and the cell they
/// type into.
///
/// On the way back in we read those hidden columns to dispatch each
/// translation to the right entity.
/// </summary>
public static class TranslationsXlsx
{
    private const string DataSheetName = "Çeviriler";
    private const string InstructionsSheetName = "Talimatlar";

    // Column layout — visible columns first, hidden routing columns at the
    // far right. The header strings live in code so renaming the file format
    // is a single-spot change.
    private const int ColContext = 1;
    private const int ColStatus = 2;
    private const int ColSource = 3;
    private const int ColTarget = 4;
    private const int ColType = 5;     // hidden
    private const int ColId = 6;       // hidden
    private const int ColField = 7;    // hidden
    private const int ColSourceHash = 8; // hidden — frozen at export time so we can detect "translator edited the source" on re-import

    private const int HeaderRow = 2;
    private const int FirstDataRow = 3;

    public static byte[] Write(string sourceLang, string targetLang, IEnumerable<TranslationRow> rows)
    {
        using var wb = new XLWorkbook();

        BuildInstructionsSheet(wb, sourceLang, targetLang);
        BuildDataSheet(wb, sourceLang, targetLang, rows);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    /// <summary>Parses a translator-completed workbook back into typed rows.
    /// Returns the language codes pulled from the header so the endpoint can
    /// double-check they match the current default language.</summary>
    public static List<ParsedXlsxRow> Read(byte[] bytes, out string sourceLang, out string targetLang)
    {
        sourceLang = string.Empty;
        targetLang = string.Empty;

        using var ms = new MemoryStream(bytes);
        XLWorkbook wb;
        try { wb = new XLWorkbook(ms); }
        catch (Exception ex) { throw new FormatException("File is not a valid .xlsx workbook: " + ex.Message); }

        var ws = wb.Worksheets.FirstOrDefault(w => string.Equals(w.Name, DataSheetName, StringComparison.OrdinalIgnoreCase));
        if (ws == null)
            throw new FormatException($"Workbook is missing the '{DataSheetName}' sheet.");

        // The title row encodes the language pair: "<src> → <tgt>".
        var title = ws.Cell(1, 1).GetString();
        var arrowIdx = title.IndexOf('→');
        if (arrowIdx > 0)
        {
            // Parse "Source: tr  →  Target: de" or similar — be liberal.
            var left = title.Substring(0, arrowIdx);
            var right = title.Substring(arrowIdx + 1);
            sourceLang = ExtractLangCode(left);
            targetLang = ExtractLangCode(right);
        }

        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
        var rows = new List<ParsedXlsxRow>(Math.Max(0, lastRow - FirstDataRow + 1));

        for (int r = FirstDataRow; r <= lastRow; r++)
        {
            var entityType = ws.Cell(r, ColType).GetString().Trim();
            var entityId = ws.Cell(r, ColId).GetString().Trim();
            var fieldPath = ws.Cell(r, ColField).GetString().Trim();
            var source = ws.Cell(r, ColSource).GetString();
            var target = ws.Cell(r, ColTarget).GetString();
            var sourceHash = ws.Cell(r, ColSourceHash).GetString().Trim();
            // Allow a blank row in the middle (translator deletion) — skip
            // rather than report. Rows with no routing key are useless to us.
            if (string.IsNullOrEmpty(entityType) && string.IsNullOrEmpty(entityId) && string.IsNullOrEmpty(fieldPath))
                continue;

            rows.Add(new ParsedXlsxRow(
                ExcelRow: r,
                EntityType: entityType,
                EntityId: entityId,
                FieldPath: fieldPath,
                Source: source,
                Target: target,
                ExportSourceHash: sourceHash));
        }

        return rows;
    }

    public static string HashSource(string source)
    {
        var bytes = Encoding.UTF8.GetBytes(source ?? string.Empty);
        var digest = SHA256.HashData(bytes);
        var sb = new StringBuilder(digest.Length * 2);
        foreach (var b in digest) sb.Append(b.ToString("x2"));
        return sb.ToString();
    }

    // ─── instructions sheet ─────────────────────────────────────────

    private static void BuildInstructionsSheet(XLWorkbook wb, string sourceLang, string targetLang)
    {
        var ws = wb.Worksheets.Add(InstructionsSheetName);
        ws.Column(1).Width = 90;

        ws.Cell(1, 1).Value = "Çeviri Dosyası — Talimatlar";
        ws.Cell(1, 1).Style.Font.SetBold().Font.SetFontSize(20).Font.SetFontColor(XLColor.FromHtml("#000666"));
        ws.Row(1).Height = 32;

        var lines = new[]
        {
            ("Ne yapıyorsunuz?", false),
            ($"Bu dosya, sitedeki tüm metinlerin '{sourceLang.ToUpper()}' dilindeki halini içeriyor. Sizden istenen, her satırın 'ÇEVİRİ — BU SÜTUNA YAZIN' başlıklı sütununa o metnin '{targetLang.ToUpper()}' dilindeki karşılığını yazmanız.", false),
            ("", false),
            ("Adım adım", false),
            ("1.  Çeviriler sekmesine geçin (aşağıda, 'Çeviriler' yazan sekme).", false),
            ("2.  Her satırda solda Türkçe metni okuyun, sağdaki 'ÇEVİRİ' sütununa karşılığını yazın.", false),
            ("3.  Bittiğinde dosyayı kaydedin ve geri gönderin. Format aynı kalmalı (.xlsx).", false),
            ("", false),
            ("Renk anahtarı", false),
            ("Eksik          — bu metnin henüz çevirisi yok. Lütfen doldurun.", true /* color row */),
            ("Güncel değil   — eski bir çeviri var ama Türkçe kaynak metin sonradan değiştirildi. Lütfen yeniden çevirin.", true),
            ("Güncel         — zaten doğru çeviri var. İsterseniz iyileştirebilirsiniz, isterseniz dokunmayın.", true),
            ("", false),
            ("Dikkat", false),
            ("•  Satırları silmeyin, sıralarını değiştirmeyin.", false),
            ("•  'TÜRKÇE METİN' sütununa dokunmayın — sistem bu metni karşılaştırmak için kullanıyor.", false),
            ("•  Sağ tarafta gizli sütunlar var (sistem tarafından kullanılıyor). Onları görmek/açmak gerekmiyor.", false),
            ("•  Excel dışında bir programla (Google Sheets, LibreOffice) açıp kaydetmek de sorun değil — yeter ki .xlsx olarak kaydedin.", false),
            ("", false),
            ($"Kaynak dil:  {sourceLang.ToUpper()}   |   Hedef dil:  {targetLang.ToUpper()}   |   Hazırlanma tarihi: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC", false),
        };

        int row = 3;
        foreach (var (text, isColorLine) in lines)
        {
            ws.Cell(row, 1).Value = text;
            ws.Cell(row, 1).Style.Alignment.WrapText = true;
            // Bold the section headings (the short ones that don't start with a digit or bullet).
            if (text.Length > 0 && text.Length < 30 && !text.StartsWith(" ") && !text.StartsWith("•") && !char.IsDigit(text[0]))
            {
                ws.Cell(row, 1).Style.Font.SetBold().Font.SetFontSize(13).Font.SetFontColor(XLColor.FromHtml("#000666"));
            }
            if (isColorLine)
            {
                // Tint the legend rows so the visual cue matches the data sheet.
                if (text.StartsWith("Eksik"))         ws.Cell(row, 1).Style.Fill.BackgroundColor = XLColor.FromHtml("#fdecea");
                else if (text.StartsWith("Güncel değil")) ws.Cell(row, 1).Style.Fill.BackgroundColor = XLColor.FromHtml("#fff3cd");
                else if (text.StartsWith("Güncel"))   ws.Cell(row, 1).Style.Fill.BackgroundColor = XLColor.FromHtml("#e6f4ea");
            }
            row++;
        }
    }

    // ─── data sheet ─────────────────────────────────────────────────

    private static void BuildDataSheet(XLWorkbook wb, string sourceLang, string targetLang, IEnumerable<TranslationRow> rows)
    {
        var ws = wb.Worksheets.Add(DataSheetName);
        // Same-language mode is a bulk-edit affordance: admin pulls the
        // entire source dictionary into a single editable column. The
        // "source" column becomes redundant (it equals the target) so we
        // hide it; the status column flips from "translation freshness"
        // semantics to plain "has content / is empty".
        var sameLanguage = string.Equals(sourceLang, targetLang, StringComparison.OrdinalIgnoreCase);

        // Row 1 — title that doubles as language metadata. Read-back uses
        // this — keep the "src → tgt" shape even when they're equal so the
        // parser stays one code path.
        var modeNote = sameLanguage ? "Türkçe içerik düzenleme · " : "";
        ws.Cell(1, ColContext).Value = $"Kaynak: {sourceLang}  →  Hedef: {targetLang}   ·   {modeNote}Hazırlanma: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC";
        ws.Range(1, ColContext, 1, ColTarget).Merge();
        ws.Cell(1, ColContext).Style.Font.SetBold().Font.SetFontSize(13)
            .Font.SetFontColor(XLColor.White)
            .Fill.SetBackgroundColor(XLColor.FromHtml("#000666"))
            .Alignment.SetVertical(XLAlignmentVerticalValues.Center)
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Left)
            .Alignment.SetIndent(1);
        ws.Row(1).Height = 28;

        // Row 2 — headers.
        ws.Cell(HeaderRow, ColContext).Value = "NEREYE GİDİYOR?";
        ws.Cell(HeaderRow, ColStatus).Value = "DURUM";
        ws.Cell(HeaderRow, ColSource).Value = $"TÜRKÇE METİN  (değiştirmeyin)";
        ws.Cell(HeaderRow, ColTarget).Value = sameLanguage
            ? "TÜRKÇE METİN  (düzenleyebilirsiniz)"
            : $"{targetLang.ToUpper()} ÇEVİRİSİ  (bu sütuna yazın)";
        ws.Cell(HeaderRow, ColType).Value = "_type";
        ws.Cell(HeaderRow, ColId).Value = "_id";
        ws.Cell(HeaderRow, ColField).Value = "_field";
        ws.Cell(HeaderRow, ColSourceHash).Value = "_source_hash";

        var headerRange = ws.Range(HeaderRow, ColContext, HeaderRow, ColTarget);
        headerRange.Style.Font.SetBold()
            .Fill.SetBackgroundColor(XLColor.FromHtml("#eef0fb"))
            .Border.SetBottomBorder(XLBorderStyleValues.Medium)
            .Border.SetBottomBorderColor(XLColor.FromHtml("#000666"))
            .Alignment.SetVertical(XLAlignmentVerticalValues.Center);
        // Target column header gets a stronger accent so the translator's eye lands on it.
        ws.Cell(HeaderRow, ColTarget).Style
            .Fill.SetBackgroundColor(XLColor.FromHtml("#fff8c5"))
            .Font.SetFontColor(XLColor.FromHtml("#5c4a00"));
        ws.Row(HeaderRow).Height = 28;

        // Data rows.
        int row = FirstDataRow;
        foreach (var r in rows)
        {
            ws.Cell(row, ColContext).Value = HumanContext(r);
            ws.Cell(row, ColStatus).Value = StatusText(r.Status, sameLanguage);
            ws.Cell(row, ColSource).Value = r.SourceText;
            ws.Cell(row, ColTarget).Value = r.TargetText ?? string.Empty;
            ws.Cell(row, ColType).Value = r.EntityType;
            ws.Cell(row, ColId).Value = r.EntityId.ToString();
            ws.Cell(row, ColField).Value = r.FieldPath;
            ws.Cell(row, ColSourceHash).Value = HashSource(r.SourceText);

            // Status colouring per cell (cheaper + more reliable than
            // conditional formatting for our scale).
            var statusCell = ws.Cell(row, ColStatus);
            statusCell.Style.Font.SetBold().Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
            switch (r.Status)
            {
                case TranslationStatus.Missing:
                    statusCell.Style.Fill.BackgroundColor = XLColor.FromHtml("#fdecea");
                    statusCell.Style.Font.FontColor = XLColor.FromHtml("#9d2222");
                    break;
                case TranslationStatus.Stale:
                    statusCell.Style.Fill.BackgroundColor = XLColor.FromHtml("#fff3cd");
                    statusCell.Style.Font.FontColor = XLColor.FromHtml("#8a6d00");
                    break;
                case TranslationStatus.UpToDate:
                    statusCell.Style.Fill.BackgroundColor = XLColor.FromHtml("#e6f4ea");
                    statusCell.Style.Font.FontColor = XLColor.FromHtml("#2e7d32");
                    break;
            }

            // Visual cue for the source vs target columns.
            ws.Cell(row, ColSource).Style
                .Fill.SetBackgroundColor(XLColor.FromHtml("#f8f9fb"))
                .Font.SetItalic();
            ws.Cell(row, ColTarget).Style
                .Fill.SetBackgroundColor(XLColor.FromHtml("#fffef5"));

            // Wrap text in the long columns.
            ws.Cell(row, ColContext).Style.Alignment.WrapText = true;
            ws.Cell(row, ColSource).Style.Alignment.WrapText = true;
            ws.Cell(row, ColTarget).Style.Alignment.WrapText = true;

            row++;
        }

        // Column widths — measured roughly in character units.
        ws.Column(ColContext).Width = 46;
        ws.Column(ColStatus).Width = 14;
        ws.Column(ColSource).Width = 50;
        ws.Column(ColTarget).Width = 50;
        // Hide the routing columns so the translator sees a clean
        // three- or two-column layout. They're still written + readable
        // on round-trip via the hidden values.
        ws.Column(ColType).Hide();
        ws.Column(ColId).Hide();
        ws.Column(ColField).Hide();
        ws.Column(ColSourceHash).Hide();
        // Bulk-edit mode: the "source" column would just duplicate the
        // editable one, so hide it. Import reads the visible Target column.
        if (sameLanguage) ws.Column(ColSource).Hide();

        // Freeze title + header so they stay on-screen while scrolling.
        ws.SheetView.FreezeRows(HeaderRow);

        // Vertical alignment for all data cells so wrapped text reads top-down.
        if (row > FirstDataRow)
        {
            ws.Range(FirstDataRow, ColContext, row - 1, ColTarget).Style
                .Alignment.SetVertical(XLAlignmentVerticalValues.Top);
        }

        // Make Çeviriler the active sheet on open — translators land where they work.
        ws.SetTabActive();
    }

    private static string StatusText(TranslationStatus s, bool sameLanguage) => sameLanguage
        ? s switch
        {
            TranslationStatus.Missing => "Boş",
            TranslationStatus.UpToDate => "Dolu",
            _ => "?"
        }
        : s switch
        {
            TranslationStatus.Missing => "Eksik",
            TranslationStatus.Stale => "Güncel değil",
            TranslationStatus.UpToDate => "Güncel",
            _ => "?"
        };

    /// <summary>
    /// Builds the one-line "where is this from?" string the translator sees
    /// in column A. The goal: anyone who has seen the public site can match
    /// the string to a page region without learning the data model.
    /// </summary>
    private static string HumanContext(TranslationRow r)
    {
        var typePrefix = r.EntityType switch
        {
            "Project"          => "Proje",
            "Company"          => "Şirket",
            "NewsArticle"      => "Haber",
            "BlogPost"         => "Blog yazısı",
            "JobRequisition"   => "İş ilanı",
            "LeadershipMember" => "Yönetim",
            "UiString"         => "Arayüz metni",
            "PageSection"      => "Sayfa bölümü",
            _ => r.EntityType
        };
        var field = HumanField(r.FieldPath);
        return $"{typePrefix} · {r.EntityLabel} · {field}";
    }

    private static string HumanField(string fieldPath)
    {
        // Timeline[2].Phase → "Zaman çizelgesi #3 — Aşama"
        if (fieldPath.StartsWith("Timeline[", StringComparison.Ordinal))
        {
            var close = fieldPath.IndexOf(']');
            var dot = fieldPath.IndexOf('.', close);
            if (close > 9 && dot > close && int.TryParse(fieldPath.AsSpan(9, close - 9), out var idx))
            {
                var sub = fieldPath.Substring(dot + 1);
                var subTr = sub switch
                {
                    "Date" => "Tarih",
                    "Phase" => "Aşama",
                    "Details" => "Detay",
                    _ => sub
                };
                return $"Zaman çizelgesi #{idx + 1} — {subTr}";
            }
        }

        if (fieldPath.StartsWith("Requirements[", StringComparison.Ordinal) && fieldPath.EndsWith("]")
            && int.TryParse(fieldPath.AsSpan(13, fieldPath.Length - 14), out var ri))
            return $"Gereksinim #{ri + 1}";

        if (fieldPath.StartsWith("CoreObjectives[", StringComparison.Ordinal) && fieldPath.EndsWith("]")
            && int.TryParse(fieldPath.AsSpan(15, fieldPath.Length - 16), out var ci))
            return $"Ana hedef #{ci + 1}";

        if (fieldPath.StartsWith("Fields.", StringComparison.Ordinal))
            return "Alan: " + fieldPath.Substring("Fields.".Length);

        return fieldPath switch
        {
            "Title"               => "Başlık",
            "Description"         => "Kısa açıklama",
            "LongDescription"     => "Uzun açıklama",
            "Summary"             => "Özet",
            "Content"             => "İçerik",
            "Name"                => "Ad",
            "Sector"              => "Sektör",
            "Address"             => "Adres",
            "DetailedDescription" => "Detaylı açıklama",
            "Category"            => "Kategori",
            "Location"            => "Konum",
            "Budget"              => "Bütçe",
            "Department"          => "Departman",
            "Role"                => "Rol",
            "Bio"                 => "Biyografi",
            "Value"               => "Değer",
            _ => fieldPath
        };
    }

    private static string ExtractLangCode(string fragment)
    {
        // Pulls "tr" out of "Kaynak: tr" or "Source: tr" — splits on ":" and trims.
        var colon = fragment.IndexOf(':');
        var raw = colon >= 0 ? fragment.Substring(colon + 1) : fragment;
        // Stop at the first non-letter character.
        var sb = new StringBuilder();
        foreach (var c in raw.Trim())
        {
            if (char.IsLetter(c)) sb.Append(char.ToLowerInvariant(c));
            else if (sb.Length > 0) break;
        }
        return sb.ToString();
    }
}

public record ParsedXlsxRow(
    int ExcelRow,
    string EntityType,
    string EntityId,
    string FieldPath,
    string Source,
    string Target,
    string ExportSourceHash);
