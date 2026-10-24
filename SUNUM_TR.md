# PARASITE: en basit anlatım

Bir uygulamaya token harcama izni vermek, ona sınırları olan bir yedek anahtar bırakmaya benzer. Cüzdan bağlantısını kesmek bu izni otomatik kaldırmaz. PARASITE desteklenen token/yetkili çiftlerinde izni zincirden okur, anlaşılır biçimde gösterir ve kullanıcının kendi cüzdanından kaldırmasına yardımcı olur.

Parazit = harcama izninin görsel temsili. Virüs, saldırgan veya kötü niyetli sözleşme tespit edildiği anlamına gelmez. Demo spender sözleşmeleri token çekemez. Erişim canlandırması matematikseldir; token taşımaz.

## Bu demoda gerçekten başarılan

- Tek MetaMask cüzdanı ve Monad Testnet kullanıldı.
- 10.000 PDEM test tokenı ve iki demo yetkilisi hazırlandı.
- Birine sınırsız, diğerine 250 PDEM izin verildi; izinler gerçek zincir okumalarıyla gösterildi.
- İki izin de kullanıcının imzaladığı approve(spender, 0) işlemleriyle kaldırıldı.
- Son ekranda 2 → 0 aktif izin, 2 doğrulanmış iptal görüldü.
- İptal hash'leri: 0x3578fbbd56a70896dd2e705a287dfa55e397bb40f4c0f94f5dbc283197800d17 ve 0x03f4342cbbfb931ba7ee8d1274e29387921c1b778abb0ec3cc47451b5753956f.
- Son iptal makbuz bloğu 73806306; sıfır izin ayrıca 73806406 bloğunda okundu. Bunlar uygulamada görülen gerçek kanıtlardır.

## Gecikme düzeltmesi

Scaffold altyapısının arka plan okuma aralığı 30 saniye. İşlem makbuzu bekleme bu ayarı miras alıyordu. Yalnızca aktif işlem beklerken pollingInterval 1000 ms olarak değiştirildi; arka plan taraması sıklaştırılmadı. İki onay, işlem hedefi/verisi doğrulaması ve güncel izin okuması korunuyor. Testler bu iki onayı ve 1000 ms ayarını doğruluyor. Değişiklikten sonraki yeni imzalı işlem süresi henüz ölçülmedi; ağ veya MetaMask gecikmesi için hız garantisi verilmez.

## 90 saniyeden kısa konuşma

Yaklaşık 150 kelime; hedef 75–85 saniye. Köşeli parantezli sahne notları okunmaz.

[Cüzdan röntgenini göster.]

Telefonunuzda bir uygulamayı kapatınca işi bitti sanırsınız. Peki cüzdanınızda da öyle mi?

Bir uygulamaya verdiğiniz token harcama izni, siz ayrıldıktan sonra kalabilir. Yani uygulamadan çıktınız ama yedek anahtar hâlâ onda.

Ben bu görünmeyen anahtarları görünür yaptım: PARASITE.

[Bir paraziti seç.]

Ekrandaki her parazit bir harcama iznini temsil ediyor. Bu virüs bulduğumuz anlamına gelmiyor. Kimin, hangi tokena, ne kadar erişim yetkisi olduğunu gösteriyoruz.

Burada bir sınırsız izin ve bir 250 tokenlık izin var. Röntgen görsel anlatım; miktarlar gerçek sözleşme okumaları. Canlandırmayı açınca bu iznin kapsamını görüyoruz. Hiçbir token hareket etmiyor.

[Sınırsız izni iptal et; cüzdanı kendin onayla.]

İstemediğim izni kaldırıyorum. İşlem Monad Testnet'e gidiyor. Parazit, yalnızca işlem onaylanıp izin tekrar sıfır okunduğunda kayboluyor. Diğer izin kendi başına duruyor.

[Doğrulanmış sonucu ve işlem bağlantısını göster.]

Tek cüzdanla gerçek izin oluşturduk, gördük ve kaldırdık. Bütün cüzdan risklerini çözdüğümüzü iddia etmiyoruz. Desteklediğimiz izinleri anlaşılır ve kontrol edilebilir yapıyoruz.

PARASITE: Cüzdan senin. Erişimin kontrolü de sende olsun.

## Sahne hazırlığı

1. Sunumdan önce iki demo iznini açıkça yeniden oluştur ve canlı taramada 2 aktif izin gördüğünü kontrol et. Şu anki gerçek durum iki iznin de sıfır olmasıdır.
2. Cüzdan Röntgeni ekranında sınırsız izni seç. Canlandırmayı kısa göster ve kapat. Sunum modu kaldırıldı; normal gezinme kullanılır.
3. Sahnedeki iptal için yalnızca bir izin kullan; ikinciyi bağımsız kaldığının kanıtı olarak bırak.
4. İmza penceresini ve ücretini önceden tanı. Kurtarma alanından yeni sözleşme oluşturma; mevcut iki spender yeterli.
5. Ağ bekletirse sessizce beklemek yerine kapsamı anlat. 90 saniyeye sığmazsa önceden doğrulanmış raporu göster ve açıkça “Bu, önceki gerçek provanın sonucu; şu anki işlem hâlâ bekliyor” de. Bekleyen işlemi başarılı gibi sunma.
6. Bir izin iptal edilince “cüzdan tamamen güvende” deme. Yalnızca o yetkili/token ilişkisinin kaldırıldığını söyle.

## Bundan sonra en değerli geliştirmeler

1. Oturum raporlarını zincirden yeniden doğrulayarak geri açabilmek: yenileme sonrası geçmiş kanıtı korur; güncel izinle geçmiş makbuzu ayrı göstermelidir.
2. Daha fazla gerçek token/yetkili ilişkisinde doğrulanmış kapsam: demo tokenından genel kullanıma geçişi güçlendirir. Bir dizin veya indeksleyici eklenirse tarama sınırları açık olmalıdır.
3. Yeni kullanıcıya 20 saniyelik rehber: bağlantı, harcama izni ve para transferi arasındaki farkı doğrudan ürün içinde anlatır.
4. Kullanıcı onayıyla günlük kullanıma uygun izleme: önceki okumayla değişiklikleri karşılaştırır; açık tarama kapsamı olmadan “cüzdanı sürekli koruyoruz” denmez.

Hackathon öncesi öncelik daha çok özellik değil, 90 saniyelik tek cüzdan provasını birkaç kez sorunsuz tamamlamaktır. Yerelde kalma tercihi korunur; yayın yapılmadı.
