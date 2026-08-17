import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "output" / "content.json"
OFFER = ROOT.parent / "sales" / "offer_catalog.json"


def main():
    data = json.loads(CONTENT.read_text(encoding="utf-8"))
    offer = json.loads(OFFER.read_text(encoding="utf-8"))["primary_offer"]
    cta = offer["cta"]

    caption = data.get("caption", "").rstrip()
    cta_text = f"\n\n毎日の繰り返し作業を1つ減らしたい方は、LINEで『自動化相談』と送ってください。\n{cta['url']}"
    if "自動化相談" not in caption:
        data["caption"] = caption + cta_text

    data["sales_offer"] = {
        "name": offer["name"],
        "price_from_jpy": offer["price_from_jpy"],
        "cta_label": cta["label"],
        "cta_url": cta["url"],
        "cta_keyword": "自動化相談"
    }
    data["conversion_goal"] = "LINE相談"
    CONTENT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print("sales_cta_enriched=true")


if __name__ == "__main__":
    main()
