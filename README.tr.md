<div align="center">

<img src="docs/assets/parasite-banner.svg" alt="PARASITE — Cüzdanın canlı. Keşfet. Anla. Kontrolü geri al." width="100%" />

**Tokenlarını kimin harcayabildiğini gör. Artık kullanmadığın izinleri kaldır.**

![Monad Testnet](https://img.shields.io/badge/Monad-Testnet_10143-836EF9?style=for-the-badge)
![Türkçe ve İngilizce](https://img.shields.io/badge/Dil-TR_%2F_EN-E891BA?style=for-the-badge)
![Yerel test sonucu](https://img.shields.io/badge/Yerel_testler-78_başarılı-57CDB5?style=for-the-badge)

[English](README.md) · **Türkçe**

[Nasıl çalışır?](#nasıl-çalışır) · [Kurulum](#kurulum) · [Tek-cüzdan demosu](#tek-cüzdanla-dene) · [Sözleşmeler](#gerçek-testnet-sözleşmeleri)

</div>

> [!IMPORTANT]
> Uygulama şu anda **Monad Testnet** üzerinde çalışır. Demo tokenları gerçek para değildir. PARASITE desteklenen izinleri kontrol eder; tam kapsamlı bir cüzdan güvenlik denetimi değildir.

## Uygulamadan çıktın. Peki izin de gitti mi?

Bir uygulamaya token harcama izni vermek, ona sınırları olan bir yedek anahtar bırakmaya benzer. Cüzdan bağlantısını kesmek, daha önce verdiğin bu izni kendiliğinden kaldırmaz.

**PARASITE, görünmeyen bu izinleri görünür yapar.** Her aktif izin, cüzdan çekirdeğine bağlı bir organizma olarak gösterilir. İzni seçer, kapsamını anlarsın. İstemiyorsan kendi cüzdanından kaldırırsın.

Parazit, bir iznin görsel temsilidir. Virüs bulduğumuz veya izin verdiğin adresin kötü niyetli olduğu anlamına gelmez.

![PARASITE ana sayfası](docs/assets/landing.png)

## Nasıl çalışır?

### 🟣 Keşfet — cüzdanının içine bak

Cüzdanını bağla. Desteklenen token ve izin verilen adres ilişkileri sözleşmelerden okunur. Sıfırdan büyük, doğrulanmış izinler parazit olarak görünür. Sıfır izinler envanterde kalır; aktif parazit sayılmaz.

### 🟠 Anla — Gözcü ve Köz ile tanış

- **Gözcü:** Sınırsız PDEM harcama iznini temsil eder. Mevcut bakiyenin tamamını kapsayabilir; gelecekte yatırılan tokenların da bu iznin kapsamında kalabileceğini anlatır.
- **Köz:** Ayrı bir **250 PDEM** iznini temsil eder. Gözcü'nün iznini kaldırmak Köz'ün iznini değiştirmez.

Röntgen ve erişim canlandırması yalnızca anlatımdır. Token transfer etmez. Miktarlar ise gerçek sözleşme okumalarından gelir.

![Gerçek testnet oturumunda iki izin ve Köz'ün 250 PDEM sınırı](docs/assets/wallet-xray.png)

<sub>Bu görsel gerçek bir testnet oturumunda kaydedildi. Güncel izinler sonradan değişebilir. Arayüz tam cüzdan adresini varsayılan olarak gizler.</sub>

### 🟢 Kaldır — sonucu gerçekten doğrula

İptal kartını incele ve cüzdanından onayla. PARASITE, **token sözleşmesindeki `approve(spender, 0)`** çağrısını kullanır. İki blok onayından sonra izin miktarını ayrıca yeniden okur. Parazit, yalnızca sıfır izin doğrulandığında kaybolur.

Rapor; kontrol edilen izinleri, önce/sonra aktif izin sayılarını, bu oturumdaki doğrulanmış iptalleri ve gerçek işlem bağlantılarını gösterir. Görsel kart, JSON veya yazdırılabilir rapor olarak alınabilir.

<details>
<summary><strong>Gerçek bir iptal raporunu gör</strong></summary>

![Önceki gerçek testnet oturumundan 1 → 0 raporu](docs/assets/confirmed-report.png)

Bu eski oturumda **1 → 0** değişimi doğrulandı. Görsel önceki arayüz sürümündendir. Bu bir güvenlik puanı veya tüm cüzdan risklerinin kaldırıldığı iddiası değildir. [İptal işlemini incele](https://testnet.monadexplorer.com/tx/0x25e2301b5137ff5e4c008d411b97e8eebfe5b507eb02ebaee1ba2681bddc1c55).

</details>

## Neler yapabilirsin?

- Tek cüzdanla izinleri kontrol et, incele ve kaldır.
- Türkçe veya İngilizce kullan.
- Kendi token/adres ilişkini güncel okumayla doğrulayıp ekle.
- Tek bir tokenın sınırlı blok aralığındaki izin olaylarını tara; eski olay değerlerine güvenmek yerine güncel izni yeniden oku.
- Bakiyenin ne kadarının izin kapsamında olduğunu kesin `bigint` hesabıyla gör.
- İsteğe bağlı yerel karşılaştırmayla önceki okumadan beri değişen izinleri incele.
- Bekleyen işlemi yeni imza vermeden yeniden doğrula.
- Mobilde dokunulabilir organizma ızgarasını, azaltılmış hareket seçeneğini ve klavye kontrollerini kullan.

## Kurulum

Gereksinimler: deponun belirttiği **Node.js 18.18 veya üzeri**, **Yarn 3.2.3** ve gerçek işlemler için tarayıcı cüzdanı.

Windows PowerShell'de depo kökünden:

```powershell
yarn.cmd install --immutable
yarn.cmd start
```

**[localhost:3000](http://localhost:3000)** adresini aç. Diğer kabuklarda `yarn.cmd` yerine `yarn` kullanabilirsin.

Gerekirse `packages/nextjs/.env.example` dosyasını `.env.local` adıyla aynı klasöre kopyala. RPC, WalletConnect ve isteğe bağlı sözleşme adresleri için [geliştirici rehberini](docs/DEVELOPMENT.md) incele. **Özel anahtarlar ön yüze veya Git'e eklenmez.**

## Tek cüzdanla dene

1. Cüzdanını bağla; **Monad Testnet / 10143** ağına geç.
2. **Test Alanı** bölümünü aç. İşlem ücreti için test MON, dolu bakiye örneği için PDEM gerekir.
3. Gözcü için sınırsız, Köz için 250 PDEM izni oluştur. Her işlemi ayrı ayrı kendi cüzdanından onayla.
4. **İzinlerimi Kontrol Et** düğmesine bas. İki aktif iznin başarıyla okunduğunu gör.
5. Gözcü ve Köz'ü seçerek kapsamlarını karşılaştır. Canlandırmada para gönderilmez.
6. Gözcü'nün iznini kaldır. İşlem onayı ve sıfır izin kontrolü tamamlandığında Gözcü kaybolur, Köz kalır.
7. İki iznin aktif olduğu oturum başlangıcından sonra yalnızca Gözcü kaldırıldıysa raporda **2 → 1** görürsün.

> [!NOTE]
> PDEM'in sabit 10.000 token arzı dağıtımda belirlenen cüzdana verilir. Farklı bir cüzdan bağlamak otomatik PDEM kazandırmaz. Dolu bakiye ile demo için bu test tokenlarını tutan bir cüzdan veya kendi demo dağıtımın gerekir. Örnek mod imza istemeden denenebilir.

## Gerçek testnet sözleşmeleri

**Ağ:** Monad Testnet · **Zincir kimliği:** `10143` · **İşlem ücreti:** test MON

- **PDEM:** [`0x8d2432d6ca3f97fc22c4fc26653fc0f90403d518`](https://testnet.monadexplorer.com/address/0x8d2432d6ca3f97fc22c4fc26653fc0f90403d518)
- **Gözcü:** [`0x4ade1e3c0733b41652aa8d12c51c8b3b5dc5d0df`](https://testnet.monadexplorer.com/address/0x4ade1e3c0733b41652aa8d12c51c8b3b5dc5d0df)
- **Köz:** [`0x52b8a59afd00ab49451d4722ab7594bc1b04bebd`](https://testnet.monadexplorer.com/address/0x52b8a59afd00ab49451d4722ab7594bc1b04bebd)

DemoToken, OpenZeppelin ERC20 kullanır. DemoSpender sözleşmelerinde token çekme işlevi yoktur. Gösterim, gerçek bir saldırıyı değil izin kapsamını anlatır. Çalışan sözleşme kodları yerel derleme çıktılarıyla karşılaştırılmıştır.

[Gerçek Köz onayı](https://testnet.monadexplorer.com/tx/0x931d49384efb7452242be0168b8755cb83601f21dfbe97f28446582ae1639802) · [Gerçek Köz iptali](https://testnet.monadexplorer.com/tx/0x78221cdd1bbe73ff69de55f3beda28351d3f5d130b859830ec4aada11bfba277)

## Teknik temel

**Next.js 14 · React 18 · TypeScript · Tailwind CSS · RainbowKit · Wagmi · Viem · Solidity · Hardhat · OpenZeppelin**

Mevcut Monad Scaffold-ETH altyapısı korunmuştur. Ayrı bir arka uç veya ağır 3B motor gerekmez. Blokzincir okumaları, işlem yazmaları, risk kuralları ve görseller ayrı katmanlardadır. [Mimari ve kurulum ayrıntıları](docs/DEVELOPMENT.md).

## Testler ve güven sınırları

Son yerel doğrulamada **78 test geçti**. Ön yüz ve Hardhat tür kontrolleri, ön yüz kod denetimi ve üretim derlemesi başarılı. Bu sonuç, bağımsız güvenlik denetimi veya uzaktan çalışan CI sonucu değildir.

```powershell
yarn.cmd hardhat:test
yarn.cmd next:check-types
yarn.cmd hardhat:check-types
yarn.cmd next:lint
yarn.cmd next:build
```

- Tüm cüzdan izinlerinin bulunduğu iddia edilmez; desteklenen ilişkiler kontrol edilir.
- Okunamayan bilgi sıfır veya güvenli sayılmaz.
- İzin büyüklüğü bir adresin dolandırıcı olduğunu kanıtlamaz.
- İptal, çalınmış tokenları geri getirmez; diğer izinleri ve tüm zincir dışı imzaları kaldırmaz.
- USD kayıp tahmini, uydurma güvenlik puanı veya itibar verisi üretilmez.
- Yerel karşılaştırma sürekli koruma değildir; yenilemeyle çalışır.
- Tamamlanmış oturum raporları sayfa yenilenince sıfırlanır. Bekleyen işlem takibi geri yüklenebilir; bilinmeyen başlangıç sayısı uydurulmaz.
- Herkese açık bir ön yüz yayını veya ana ağ sürümü doğrulanmış değildir.

## Sonraki adımlar

Daha geniş ve açıkça belgelenmiş token kapsamı, yeniden doğrulanabilen taşınabilir rapor geçmişi, token uyumluluk adaptörleri, daha fazla cüzdan testi ve güvenilir bir indeksleyiciyle isteğe bağlı izleme.

---

<div align="center">

**Cüzdan senin. Erişimin kontrolü de sende olsun.**

[English](README.md) · [Geliştirici rehberi](docs/DEVELOPMENT.md) · [Sorun bildir](https://github.com/Pentamatra/PARASITE/issues)

</div>
