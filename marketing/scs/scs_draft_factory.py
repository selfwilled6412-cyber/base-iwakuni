#!/usr/bin/env python3
"""BASE-only social draft generator: generates text, never publishes."""
import argparse, datetime, json
from pathlib import Path
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

ROOT = "https://selfwilled6412-cyber.github.io/base-iwakuni/security/scs/"
IPA = "https://www.ipa.go.jp/security/scs/details.html"
SECTORS = [
  ("建設業","図面・見積・現場写真"), ("製造業","設計図・委託先データ"),
  ("士業","顧客の契約書・個人情報"), ("福祉事業所","利用者情報・職員ID"),
  ("飲食・小売","顧客予約・POS情報"), ("物流会社","配送情報・取引先システム")
]
TIPS = [
  ("多要素認証","パスワードだけでログインしている","重要なアカウントに多要素認証を設定する"),
  ("バックアップ","保存先が1か所だけになっている","別の場所にバックアップを取り復元できるか試す"),
  ("退職者ID","退職者のIDが使えるまま","退職時にアカウントを無効化して権限を回収する"),
  ("更新管理","古いパソコンが残っている","端末を一覧化し計画的に更新する"),
  ("メール詐欺","送信元だけで信用してしまう","怪しい請求や振込変更は別経路で確認する"),
  ("共有リンク","誰でも開ける共有URLが残っている","共有相手と有効期限を見直す"),
  ("管理者権限","全員が管理者権限を持っている","必要な人だけに管理者権限を限定する"),
  ("事故連絡","情報漏えい時の連絡先が決まっていない","初動担当と報告ルートを決めておく"),
  ("紛失対策","社用端末を紛失しても止められない","端末の暗号化・画面ロック・遠隔停止を確認する"),
  ("委託先管理","委託先との責任範囲が曖昧","情報管理の役割と責任分界を確認する"),
  ("復旧計画","システムが止まった時の代替手段がない","復旧優先順位と代替業務を決める"),
  ("社員教育","怪しい添付ファイルを開きがち","短い事例で定期的に注意点を共有する")
]
def tracked(network):
    return ROOT + "?" + urlencode({"utm_source":network,"utm_medium":"organic","utm_campaign":"scs_security_2026"})
def make(day, sequence, n):
    sector, asset = SECTORS[sequence // len(TIPS)]
    topic, risk, action = TIPS[sequence % len(TIPS)]
    hook = sector + "の経営者さん、" + topic + "は大丈夫？"
    script = "会社では" + asset + "を管理しています。「" + risk + "」なら要注意。まずは、" + action + "。岩国市の株式会社BASEは、無理のない優先順位でサイバー対策の現状整理を支援します。"
    slides = [sector+"のサイバー対策", hook, "こんな状態は要注意\n"+risk, "まず確認\n"+action, "社外の相談先を\nつくろう", "株式会社BASE\n法人向け初回相談無料"]
    title = "【"+sector+"】"+topic+"、そのままで大丈夫？｜BASE #Shorts"
    yt = hook+"\n"+script+"\n企業の相談はこちら："+tracked("youtube")+"\n参考：IPA "+IPA+"\n#岩国市 #サイバー対策 #中小企業"
    fb = "【"+sector+"の情報管理チェック】\n"+hook+"\n"+risk+"なら、"+action+"。\n株式会社BASEが現状整理を支援。"+tracked("facebook")
    li = "【"+sector+"の実務セキュリティ】\n扱う情報："+asset+"\n課題："+risk+"\n最初の対策："+action+"\n地域の法人向け初回相談："+tracked("linkedin")
    insta = hook+"\n今日からできること："+action+"。\n詳しくはプロフィールのリンクから。\n#岩国市 #企業のセキュリティ #中小企業"
    x = hook+" "+risk+"なら、"+action+"。株式会社BASEは岩国の法人向けに現状整理を支援。"+tracked("x")
    gmb = sector+"のセキュリティ相談受付中。"+asset+"の管理は大丈夫でしょうか。"+topic+"対策は、"+action+"。株式会社BASE（岩国市）初回相談無料。"
    if len(x)>280: raise ValueError("X text too long")
    return {"id":"base-scs-"+day+"-"+str(n),"brand":"株式会社BASE",
            "mode":"DRAFT_ONLY","channel_verified":False,"industry":sector,
            "topic":topic,"short":{"title":title,"narration":script,"slides":slides,"description":yt,"seconds":30},
            "platforms":{"youtube":yt,"facebook":fb,"instagram":insta,"tiktok":insta,"linkedin":li,
                         "threads":fb,"x":x,"google_business_profile":gmb},
            "source_url":IPA,"publish_checks":["BASEチャンネルIDを本人確認","IPAの最新更新日と内容を確認","投稿文・動画を確認","公開の本人許可を確認"]}
def main():
    a=argparse.ArgumentParser()
    a.add_argument("--date")
    a.add_argument("--output",default="marketing/scs/output")
    args=a.parse_args()
    d=datetime.date.fromisoformat(args.date or datetime.datetime.now(ZoneInfo("Asia/Tokyo")).date().isoformat())
    total=len(SECTORS)*len(TIPS)
    start=(d.toordinal()*2)%total
    posts=[make(d.isoformat(),(start+i)%total,i+1) for i in range(2)]
    out=Path(args.output)/d.isoformat()
    out.mkdir(parents=True,exist_ok=True)
    package={"date":d.isoformat(),"brand":"株式会社BASE","mode":"DRAFT_ONLY_NO_POSTING","posts":posts}
    (out/"bundle.json").write_text(json.dumps(package,ensure_ascii=False,indent=2),encoding="utf-8")
    lines=["# BASE SCS SNS台本 "+d.isoformat(),"自動公開なし。KARDIVEX等への投稿禁止。"]
    for p in posts:
        lines.extend(["## "+p["id"],"### YouTube Shortsタイトル",p["short"]["title"],"### 読み上げ",p["short"]["narration"],"### 画面6枚",*p["short"]["slides"]])
        for network,body in p["platforms"].items():
            lines.extend(["### "+network,body])
    (out/"drafts.md").write_text("\n\n".join(lines),encoding="utf-8")
    print("Created",len(posts),"BASE-only draft packs:",out)
if __name__=="__main__": main()
