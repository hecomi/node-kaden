node-kaden
==============

はじめに
--------------
hecomi 家の家電を操作するための node.js ベースのシステムです。
開発中なのです。随時更新していきます。

※ 一部、アップロードしていないファイルもありますのでそのままではおそらく動きません。

環境
--------------
* Ubuntu 10.04

出来ること
--------------
音声や Twitter での呼びかけで家電を操作することができます。
操作は iRemocon を用いています。

* Julius で音声認識
  * 認識する言葉は正規表現ライクにスクリプトから登録できます。
    * 登録には Gin による構文解析を利用しています。
* OpenJTalk によるトークバック
  * 声の呼びかけや Twitter の呼びかけに対して喋ってくれます。
* Twitter からのコマンド実行
  * User Stream につないでいるので @ を飛ばした直後にコマンドを実行してくれます。
* 簡単コマンド登録
  * 設定 XML ファイルに直接 JavaScript を書いてマクロを登録できます。
  * 時間を聞いたりもできます。

今後の予定
--------------
* ブラウザからコマンド XML を簡単に編集できるようにする
* ブラウザ上から学習できるようにする
* Kinect もつなぐ
* 温度や湿度も取れるように他のセンサもつなぐ
  * Twine 出ないかな…。
* 家電の ON/OFF を取れるようにする
* 音声のフィードバックだけでなくアバター表示などに対応する

詳細
--------------
詳細は http://d.hatena.ne.jp/hecomi/ もしくは Twitter で @hecomi まで。
