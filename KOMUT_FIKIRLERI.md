# Komut Fikirleri — Sonraya Bırakılanlar

## RE Karakter / Sınıf Sistemi (Flagship)

Tüm botun üzerine oturan pasif yetenek katmanı. Level 10'da açılır, `!karakter <isim>` ile seçilir, 7 günde bir 1000 coin ile değişir.

- **Leon** — `!günlük` bonusu +%10
- **Chris** — Raid boss hasarı +%15
- **Ada** — `!hırsızlık` başarı +%20, yakalanma -%10
- **Jill** — XP kazanımı +%10
- **Wesker** — Bahis kazancı +%20, kaybı +%10
- **Rebecca** — Timeout sürelerini yarılayabilir (100 coin/saat)

**Entegrasyon**: `getCharacterMultiplier(userId, type)` helper'ı ile mevcut komutlar bonuslanır. Yeni model: `UserScore.character` alanı.

## Banka Sistemi + Hırsızlık

**`!banka yatır <miktar>` / `!banka çek`**
- Bankadaki coin hırsızlıktan korunur
- 24 saatte %1 faiz (pasif gelir)
- Aktif harcanamaz (mağaza, slot, iste vb. cüzdandan gider)
- Stratejik karar: güvenlik mi, likidite mi

**`!hırsızlık @user`**
- %40 başarı, hedefin cüzdan coininin %10-20'si
- Başarısızlıkta 100 coin + 5dk timeout
- 4 saat cooldown
- Mod/streamer'a atılamaz
- Ada karakter bonusu uygulanır

## Envanter + Tüketilebilir Ürünler

Mağaza sistemini derinleştir. `Product` modeline `consumable: Boolean` alanı, yeni `Inventory` modeli.

- **Yeşil Herb** (200 coin) — Timeout/enfeksiyon süresini yarılar
- **Kırmızı Herb** (150 coin) — Sonraki `!günlük`'e +%50 bonus
- **First Aid Spray** (500 coin) — 1 link violation affedilir
- **Ink Ribbon** (300 coin) — Sonraki bahis kaybında coin iade (save point)

**Yeni komutlar**: `!envanter`, `!kullan <item>`

## Enfekte Event (T-Virus)

Mod tarafından başlatılan 20 dakikalık viral event.

**Akış**:
1. `!enfeksiyon` — rastgele 1 kişi enfekte
2. Enfekte yazdığında %30 şansla rastgele başka chatter enfekte olur
3. Tedavi: `!serum` (500 coin) / `!herb` (envanterden) / `!karantina` (1 saat mesaj atmama)
4. Event sonunda yaşayanlar pot'u paylaşır

## Chat Mini Oyunları

- **`!bilgi`** — Trivia, ilk doğru yanıt 100 XP + 50 coin. 30sn süre. Sorular JSON'da.
- **`!hafıza`** — Bot 5 sembol gösterir, 10sn sonra doğru sırayı yazan kazanır
- **`!düello @user <miktar>`** — PvP coin savaşı, animasyonlu sonuç (3-5 saniyede chat'te sahne)

## Streamer Araçları

- **`!seç`** — Son 5dk aktif kullanıcılardan rastgele bir kişi (giveaway, raid)
  - Filtreli: `!seç sub`, `!seç level10+`

## İstatistik Komutları

- **`!rekorlar`** — En yüksek bahis kazancı, slot jackpot, coin peak, en uzun streak
- **`!bugün`** — Günlük aktivite özeti (mesaj, coin, bahis, sipariş)

## Atmosfer / Eğlence

- **`!fal`** — RE temalı rastgele kehanet, 1 saat cooldown, ücretsiz
- **`!ship @u1 @u2`** — Deterministic hash ile %0-100 uyum skoru

---

**Not**: Bu komutlar bot chat sistemi içindir. Overlay/görsel projeler için ayrı dokümantasyon tutulacak.
