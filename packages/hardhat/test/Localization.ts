import { expect } from "chai";
import { translate } from "../../nextjs/lib/parasite/i18n";
import { explain } from "../../nextjs/lib/parasite/riskRules";
import { selectPermission } from "../../nextjs/lib/parasite/selection";

describe("PARASITE Turkish and English localization", () => {
  it("keeps a verified zero selectable without treating it as an active organism", () => {
    const permissions = [
      { key: "revoked", allowance: 0n },
      { key: "active", allowance: 1n },
    ];
    expect(selectPermission(permissions, "revoked")?.key).to.equal("revoked");
    expect(selectPermission(permissions)?.key).to.equal("active");
    expect(selectPermission([permissions[0]])).to.equal(undefined);
  });
  it("translates navigation and transaction states without changing English", () => {
    expect(translate("WALLET X-RAY", "tr")).to.equal("CÜZDAN RÖNTGENİ");
    expect(translate("WAITING FOR CONFIRMATION", "tr")).to.equal("ZİNCİR ONAYI BEKLENİYOR");
    expect(translate("WALLET X-RAY", "en")).to.equal("WALLET X-RAY");
  });
  it("translates the full risk explanation while preserving its limitations", () => {
    const result = translate(explain(2n ** 255n, null), "tr");
    expect(result).to.contain("Sınırsız harcama yetkisi.");
    expect(result).to.contain("mevcut erişim kapsamı bilinmiyor");
    expect(result).to.contain("kanıtı değildir");
    expect(result).not.to.contain("spending authorization");
  });
  it("preserves exact raw bigint units and unknown technical data", () => {
    const units = (2n ** 256n - 1n).toString();
    expect(translate(`${units} raw units`, "tr")).to.equal(`${units} ham birim`);
    expect(translate("0x1234abcd", "tr")).to.equal("0x1234abcd");
    expect(translate("1.234567890123456789", "tr")).to.equal("1.234567890123456789");
  });
  it("translates recovery failures and keeps proof block numbers unchanged", () => {
    expect(translate("UNRESOLVED", "tr")).to.equal("DOĞRULAMA TAMAMLANAMADI");
    expect(translate("RECHECK TRANSACTION", "tr")).to.equal("İŞLEMİ YENİDEN KONTROL ET");
    expect(translate("Verification block", "tr")).to.equal("Doğrulama bloğu");
    expect(translate("12345678901234567890", "tr")).to.equal("12345678901234567890");
    expect(translate("Verification block", "en")).to.equal("Verification block");
  });
});
