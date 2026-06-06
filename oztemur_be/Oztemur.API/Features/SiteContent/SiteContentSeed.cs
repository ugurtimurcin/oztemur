using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Oztemur.API.Domain.Entities;
using Oztemur.API.Infrastructure.Database;

namespace Oztemur.API.Features.SiteContent;

/// <summary>
/// Seeds the initial site-content rows mirroring the static TR/EN dictionaries
/// shipped with the Next.js frontend.
///
/// Idempotent: only inserts rows that do not yet exist (matched by
/// (PageKey, SectionKey) for sections and Key for UI strings).
/// </summary>
public static class SiteContentSeed
{
    public static async Task RunAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<OztemurDbContext>();

        await SeedSectionsAsync(db);
        await SeedUiStringsAsync(db);
    }

    // ─── helper to build per-language dictionary ─────────────────────────
    private static Dictionary<string, string> Bi(string tr, string en) =>
        new() { ["tr"] = tr, ["en"] = en };

    // ─── upsert helpers ──────────────────────────────────────────────────
    // Inserts the section if it doesn't exist; if it does exist, ADDS any
    // newly-declared field keys without touching values the admin has
    // already edited. Existing keys are left alone — seed never overwrites
    // admin edits.
    private static async Task UpsertSectionAsync(
        OztemurDbContext db,
        string pageKey,
        string sectionKey,
        string description,
        Dictionary<string, Dictionary<string, string>> fields)
    {
        var existing = await db.PageSections
            .FirstOrDefaultAsync(s => s.PageKey == pageKey && s.SectionKey == sectionKey);

        if (existing == null)
        {
            db.PageSections.Add(new PageSection
            {
                PageKey = pageKey,
                SectionKey = sectionKey,
                Description = description,
                Fields = fields,
                IsActive = true
            });
            return;
        }

        // Section exists — merge in any new keys from the seed dictionary
        // that aren't yet present (e.g. heroMedia/heroMediaActive added
        // after the section was originally seeded).
        var merged = new Dictionary<string, Dictionary<string, string>>(existing.Fields);
        var changed = false;
        foreach (var (key, langDict) in fields)
        {
            if (!merged.ContainsKey(key))
            {
                merged[key] = langDict;
                changed = true;
            }
        }
        if (changed)
        {
            existing.Fields = merged;
            db.PageSections.Update(existing);
        }
    }

    // Removes the named field keys from an existing section's Fields dict if
    // present. No-op when the section doesn't exist or none of the keys match.
    // Used to retire UI elements whose backing fields are no longer needed.
    private static async Task RemoveSectionFieldsAsync(
        OztemurDbContext db,
        string pageKey,
        string sectionKey,
        IEnumerable<string> fieldKeys)
    {
        var existing = await db.PageSections
            .FirstOrDefaultAsync(s => s.PageKey == pageKey && s.SectionKey == sectionKey);
        if (existing == null) return;

        var fields = new Dictionary<string, Dictionary<string, string>>(existing.Fields);
        var changed = false;
        foreach (var key in fieldKeys)
        {
            if (fields.Remove(key)) changed = true;
        }
        if (changed)
        {
            existing.Fields = fields;
            db.PageSections.Update(existing);
        }
    }

    private static async Task UpsertUiStringAsync(
        OztemurDbContext db,
        string key,
        string group,
        string description,
        Dictionary<string, string> values)
    {
        var existing = await db.UiStrings.FirstOrDefaultAsync(s => s.Key == key);
        if (existing != null) return;

        db.UiStrings.Add(new UiString
        {
            Key = key,
            Group = group,
            Description = description,
            Values = values
        });
    }

    // ─── PAGE SECTIONS ───────────────────────────────────────────────────
    private static async Task SeedSectionsAsync(OztemurDbContext db)
    {
        // ╔═══ HOME ════════════════════════════════════════════════════════
        // heroMedia / heroMediaActive — admin can upload an image or video
        // and toggle it live. While inactive (or unset) the page renders
        // its hardcoded fallback (the current Unsplash placeholder).
        await UpsertSectionAsync(db, "home", "hero", "Hero on the homepage", new()
        {
            ["heroMedia"]       = Bi("", ""),
            ["heroMediaActive"] = Bi("false", "false"),
            ["eyebrow"]   = Bi("1985'ten bugüne · Bir aile, bir grup", "Since 1985 · A family, a group"),
            ["line1"]     = Bi("Nesilden nesile", "Building generations"),
            ["line2"]     = Bi("güven inşa ediyoruz.", "of trust."),
            ["body"]      = Bi(
                "Öztemur Group Of Companies, inşaat, gayrimenkul, enerji, lojistik ve ticaret alanlarında faaliyet gösteren çok sektörlü bir şirketler ailesidir.",
                "Öztemur Group Of Companies is a multi-sector family of companies operating across construction, real estate, energy, logistics and trade."),
            ["primary"]   = Bi("Grubu Keşfet", "Discover the Group"),
            ["secondary"] = Bi("Bize Ulaşın", "Get in Touch"),
        });

        await UpsertSectionAsync(db, "home", "at_a_glance", "Group-at-a-glance metrics on the homepage", new()
        {
            ["eyebrow"]        = Bi("Bir bakışta", "At a glance"),
            ["title"]          = Bi("Sayılarla Öztemur Group Of Companies", "Öztemur Group Of Companies in numbers"),
            ["intro"]          = Bi(
                "Dört on yıla yaklaşan bir kurumsal birikim, çok sayıda iş kolu ve onlarca markanın oluşturduğu bütüncül bir yapı.",
                "Almost four decades of corporate craft, multiple business lines and a portfolio of brands organised under one disciplined structure."),
            ["item1_value"]    = Bi("40", "40"),
            ["item1_suffix"]   = Bi("+", "+"),
            ["item1_label"]    = Bi("Yıllık Tecrübe", "Years of experience"),
            ["item2_value"]    = Bi("12", "12"),
            ["item2_suffix"]   = Bi("", ""),
            ["item2_label"]    = Bi("Grup Şirketi", "Group companies"),
            ["item3_value"]    = Bi("5", "5"),
            ["item3_suffix"]   = Bi("", ""),
            ["item3_label"]    = Bi("Faaliyet Sektörü", "Sectors of activity"),
            ["item4_value"]    = Bi("500", "500"),
            ["item4_suffix"]   = Bi("+", "+"),
            ["item4_label"]    = Bi("Çalışan", "People employed"),
        });

        await UpsertSectionAsync(db, "home", "sectors", "Companies/sectors showcase on the homepage", new()
        {
            ["eyebrow"] = Bi("Grup şirketleri", "Group companies"),
            ["title"]   = Bi("Tek bir vizyon, çok sektör", "One vision, many sectors"),
            ["intro"]   = Bi(
                "Birbirini tamamlayan sektörlerde faaliyet gösteren markalarımız, ortak bir disiplin ve uzun vadeli bir bakış açısıyla yönetiliyor.",
                "Our brands operate across complementary sectors, run with a shared discipline and a long-term outlook."),
            ["cta"]     = Bi("Tüm Şirketler", "All Companies"),
            ["empty"]   = Bi("Henüz listelenmiş bir şirket yok.", "No companies listed yet."),
            ["sector"]  = Bi("Sektör", "Sector"),
            ["sectorsLabel"] = Bi("Sektörler", "Sectors"),
            ["learnMore"] = Bi("Detay", "Learn more"),
        });

        await UpsertSectionAsync(db, "home", "philosophy", "Editorial philosophy band on the homepage", new()
        {
            ["eyebrow"] = Bi("Kurumsal felsefe", "Corporate philosophy"),
            ["title"]   = Bi("Bir nesilden ötesini düşünmek.", "Thinking past a single generation."),
            ["body"]    = Bi(
                "Bizim için holding olmak, yalnızca farklı sektörlerde şirket sahibi olmak değil; ortak bir disiplin, ortak bir itibar ve ortak bir hesap verebilirlik anlayışıyla iş yapmaktır. Her grup şirketimiz kendi alanında özerk; ortak değerlerimizde tek bir vücuttur.",
                "For us, being a holding is not about owning companies in different sectors. It is about doing business with a shared discipline, a shared reputation and a shared accountability. Every company in our group is autonomous in its sector — and one body in our values."),
            ["cta"]     = Bi("Kurumsal Yönetim", "Governance"),
        });

        await UpsertSectionAsync(db, "home", "projects", "Projects showcase on the homepage", new()
        {
            ["eyebrow"]       = Bi("Seçili projeler", "Selected projects"),
            ["title"]         = Bi("İz bırakan eserler", "Work that endures"),
            ["intro"]         = Bi(
                "Bugünün ihtiyaçlarına cevap verirken yarınlara değer üreten projeler tasarlıyor ve hayata geçiriyoruz.",
                "We design and deliver projects that meet today's needs while creating durable value for tomorrow."),
            ["cta"]           = Bi("Tüm Projeler", "All Projects"),
            ["explore"]       = Bi("İncele", "Explore"),
            ["empty"]         = Bi("Henüz yayınlanmış proje yok.", "No projects published yet."),
            // Spec-sheet row labels rendered inside each project brief on the showcase.
            ["labelProject"]  = Bi("Proje",     "Project"),
            ["labelCategory"] = Bi("Kategori",  "Category"),
            ["labelLocation"] = Bi("Konum",     "Location"),
            ["labelYear"]     = Bi("Yıl",       "Year"),
            ["labelBudget"]   = Bi("Bütçe",     "Budget"),
            ["labelStatus"]   = Bi("Durum",     "Status"),
        });

        await UpsertSectionAsync(db, "home", "newsroom", "Newsroom block on the homepage", new()
        {
            ["eyebrow"] = Bi("Haberler", "Newsroom"),
            ["title"]   = Bi("Gündemden", "Latest news"),
            ["intro"]   = Bi(
                "Şirketlerimizden, yatırımlarımızdan ve sektörel gelişmelerden seçtiklerimiz.",
                "Selected updates from across our companies, investments and sectors."),
            ["cta"]     = Bi("Tüm Haberler", "All News"),
            ["empty"]   = Bi("Henüz yayınlanmış haber yok.", "No news published yet."),
            ["read"]    = Bi("Okumaya devam et", "Read more"),
            // BCP 47 tag used by toLocaleDateString for the published date.
            // Admin overrides per language; English defaults to en-GB so
            // dates read as "5 March 2026" rather than "3/5/2026".
            ["locale"]  = Bi("tr-TR", "en-GB"),
        });

        // ╔═══ ABOUT ═══════════════════════════════════════════════════════
        await UpsertSectionAsync(db, "about", "hero", "Hero on the about page", new()
        {
            ["heroMedia"]       = Bi("", ""),
            ["heroMediaActive"] = Bi("false", "false"),
            ["eyebrow"]   = Bi("Kurumsal kimlik", "Corporate identity"),
            ["heroLine1"] = Bi("Kalıcı eserler", "A family that builds"),
            ["heroLine2"] = Bi("üreten bir aile.", "things that last."),
            ["heroLead"]  = Bi(
                "Öztemur Group Of Companies; inşaat, gayrimenkul, enerji, lojistik ve ticaret alanlarında faaliyet gösteren çok sektörlü bir aile şirketidir. Onlarca yıllık birikimimizi, ortak değerler ve uzun vadeli bir bakış açısıyla yönettiğimiz bir grup yapısına dönüştürdük.",
                "Öztemur Group Of Companies is a multi-sector family-owned group operating across construction, real estate, energy, logistics and trade. Decades of craft, shaped into a group structure run with shared values and a long-term outlook."),
        });

        await UpsertSectionAsync(db, "about", "story", "Editorial story split on the about page", new()
        {
            ["storyImage"]       = Bi("", ""),
            ["storyImageActive"] = Bi("false", "false"),
            ["storyEyebrow"] = Bi("Hikâyemiz", "Our story"),
            ["storyTitle"]   = Bi("1985'ten bugüne, aynı disiplin.", "Since 1985, the same discipline."),
            ["storyBodyA"]   = Bi(
                "Holding olmak bizim için yalnızca farklı şirketlere sahip olmak değildir. Holding olmak, ortak bir disiplin, ortak bir itibar ve nesilden nesile aktarılan bir hesap verebilirlik anlayışıdır.",
                "Being a holding, for us, is not about owning companies in different sectors. It is about a shared discipline, a shared reputation, and an accountability handed from one generation to the next."),
            ["storyBodyB"]   = Bi(
                "Her grup şirketimiz kendi sektöründe bağımsız karar verir, kendi ekosistemini kurar; ortak değerlerimizde tek bir vücut gibi çalışır. Bu denge, hem hızlı karar almamızı hem de uzun ömürlü kurumsal yapımızı korumamızı sağlar.",
                "Each company in our group makes its own decisions in its sector, builds its own ecosystem, and acts as one body in our shared values. This balance lets us move quickly and stay institutional at the same time."),
        });

        await UpsertSectionAsync(db, "about", "values", "Three-pillar values block on the about page", new()
        {
            ["pillarsEyebrow"] = Bi("Değerlerimiz", "Our values"),
            ["pillarsTitle"]   = Bi("Üç ilke üzerine kurulu bir kurumsal kültür.", "A culture built on three principles."),
            ["pillar1_no"]     = Bi("01", "01"),
            ["pillar1_title"]  = Bi("Güven", "Trust"),
            ["pillar1_body"]   = Bi(
                "Her ortaklık, her sözleşme ve her teslimat; isminizin uzun yıllar arkasında durabileceği bir taahhütle imzalanır.",
                "Every partnership, every contract and every delivery is signed with a commitment we are willing to stand behind for years."),
            ["pillar2_no"]     = Bi("02", "02"),
            ["pillar2_title"]  = Bi("Kalite", "Craft"),
            ["pillar2_body"]   = Bi(
                "Standartlarımızı pazarın değil, kendi disiplinimizin belirlemesine inanırız. Sıradanı değil, kalıcı olanı tasarlarız.",
                "We let our discipline — not the market — set our standards. We design what endures, not what is merely on trend."),
            ["pillar3_no"]     = Bi("03", "03"),
            ["pillar3_title"]  = Bi("Süreklilik", "Continuity"),
            ["pillar3_body"]   = Bi(
                "Bugünkü kararlarımızı bir sonraki nesle bırakacağımız bir miras gibi alırız. Sermayemizden uzun ömürlü olan, itibarımızdır.",
                "We make today's decisions as if they were a legacy for the next generation. What outlasts our capital is our reputation."),
        });

        await UpsertSectionAsync(db, "about", "leadership", "Governance/leadership block on the about page", new()
        {
            ["leadershipImage"]       = Bi("", ""),
            ["leadershipImageActive"] = Bi("false", "false"),
            ["leadershipEyebrow"] = Bi("Yönetim anlayışı", "Governance"),
            ["leadershipTitle"]   = Bi("Bağımsız şirketler, ortak yönetim.", "Independent companies, shared stewardship."),
            ["leadershipBody"]    = Bi(
                "Grup şirketlerimiz kendi alanlarında özerk yönetilir; finansal disiplin, etik standartlar ve kurumsal yönetim ilkeleri ise holdingin tek elden uyguladığı çerçeveyi oluşturur. Bu yapı, her şirkete kendi sektörüne özgü çevikliği korurken Öztemur kalitesini taşıma imkânı verir.",
                "Each group company is run autonomously in its sector. Financial discipline, ethical standards and corporate governance principles form the single framework the holding applies across the group — letting every company stay agile while carrying the Öztemur standard."),
            ["cta"]               = Bi("Bize Ulaşın", "Get in Touch"),
        });

        // ╔═══ COMPANIES ═══════════════════════════════════════════════════
        await UpsertSectionAsync(db, "companies", "hero", "Hero on the companies page", new()
        {
            ["eyebrow"] = Bi("Şirketler", "Companies"),
            ["line1"]   = Bi("Tek bir vizyon,", "One vision,"),
            ["line2"]   = Bi("çok sektör.", "many sectors."),
            ["lead"]    = Bi(
                "Birbirini tamamlayan sektörlerde faaliyet gösteren markalarımız, ortak bir disiplin ve uzun vadeli bir bakış açısıyla yönetiliyor.",
                "Our brands operate across complementary sectors, run with a shared discipline and a long-term outlook."),
        });

        await UpsertSectionAsync(db, "companies", "labels", "Labels and helper text on the companies page", new()
        {
            ["sectorsHead"] = Bi("Sektörler", "Sectors"),
            ["all"]         = Bi("Tümü", "All"),
            ["loading"]     = Bi("Yükleniyor", "Loading"),
            ["none"]        = Bi("Henüz listelenmiş bir şirket yok.", "No companies listed yet."),
            ["empty"]       = Bi("Bu sektörde şirket bulunmuyor.", "No companies in this sector."),
            ["visit"]       = Bi("Web sitesi", "Website"),
            ["contact"]     = Bi("İletişim", "Contact"),
            ["closeAria"]   = Bi("Kapat", "Close"),
            ["details"]     = Bi("Detay", "Details"),
        });

        await UpsertSectionAsync(db, "companies", "cta", "Bottom CTA strip on the companies page", new()
        {
            ["ctaTitle"] = Bi("Birlikte iş yapmak ister misiniz?", "Interested in working with us?"),
            ["cta"]      = Bi("Bize Ulaşın", "Get in Touch"),
        });

        // ╔═══ PROJECTS ════════════════════════════════════════════════════
        await UpsertSectionAsync(db, "projects", "hero", "Hero on the projects page", new()
        {
            ["eyebrow"] = Bi("Projeler", "Projects"),
            ["line1"]   = Bi("İz bırakan", "Work that"),
            ["line2"]   = Bi("eserler.", "endures."),
            ["lead"]    = Bi(
                "Bugünün ihtiyaçlarına cevap verirken yarınlara değer üreten projeler tasarlıyor ve hayata geçiriyoruz.",
                "We design and deliver projects that meet today's needs while creating durable value for tomorrow."),
        });

        await UpsertSectionAsync(db, "projects", "labels", "Labels and helper text on the projects page", new()
        {
            ["all"]             = Bi("Tümü", "All"),
            ["loading"]         = Bi("Yükleniyor", "Loading"),
            ["empty"]           = Bi("Henüz yayınlanmış proje yok.", "No projects published yet."),
            ["explore"]         = Bi("İncele", "Explore"),
            ["sectorsHead"]     = Bi("Kategoriler", "Categories"),
            ["paginationPrev"]  = Bi("Önceki",  "Previous"),
            ["paginationNext"]  = Bi("Sonraki", "Next"),
            ["paginationPage"]  = Bi("Sayfa",   "Page"),
            ["paginationOf"]    = Bi("/",       "of"),
        });

        // ╔═══ PROJECT DETAIL ══════════════════════════════════════════════
        await UpsertSectionAsync(db, "project_detail", "labels", "Field labels on the project detail page", new()
        {
            ["back"]        = Bi("Tüm projelere dön", "Back to all projects"),
            ["location"]    = Bi("Konum", "Location"),
            ["budget"]      = Bi("Bütçe", "Budget"),
            ["completion"]  = Bi("Hedef tamamlanma", "Target completion"),
            ["summary"]     = Bi("Proje özeti", "Project summary"),
            ["timeline"]    = Bi("Proje takvimi", "Project timeline"),
            ["gallery"]     = Bi("Görseller", "Gallery"),
            ["galleryDesc"] = Bi("Proje görselleri ve detaylar.", "Project imagery and highlights."),
        });

        // ╔═══ NEWS ════════════════════════════════════════════════════════
        await UpsertSectionAsync(db, "news", "hero", "Hero on the news page", new()
        {
            ["eyebrow"] = Bi("Haberler", "Newsroom"),
            ["line1"]   = Bi("Gündemden", "Updates from"),
            ["line2"]   = Bi("ve grubumuzdan.", "across the group."),
            ["lead"]    = Bi(
                "Şirketlerimizden, yatırımlarımızdan ve faaliyet gösterdiğimiz sektörlerdeki gelişmelerden seçtiklerimiz.",
                "Selected updates from our companies, our investments and the sectors in which we operate."),
        });

        await UpsertSectionAsync(db, "news", "labels", "Labels and helper text on the news page", new()
        {
            ["empty"]          = Bi("Henüz yayınlanmış haber yok.", "No news published yet."),
            ["read"]           = Bi("Okumaya devam et", "Read more"),
            ["archive"]        = Bi("Arşiv", "Archive"),
            ["paginationPrev"] = Bi("Önceki",  "Previous"),
            ["paginationNext"] = Bi("Sonraki", "Next"),
            ["paginationPage"] = Bi("Sayfa",   "Page"),
            ["paginationOf"]   = Bi("/",       "of"),
        });

        // ╔═══ NEWS DETAIL ═════════════════════════════════════════════════
        await UpsertSectionAsync(db, "news_detail", "labels", "Field labels on the news detail page", new()
        {
            ["eyebrow"]   = Bi("Haber", "News"),
            ["back"]      = Bi("Tüm haberlere dön", "Back to newsroom"),
            ["published"] = Bi("Yayın tarihi", "Published"),
            ["share"]     = Bi("Paylaş", "Share"),
            ["summary"]   = Bi("Özet", "Summary"),
            ["notFoundT"] = Bi("Haber bulunamadı.", "Article not found."),
            ["notFoundB"] = Bi("Bu içerik kaldırılmış ya da taşınmış olabilir.", "This story may have been removed or moved."),
            ["home"]      = Bi("Haberlere dön", "Back to newsroom"),
        });

        // ╔═══ BLOG ════════════════════════════════════════════════════════
        await UpsertSectionAsync(db, "blog", "hero", "Hero on the insights page", new()
        {
            ["eyebrow"] = Bi("İçgörüler", "Insights"),
            ["line1"]   = Bi("Düşünmeye", "Ideas worth"),
            ["line2"]   = Bi("değer fikirler.", "thinking about."),
            ["lead"]    = Bi(
                "Sektörlerimize, yatırım yaklaşımımıza ve kurumsal felsefemize dair derinlikli yazılar.",
                "Long-form writing on our sectors, our investment approach and our corporate philosophy."),
        });

        await UpsertSectionAsync(db, "blog", "about", "Sidebar 'about this section' widget on the insights page", new()
        {
            ["aboutTitle"] = Bi("Bu Köşe Hakkında", "About This Section"),
            ["aboutBody"]  = Bi(
                "Burada yazdıklarımız bir basın bültenleri kümesi değil. Sektörlerimize, makro gündemimize ve kurumsal felsefemize dair düşüncelerimizi okurla aynı dilde paylaşıyoruz.",
                "What we publish here is not a stream of press releases. It is our thinking on the sectors we work in, the macro context we operate in and the philosophy that shapes our group."),
        });

        // Blog topics section was removed from the UI. Drop the orphan row so
        // it doesn't count against language-readiness for new translations.
        var orphanTopics = await db.PageSections
            .FirstOrDefaultAsync(s => s.PageKey == "blog" && s.SectionKey == "topics");
        if (orphanTopics != null) db.PageSections.Remove(orphanTopics);

        await UpsertSectionAsync(db, "blog", "labels", "Labels and helper text on the insights page", new()
        {
            ["empty"]          = Bi("Henüz yayınlanmış bir yazı yok.", "No essays published yet."),
            ["by"]             = Bi("Yazar:", "By"),
            ["read"]           = Bi("Okumaya devam et", "Read essay"),
            ["paginationPrev"] = Bi("Önceki",  "Previous"),
            ["paginationNext"] = Bi("Sonraki", "Next"),
            ["paginationPage"] = Bi("Sayfa",   "Page"),
            ["paginationOf"]   = Bi("/",       "of"),
        });

        // ╔═══ BLOG DETAIL ═════════════════════════════════════════════════
        await UpsertSectionAsync(db, "blog_detail", "labels", "Field labels on the blog/insight detail page", new()
        {
            ["eyebrow"]   = Bi("İçgörü", "Insight"),
            ["back"]      = Bi("Tüm yazılara dön", "Back to all insights"),
            ["by"]        = Bi("Yazar", "By"),
            ["published"] = Bi("Yayın tarihi", "Published"),
            ["share"]     = Bi("Paylaş", "Share"),
            ["notFoundT"] = Bi("Yazı bulunamadı.", "Essay not found."),
            ["notFoundB"] = Bi("Bu içerik kaldırılmış ya da taşınmış olabilir.", "This piece may have been removed or moved."),
            ["home"]      = Bi("İçgörülere dön", "Back to insights"),
        });

        // ╔═══ CAREERS ═════════════════════════════════════════════════════
        await UpsertSectionAsync(db, "careers", "hero", "Hero on the careers page", new()
        {
            ["heroMedia"]       = Bi("", ""),
            ["heroMediaActive"] = Bi("false", "false"),
            ["eyebrow"] = Bi("Kariyer", "Careers"),
            ["line1"]   = Bi("Kalıcı işler yapmak", "For people who"),
            ["line2"]   = Bi("isteyenlerle.", "want to build things that last."),
            ["lead"]    = Bi(
                "Öztemur Group Of Companies bünyesinde yer alan şirketlerde işine sahip çıkan, uzun vadeli düşünen ve kaliteden ödün vermeyen ekipler kuruyoruz.",
                "Across the Öztemur Group Of Companies companies we are building teams that take ownership, think long-term and refuse to compromise on quality."),
            ["cta"]     = Bi("Açık Pozisyonlar", "Open Positions"),
        });

        await UpsertSectionAsync(db, "careers", "values", "Three-pillar work culture block on the careers page", new()
        {
            ["valuesEyebrow"] = Bi("Çalışma kültürümüz", "How we work"),
            ["valuesTitle"]   = Bi("Standartları biz belirleriz, ödün vermeyiz.", "We set our own standards. We don't lower them."),
            ["value1_no"]     = Bi("01", "01"),
            ["value1_title"]  = Bi("Sahiplik", "Ownership"),
            ["value1_body"]   = Bi(
                "Burada her ekibin kendi alanında karar verme yetkisi vardır. Yapılan işin sahibi, onu yapan kişidir.",
                "Every team here is empowered to make decisions in its area. The person doing the work is the person responsible for it."),
            ["value2_no"]     = Bi("02", "02"),
            ["value2_title"]  = Bi("Kalite", "Craft"),
            ["value2_body"]   = Bi(
                "Bir işi 'iyi' yapmak yetmez. Yıllar sonra bakıldığında utandırmayacak bir iş yapmak gerekir.",
                "Doing something well is not enough. We aim to do work we will not be embarrassed to look back on years later."),
            ["value3_no"]     = Bi("03", "03"),
            ["value3_title"]  = Bi("Süreklilik", "Continuity"),
            ["value3_body"]   = Bi(
                "Hızlı kazanç için kısa kararlar almayız. Bir sonraki nesle bırakmak istediğimiz bir kurum kuruyoruz.",
                "We do not chase short wins. We are building an institution we want to hand over to the next generation."),
        });

        await UpsertSectionAsync(db, "careers", "labels", "Labels and helper text on the careers page", new()
        {
            ["rolesEyebrow"] = Bi("Açık pozisyonlar", "Open roles"),
            ["rolesTitle"]   = Bi("Şu an aradığımız ekip arkadaşları", "People we are looking for right now"),
            ["all"]          = Bi("Tüm Departmanlar", "All Departments"),
            ["loading"]      = Bi("Yükleniyor", "Loading"),
            ["none"]         = Bi("Şu an açık pozisyon bulunmuyor.", "No open positions at the moment."),
            ["apply"]        = Bi("Detay & Başvuru", "View & Apply"),
        });

        // ╔═══ CAREER DETAIL ═══════════════════════════════════════════════
        await UpsertSectionAsync(db, "career_detail", "labels", "Field labels and form copy on the career detail page", new()
        {
            ["back"]               = Bi("Tüm pozisyonlara dön", "Back to all positions"),
            ["referenceCode"]      = Bi("Referans kodu", "Reference code"),
            ["overview"]           = Bi("Pozisyon özeti", "Role overview"),
            ["objectives"]         = Bi("Temel sorumluluklar", "Core responsibilities"),
            ["requirements"]       = Bi("Aradığımız nitelikler", "What we're looking for"),
            ["apply"]              = Bi("Başvur", "Apply"),
            ["applyTitle"]         = Bi("Başvuru formu", "Application form"),
            ["applySubtitle"]      = Bi("Bilgileriniz doğrudan ilgili departmana iletilecektir.", "Your details will be sent directly to the relevant team."),
            ["name"]               = Bi("Ad Soyad", "Full name"),
            ["email"]              = Bi("E-posta adresi", "Email address"),
            ["linkedin"]           = Bi("LinkedIn / portfolyo", "LinkedIn / portfolio"),
            ["cv"]                 = Bi("Özgeçmiş (PDF)", "Curriculum vitae (PDF)"),
            ["summary"]            = Bi("Kısa özet", "Brief summary"),
            ["summaryPlaceholder"] = Bi(
                "Kendinizden ve neden bu pozisyon için uygun olduğunuzdan kısaca bahsedin...",
                "Tell us briefly about yourself and why you're a good fit for this role..."),
            ["consent"]            = Bi("Başvurum kapsamında verilerimin işlenmesini kabul ediyorum.", "I agree to the processing of my data as part of this application."),
            ["submit"]             = Bi("Başvuruyu Gönder", "Submit Application"),
            ["submitting"]         = Bi("Gönderiliyor...", "Submitting..."),
            ["successTitle"]       = Bi("Başvurunuz alındı.", "Application received."),
            ["successBody"]        = Bi(
                "Ekibimiz, profilinizin bu pozisyona uygunluğunu değerlendirip sizinle iletişime geçecektir.",
                "Our team will review your profile and get back to you if you're a fit."),
            ["backToList"]         = Bi("Pozisyonlara dön", "Back to positions"),
            ["error"]              = Bi("Başvuru gönderilemedi.", "Failed to submit application."),
            ["notFound"]           = Bi("Pozisyon bulunamadı.", "Position not found."),
        });

        // ╔═══ CONTACT ═════════════════════════════════════════════════════
        await UpsertSectionAsync(db, "contact", "hero", "Hero on the contact page", new()
        {
            ["eyebrow"] = Bi("İletişim", "Contact"),
            ["line1"]   = Bi("Bir iş, bir ortaklık,", "A project, a partnership,"),
            ["line2"]   = Bi("bir soru.", "a question."),
            ["lead"]    = Bi(
                "Mesajınızı doğrudan ilgili departmana ileteceğiz. Her iletinin geri dönüşü yapılır.",
                "Your message is routed straight to the right team. Every message gets a reply."),
        });

        await UpsertSectionAsync(db, "contact", "info", "Address & direct lines sidebar on the contact page", new()
        {
            ["hqHead"]            = Bi("Genel Merkez", "Headquarters"),
            ["hq_line1"]          = Bi("Kombos meydanı Cengizhan Sk No: 25", "Kombos Square, Cengizhan Street No: 25"),
            ["hq_line2"]          = Bi("Gazimağusa, KKTC", "Famagusta, North Cyprus"),
            ["linesHead"]         = Bi("Doğrudan iletişim", "Direct lines"),
            // Each `_value` slot is rendered only when admin fills it in.
            ["landline_label"]    = Bi("Sabit Telefon", "Landline"),
            ["landline_value"]    = Bi("", ""),
            ["mobile_label"]      = Bi("Cep Telefonu", "Mobile"),
            ["mobile_value"]      = Bi("", ""),
            ["whatsapp_label"]    = Bi("Whatsapp Hattı", "WhatsApp"),
            ["whatsapp_value"]    = Bi("", ""),
            ["email_label"]       = Bi("İletişim E-postası", "Contact Email"),
            ["email_value"]       = Bi("info@oztemur.com", "info@oztemur.com"),
            ["bottomEyebrow"]     = Bi("Çalışma saatleri", "Office hours"),
            ["bottom_line1"]      = Bi("Pazartesi – Cuma", "Monday – Friday"),
            ["bottom_line2"]      = Bi("09:00 – 18:00 (GMT+3)", "09:00 – 18:00 (GMT+3)"),
        });

        // Old department-based direct-lines slots (line1-4) are obsolete —
        // strip them so they don't linger in pre-existing databases.
        await RemoveSectionFieldsAsync(db, "contact", "info", new[]
        {
            "line1_label", "line1_value",
            "line2_label", "line2_value",
            "line3_label", "line3_value",
            "line4_label", "line4_value",
        });

        await UpsertSectionAsync(db, "contact", "form", "Form labels and copy on the contact page", new()
        {
            ["formTitle"]          = Bi("Mesajınızı bırakın", "Leave a message"),
            ["formSubtitle"]       = Bi("Bilgilerinizi paylaşın, en kısa sürede size geri dönelim.", "Share your details — we'll get back to you shortly."),
            ["name"]               = Bi("Ad Soyad", "Full name"),
            ["email"]              = Bi("E-posta", "Email"),
            ["subject"]            = Bi("Konu", "Subject"),
            ["message"]            = Bi("Mesaj", "Message"),
            ["messagePlaceholder"] = Bi("Mesajınız...", "Your message..."),
            ["submit"]             = Bi("Gönder", "Send Message"),
            ["submitting"]         = Bi("Gönderiliyor...", "Sending..."),
            ["successDefault"]     = Bi("Mesajınız iletildi. Teşekkür ederiz.", "Message sent. Thank you."),
            ["failureDefault"]     = Bi("Mesaj iletilemedi. Lütfen tekrar deneyin.", "Could not send message. Please try again."),
        });

        // Drop legacy department picker fields from the contact/form section
        // (UI was removed). UpsertSectionAsync only merges new keys, so we
        // strip the obsolete ones explicitly here.
        await RemoveSectionFieldsAsync(db, "contact", "form",
            new[] { "department", "dept1", "dept2", "dept3", "dept4", "dept5", "dept6" });

        // Project entity dropped its Client field — purge the orphan label.
        await RemoveSectionFieldsAsync(db, "project_detail", "labels", new[] { "client" });

        // ╔═══ NOT FOUND ═══════════════════════════════════════════════════
        await UpsertSectionAsync(db, "not_found", "main", "404 page", new()
        {
            ["code"]      = Bi("404", "404"),
            ["title"]     = Bi("Aradığınız sayfa bulunamadı.", "We couldn't find that page."),
            ["body"]      = Bi(
                "Bağlantı kırılmış veya sayfa kaldırılmış olabilir. Anasayfaya dönebilir ya da grubumuzu keşfedebilirsiniz.",
                "The link may be broken or the page may have moved. You can return to the homepage or explore the group."),
            ["primary"]   = Bi("Anasayfa", "Home"),
            ["secondary"] = Bi("Grubu Keşfet", "Discover the Group"),
        });

        // ╔═══ SUSTAINABILITY ══════════════════════════════════════════════
        await UpsertSectionAsync(db, "sustainability", "hero", "Hero on the sustainability page", new()
        {
            ["eyebrow"] = Bi("Sürdürülebilirlik", "Sustainability"),
            ["line1"]   = Bi("Bugünden",    "Building for"),
            ["line2"]   = Bi("yarına emanet.", "the next generation."),
            ["lead"]    = Bi(
                "Faaliyet gösterdiğimiz her sektörde çevreye, insana ve topluma karşı uzun vadeli bir sorumluluk taşırız. Sürdürülebilirlik bizim için bir kampanya değil, kurumsal disiplinimizin parçasıdır.",
                "In every sector we operate in we carry a long-term responsibility — to the environment, to people and to society. For us, sustainability is not a campaign; it is part of our corporate discipline."),
        });

        await UpsertSectionAsync(db, "sustainability", "pillars", "Three ESG pillars on the sustainability page", new()
        {
            ["eyebrow"] = Bi("Üç temel başlık", "Three pillars"),
            ["title"]   = Bi("Çevre, insan, yönetim.", "Environment, people, governance."),
            ["pillar1_no"]    = Bi("01", "01"),
            ["pillar1_title"] = Bi("Çevre", "Environment"),
            ["pillar1_body"]  = Bi(
                "Enerji verimliliğinden atık yönetimine kadar her operasyonel kararda çevresel etkimizi izliyor, ölçüyor ve azaltıyoruz.",
                "From energy efficiency to waste management, in every operational decision we monitor, measure and reduce our environmental footprint."),
            ["pillar2_no"]    = Bi("02", "02"),
            ["pillar2_title"] = Bi("İnsan", "People"),
            ["pillar2_body"]  = Bi(
                "Çalışan güvenliği, eşit fırsat ve sürekli gelişim politikalarımız; grup şirketlerimizin tamamında ortak bir standarttır.",
                "Worker safety, equal opportunity and continuous development policies are shared standards across every company in the group."),
            ["pillar3_no"]    = Bi("03", "03"),
            ["pillar3_title"] = Bi("Yönetim", "Governance"),
            ["pillar3_body"]  = Bi(
                "Şeffaf raporlama, etik iş yapma kuralları ve bağımsız denetim mekanizmalarıyla hesap verebilir bir yönetim anlayışı sürdürüyoruz.",
                "Transparent reporting, a clear code of ethics and independent audit mechanisms sustain an accountable governance approach."),
        });

        await UpsertSectionAsync(db, "sustainability", "commitments", "Concrete sustainability commitments", new()
        {
            ["eyebrow"] = Bi("Taahhütlerimiz", "Our commitments"),
            ["title"]   = Bi("Söylemle değil, kararla.", "Action over rhetoric."),
            ["commitment1_label"] = Bi("Enerji", "Energy"),
            ["commitment1_body"]  = Bi(
                "Tüm grup ofislerinde yenilenebilir enerji kaynaklarına geçiş ve yıllık enerji yoğunluk hedefleri.",
                "Transition to renewable energy in all group offices and annual energy intensity targets."),
            ["commitment2_label"] = Bi("İnsan",  "People"),
            ["commitment2_body"]  = Bi(
                "Yönetim kademelerinde cinsiyet temsili için açık hedefler; her grup şirketinde iş güvenliği eğitimi zorunluluğu.",
                "Public gender-representation targets at management level; mandatory workplace-safety training in every group company."),
            ["commitment3_label"] = Bi("Tedarik", "Supply chain"),
            ["commitment3_body"]  = Bi(
                "Tedarikçilerimiz için sürdürülebilirlik kriterli ön değerlendirme; ana iş ortakları için yıllık ESG denetimi.",
                "Sustainability-screening pre-qualification for our suppliers; annual ESG audits for principal partners."),
            ["commitment4_label"] = Bi("Topluluk", "Community"),
            ["commitment4_body"]  = Bi(
                "Faaliyet gösterdiğimiz bölgelerde eğitim, kültür ve sanat alanlarındaki sivil girişimlere yıllık fon ayırımı.",
                "Annual fund allocation to local initiatives in education, culture and the arts in the regions where we operate."),
        });

        // ╔═══ GOVERNANCE ══════════════════════════════════════════════════
        await UpsertSectionAsync(db, "governance", "hero", "Hero on the governance page", new()
        {
            ["eyebrow"] = Bi("Kurumsal yönetim", "Governance"),
            ["line1"]   = Bi("Şeffaflık,",      "Transparency,"),
            ["line2"]   = Bi("hesap verebilirlik.", "accountability."),
            ["lead"]    = Bi(
                "Öztemur Group Of Companies, grup şirketlerinde ortak bir kurumsal yönetim çerçevesi uygular. Bu çerçeve; finansal disiplin, etik standartlar ve bağımsız denetim mekanizmaları üzerine kuruludur.",
                "Öztemur Group Of Companies applies a shared corporate governance framework across its group companies — built on financial discipline, ethical standards and independent audit mechanisms."),
        });

        await UpsertSectionAsync(db, "governance", "principles", "Governance principles", new()
        {
            ["eyebrow"] = Bi("Ana ilkelerimiz", "Our core principles"),
            ["title"]   = Bi("Dört temel ilke.", "Four core principles."),
            ["principle1_title"] = Bi("Şeffaflık", "Transparency"),
            ["principle1_body"]  = Bi(
                "Tüm grup şirketlerimiz; finansal ve operasyonel performanslarını standart raporlama formatlarıyla ölçer ve paylaşır.",
                "Every group company measures and reports its financial and operational performance using standard reporting formats."),
            ["principle2_title"] = Bi("Hesap verebilirlik", "Accountability"),
            ["principle2_body"]  = Bi(
                "Yetki ve sorumluluk çakışmaması esastır. Karar mekanizmaları belgelidir; her yöneticinin sorumluluk sınırı nettir.",
                "Authority and responsibility never overlap. Decision processes are documented; every manager's scope is clearly defined."),
            ["principle3_title"] = Bi("Bağımsızlık", "Independence"),
            ["principle3_body"]  = Bi(
                "Bağımsız denetçilerle çalışır, iç denetim fonksiyonunu doğrudan üst yönetime bağlı tutarız.",
                "We work with independent auditors and keep the internal audit function reporting directly to senior management."),
            ["principle4_title"] = Bi("Etik", "Ethics"),
            ["principle4_body"]  = Bi(
                "Tüm çalışanlarımız ve iş ortaklarımız için bağlayıcı bir İş Etiği Kuralları belgemiz vardır; ihlaller anonim bildirim hattıyla ele alınır.",
                "We have a binding Code of Business Conduct for every employee and partner; violations are handled via an anonymous whistleblowing channel."),
        });

        await UpsertSectionAsync(db, "governance", "ethics", "Ethics policy summary block", new()
        {
            ["eyebrow"] = Bi("İş etiği", "Business ethics"),
            ["title"]   = Bi("İş etiği kurallarımız.", "Our code of business conduct."),
            ["body"]    = Bi(
                "İş etiği kurallarımız; çıkar çatışması, rüşvet ve yolsuzlukla mücadele, rekabet uyumu, kişisel veri koruma ve adil çalışma uygulamaları konusundaki temel beklentileri tanımlar. Kurallarımıza aykırı bir durumu fark ederseniz, anonim olarak etik@oztemur.com adresine bildirebilirsiniz.",
                "Our code of conduct defines the baseline expectations on conflicts of interest, anti-bribery and anti-corruption, competition compliance, personal-data protection and fair working practices. Suspected breaches can be reported anonymously to etik@oztemur.com."),
        });

        // ╔═══ LEADERSHIP ══════════════════════════════════════════════════
        await UpsertSectionAsync(db, "leadership", "hero", "Hero on the leadership page", new()
        {
            ["eyebrow"] = Bi("Yönetim kadrosu", "Leadership"),
            ["line1"]   = Bi("İşin ardındaki",  "The people behind"),
            ["line2"]   = Bi("isimler.",         "the work."),
            ["lead"]    = Bi(
                "Öztemur Group Of Companies yönetim kurulu ve üst düzey ekibi, sektörlerinde uzun yıllar deneyim taşıyan profesyonellerden oluşur. Kararlarımızın arkasında, sorumluluğunu açık biçimde üstlenen insanlar vardır.",
                "Öztemur Group Of Companies' board and senior team comprise professionals with decades of experience in their sectors. Behind every decision are people who openly own its consequences."),
        });

        // Leadership members were moved out of PageSection into a dedicated table
        // (LeadershipMember). Drop the orphan row so its 26 fields don't count
        // against language-readiness for new translations.
        var orphanLeadership = await db.PageSections
            .FirstOrDefaultAsync(s => s.PageKey == "leadership" && s.SectionKey == "members");
        if (orphanLeadership != null) db.PageSections.Remove(orphanLeadership);

        // ╔═══ COOKIE CONSENT BANNER ═══════════════════════════════════════
        await UpsertSectionAsync(db, "consent", "main", "Cookie consent banner copy + button labels", new()
        {
            ["title"]    = Bi("Çerezler hakkında", "About cookies"),
            ["body"]     = Bi(
                "Bu site, dil tercihinizi hatırlamak gibi temel işlevler için çerez kullanır. Detaylar için KVKK aydınlatma metnimize bakabilirsiniz.",
                "This site uses cookies for essential functions such as remembering your language preference. See our personal-data disclosure for details."),
            ["accept"]   = Bi("Anladım", "Got it"),
            ["learnMore"] = Bi("Detaylı bilgi", "Learn more"),
        });

        // ╔═══ PRIVACY POLICY ══════════════════════════════════════════════
        await UpsertSectionAsync(db, "privacy", "main", "Privacy policy page (full text edited here)", new()
        {
            ["title"]       = Bi("Gizlilik Politikası", "Privacy Policy"),
            ["lastUpdated"] = Bi("Son güncelleme: Mayıs 2026", "Last updated: May 2026"),
            ["content"]     = Bi(
                "Öztemur Group Of Companies olarak ziyaretçilerimizin kişisel verilerinin korunmasına büyük önem veriyoruz. Bu politika; web sitemizi ziyaret ettiğinizde hangi verilerin toplandığını, nasıl işlendiğini ve haklarınızı açıklar.\n\n1. Topladığımız Veriler\nİletişim ve iş başvuru formları aracılığıyla paylaştığınız ad, e-posta, telefon ve özgeçmiş bilgileri. Çerezler aracılığıyla dil tercihiniz.\n\n2. Verilerin Kullanımı\nBilgileriniz yalnızca size geri dönüş sağlamak ve başvurunuzu değerlendirmek amacıyla kullanılır. Pazarlama amacıyla üçüncü taraflara aktarılmaz.\n\n3. Saklama Süresi\nBaşvuru verileriniz değerlendirme süreci sonunda silinir. İletişim mesajları cevaplandıktan sonra makul bir süre arşivde tutulur.\n\n4. Haklarınız\nKişisel verilerinizle ilgili erişim, düzeltme ve silme talepleri için info@oztemur.com adresine yazabilirsiniz.\n\nBu sayfanın içeriği yasal zorunluluklara göre güncellenebilir. Yürürlükteki sürüm her zaman bu sayfada gösterilir.",
                "At Öztemur Group Of Companies we take the protection of our visitors' personal data seriously. This policy describes what data we collect when you visit our website, how it is processed and what your rights are.\n\n1. Data we collect\nName, email, phone and CV information you share via our contact and job-application forms. Your language preference via cookies.\n\n2. Use of data\nYour information is used solely to respond to you and evaluate your application. We do not transfer data to third parties for marketing purposes.\n\n3. Retention\nApplication data is deleted at the end of the evaluation process. Contact messages are kept in the archive for a reasonable period after being answered.\n\n4. Your rights\nFor access, correction or deletion requests regarding your personal data, please write to info@oztemur.com.\n\nThis page may be updated to reflect legal requirements. The version in force is always shown on this page."),
        });

        // ╔═══ TERMS OF USE ════════════════════════════════════════════════
        await UpsertSectionAsync(db, "terms", "main", "Terms of use page (full text edited here)", new()
        {
            ["title"]       = Bi("Kullanım Koşulları", "Terms of Use"),
            ["lastUpdated"] = Bi("Son güncelleme: Mayıs 2026", "Last updated: May 2026"),
            ["content"]     = Bi(
                "Bu web sitesini kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız.\n\n1. Telif Hakkı\nBu sitedeki tüm metin, görsel, marka, logo ve içerik Öztemur Group Of Companies'e aittir. İzinsiz çoğaltılamaz, dağıtılamaz veya ticari amaçla kullanılamaz.\n\n2. Sorumluluk Sınırlaması\nSitedeki bilgiler genel bilgilendirme amacıyla sunulur. Yatırım veya ticari kararlar için bağımsız profesyonel danışmanlık alınmalıdır. İçeriklerin doğruluğu için makul özen gösterilse de Öztemur Group Of Companies hatalardan sorumlu tutulamaz.\n\n3. Üçüncü Taraf Bağlantılar\nSite, üçüncü taraf web sitelerine bağlantılar içerebilir. Bu sitelerin içeriği veya gizlilik uygulamaları üzerinde Öztemur Group Of Companies'in kontrolü yoktur.\n\n4. Değişiklikler\nBu kullanım koşulları zaman zaman güncellenebilir. Güncel sürüm her zaman bu sayfada yayınlanır.",
                "By using this website you agree to the terms below.\n\n1. Copyright\nAll text, images, trademarks, logos and content on this site belong to Öztemur Group Of Companies. They may not be reproduced, distributed or used for commercial purposes without permission.\n\n2. Limitation of liability\nInformation on the site is provided for general purposes only. Independent professional advice should be sought for investment or commercial decisions. While reasonable care is taken to ensure accuracy, Öztemur Group Of Companies is not liable for errors.\n\n3. Third-party links\nThe site may contain links to third-party websites. Öztemur Group Of Companies has no control over the content or privacy practices of those sites.\n\n4. Changes\nThese terms may be updated from time to time. The current version is always published on this page."),
        });

        // ╔═══ KVKK (Turkey/KKTC personal data law) ════════════════════════
        await UpsertSectionAsync(db, "kvkk", "main", "KVKK aydınlatma metni (Turkish personal-data disclosure)", new()
        {
            ["title"]       = Bi("KVKK Aydınlatma Metni", "Personal Data Disclosure (KVKK)"),
            ["lastUpdated"] = Bi("Son güncelleme: Mayıs 2026", "Last updated: May 2026"),
            ["content"]     = Bi(
                "6698 Sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu sıfatıyla Öztemur Group Of Companies olarak sizleri bilgilendirmek isteriz.\n\n1. Veri Sorumlusu\nÖztemur Group Of Companies, Gazimağusa, KKTC.\n\n2. İşlenen Veri Kategorileri\nKimlik bilgileri, iletişim bilgileri, özgeçmiş bilgileri, IP adresi ve çerez verileri.\n\n3. Veri İşleme Amaçları\nİletişim taleplerinizin yanıtlanması, iş başvurularının değerlendirilmesi, web sitesi performansının izlenmesi ve yasal yükümlülüklerin yerine getirilmesi.\n\n4. Veri Aktarımı\nKişisel verileriniz yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz.\n\n5. Haklarınız\nKVKK madde 11 uyarınca; verilerinize erişim, düzeltme, silme, işlenmesini sınırlama ve itiraz hakkına sahipsiniz. Taleplerinizi info@oztemur.com adresine iletebilirsiniz.\n\n6. Saklama Süresi\nVerileriniz, işleme amacı için gerekli süre boyunca saklanır; süre sonunda imha edilir.",
                "Pursuant to Law No. 6698 on the Protection of Personal Data (KVKK), Öztemur Group Of Companies, in its capacity as data controller, hereby informs you of the following.\n\n1. Data controller\nÖztemur Group Of Companies, Nicosia, North Cyprus.\n\n2. Categories of data processed\nIdentity, contact details, CV information, IP address and cookie data.\n\n3. Purposes of processing\nResponding to your enquiries, evaluating job applications, monitoring website performance, and fulfilling legal obligations.\n\n4. Data sharing\nYour personal data is not shared with third parties except where legally required.\n\n5. Your rights\nUnder Article 11 of KVKK you have rights of access, correction, deletion, restriction of processing and objection. Requests may be sent to info@oztemur.com.\n\n6. Retention\nYour data is kept only for as long as necessary for the purpose of processing, and is then destroyed."),
        });

        // ╔═══ FOOTER ══════════════════════════════════════════════════════
        await UpsertSectionAsync(db, "footer", "main", "Global footer on every page", new()
        {
            ["tagline"]              = Bi(
                "Nesilden nesile güven inşa eden çok sektörlü bir şirketler grubu.",
                "A multi-sector group of companies building generations of trust."),
            ["pillarHead_group"]     = Bi("Grup", "The Group"),
            ["pillarHead_company"]   = Bi("Kurumsal", "Corporate"),
            ["pillarHead_contact"]   = Bi("Bize Ulaşın", "Get in Touch"),
            ["link_about"]           = Bi("Hakkımızda", "About"),
            ["link_companies"]       = Bi("Şirketler", "Companies"),
            ["link_projects"]        = Bi("Projeler", "Projects"),
            ["link_sustainability"]  = Bi("Sürdürülebilirlik", "Sustainability"),
            ["link_governance"]      = Bi("Kurumsal Yönetim", "Governance"),
            ["link_leadership"]      = Bi("Yönetim Kadrosu", "Leadership"),
            ["link_news"]            = Bi("Haberler", "Newsroom"),
            ["link_blog"]            = Bi("İçgörüler", "Insights"),
            ["link_careers"]         = Bi("Kariyer", "Careers"),
            ["link_contact"]         = Bi("İletişim", "Contact"),
            ["link_privacy"]         = Bi("Gizlilik", "Privacy"),
            ["link_terms"]           = Bi("Kullanım Koşulları", "Terms of Use"),
            ["link_kvkk"]            = Bi("KVKK Aydınlatma Metni", "Personal Data (KVKK)"),
            ["address_title"]        = Bi("Genel Merkez", "Headquarters"),
            ["address_line1"]        = Bi("Kombos meydanı Cengizhan Sk No: 25", "Kombos Square, Cengizhan Street No: 25"),
            ["address_line2"]        = Bi("Gazimağusa, KKTC", "Famagusta, North Cyprus"),
            ["rights"]               = Bi("Tüm hakları saklıdır.", "All rights reserved."),
            ["valuesHead"]           = Bi("Değerlerimiz", "Our Values"),
            ["value1"]               = Bi("Güven", "Trust"),
            ["value2"]               = Bi("Kalite", "Craft"),
            ["value3"]               = Bi("Süreklilik", "Continuity"),
            ["quoteEyebrow"]         = Bi("Felsefemiz", "Our Philosophy"),
            ["quote"]                = Bi(
                "Sermayemizden daha kalıcı olan tek şey, kurduğumuz ilişkiler ve nesillere bıraktığımız itibardır.",
                "What outlasts our capital is the relationships we build and the reputation we leave to the next generation."),
            // Social links — full URLs (Instagram/Facebook) and a plain email
            // for the mail icon. Empty value hides the corresponding button.
            ["social_instagram_url"] = Bi("", ""),
            ["social_facebook_url"]  = Bi("", ""),
            ["social_linkedin_url"]  = Bi("", ""),
            ["social_email"]         = Bi("info@oztemur.com", "info@oztemur.com"),
        });

        await db.SaveChangesAsync();
    }

    // ─── UI STRINGS ──────────────────────────────────────────────────────
    private static async Task SeedUiStringsAsync(OztemurDbContext db)
    {
        // Navigation labels (used by Header)
        await UpsertUiStringAsync(db, "nav.home",      "nav", "Header: home link",      Bi("Anasayfa", "Home"));
        await UpsertUiStringAsync(db, "nav.about",     "nav", "Header: about link",     Bi("Hakkımızda", "About"));
        await UpsertUiStringAsync(db, "nav.companies", "nav", "Header: companies link", Bi("Şirketler", "Companies"));
        await UpsertUiStringAsync(db, "nav.projects",  "nav", "Header: projects link",  Bi("Projeler", "Projects"));
        await UpsertUiStringAsync(db, "nav.news",      "nav", "Header: newsroom link",  Bi("Haberler", "Newsroom"));
        await UpsertUiStringAsync(db, "nav.blog",      "nav", "Header: insights link",  Bi("İçgörüler", "Insights"));
        await UpsertUiStringAsync(db, "nav.careers",   "nav", "Header: careers link",   Bi("Kariyer", "Careers"));
        await UpsertUiStringAsync(db, "nav.contact",   "nav", "Header CTA: contact",    Bi("İletişim", "Contact"));

        // Page titles for the small set of static pages whose headline isn't
        // CMS-driven. These also feed breadcrumbs on the corresponding routes.
        await UpsertUiStringAsync(db, "page.governance.title",      "page", "Governance page title",       Bi("Kurumsal Yönetim", "Governance"));
        await UpsertUiStringAsync(db, "page.sustainability.title",  "page", "Sustainability page title",   Bi("Sürdürülebilirlik", "Sustainability"));
        await UpsertUiStringAsync(db, "page.leadership.title",      "page", "Leadership page title",       Bi("Yönetim Kadrosu", "Leadership"));

        // Not-found titles & descriptions — used by entity detail pages
        // (project/news/blog/careers) when the slug doesn't resolve.
        await UpsertUiStringAsync(db, "notfound.project.title",     "notfound", "Project not found — page title",     Bi("Proje bulunamadı",    "Project not found"));
        await UpsertUiStringAsync(db, "notfound.project.desc",      "notfound", "Project not found — description",    Bi("Aradığınız proje bulunamadı.",     "The requested project could not be found."));
        await UpsertUiStringAsync(db, "notfound.news.title",        "notfound", "Article not found — page title",     Bi("Haber bulunamadı",    "Article not found"));
        await UpsertUiStringAsync(db, "notfound.news.desc",         "notfound", "Article not found — description",    Bi("Aradığınız haber bulunamadı.",     "The requested article could not be found."));
        await UpsertUiStringAsync(db, "notfound.blog.title",        "notfound", "Essay not found — page title",       Bi("Yazı bulunamadı",     "Essay not found"));
        await UpsertUiStringAsync(db, "notfound.blog.desc",         "notfound", "Essay not found — description",      Bi("Aradığınız yazı bulunamadı.",      "The requested essay could not be found."));
        await UpsertUiStringAsync(db, "notfound.career.title",      "notfound", "Position not found — page title",    Bi("Pozisyon bulunamadı", "Position not found"));
        await UpsertUiStringAsync(db, "notfound.career.desc",       "notfound", "Position not found — description",   Bi("Aradığınız pozisyon bulunamadı.",  "The requested position could not be found."));
        await UpsertUiStringAsync(db, "notfound.leadership.title",  "notfound", "Leadership member not found",        Bi("Sayfa bulunamadı",    "Not found"));

        // Project status labels — formerly hardcoded in projectStatus.ts.
        // Keys mirror the backend enum values.
        await UpsertUiStringAsync(db, "project.status.Planning",    "project_status", "Project status: Planning",    Bi("Planlama",     "Planning"));
        await UpsertUiStringAsync(db, "project.status.InProgress",  "project_status", "Project status: In Progress", Bi("Devam Ediyor", "In Progress"));
        await UpsertUiStringAsync(db, "project.status.Operational", "project_status", "Project status: Operational", Bi("Faaliyette",   "Operational"));
        await UpsertUiStringAsync(db, "project.status.Completed",   "project_status", "Project status: Completed",   Bi("Tamamlandı",   "Completed"));
        await UpsertUiStringAsync(db, "project.status.OnHold",      "project_status", "Project status: On Hold",     Bi("Beklemede",    "On Hold"));

        // Inline form error messages.
        await UpsertUiStringAsync(db, "form.turnstile.incomplete",  "form", "Turnstile not completed",     Bi("Lütfen güvenlik doğrulamasını tamamlayın.", "Please complete the security verification."));

        // Leadership detail
        await UpsertUiStringAsync(db, "leadership.detail.back",     "page", "Leadership detail: back link",        Bi("Yönetim kadrosuna dön",     "Back to leadership"));
        await UpsertUiStringAsync(db, "leadership.detail.no_bio",   "page", "Leadership detail: empty bio notice", Bi("Biyografi henüz eklenmemiş.", "No biography available yet."));

        // Share bar — used by news/blog detail pages. Aria labels surface
        // through screen readers, so they need translation per language.
        await UpsertUiStringAsync(db, "share.copy_link",            "share", "Share: copy link button tooltip",  Bi("Bağlantıyı kopyala",      "Copy link"));
        await UpsertUiStringAsync(db, "share.copied",               "share", "Share: copy success label",        Bi("Bağlantı kopyalandı",     "Link copied"));
        await UpsertUiStringAsync(db, "share.email",                "share", "Share: email button tooltip",      Bi("E-posta ile gönder",      "Send by email"));
        await UpsertUiStringAsync(db, "share.linkedin",             "share", "Share: LinkedIn button tooltip",   Bi("LinkedIn'de paylaş",      "Share on LinkedIn"));
        await UpsertUiStringAsync(db, "share.whatsapp",             "share", "Share: WhatsApp button tooltip",   Bi("WhatsApp'ta paylaş",      "Share on WhatsApp"));
        await UpsertUiStringAsync(db, "share.native",               "share", "Share: native sheet button label", Bi("Paylaş",                  "Share"));

        await db.SaveChangesAsync();
    }
}
