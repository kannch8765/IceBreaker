# 🚀 Nexus Connect

<div align="center">

### 🌐 Language
EN **English** | 🇯🇵 [日本語](#-日本語)

</div>

---

# EN English

## 🌍 Brand New "Hello World."
For decades, "Hello World" has been a developer's first interaction with a machine. In the AI era, we redefine it as the machine facilitating **a human's first interaction with another human**. 

Networking events and hackathons are full of brilliant people who hesitate to say "hello" because of social friction. **Nexus Connect** is a Brand New "Hello World" for human connection—an immersive, real-time platform that uses AI to eliminate awkwardness, instantly visualize relationships, and hand you the perfect conversation starter. It transforms a room of strangers into a living, interconnected network.

## 🧠 Concept & Story
**Why this matters now:** Post-pandemic, we crave real-world connections but often lack the conversational bridge to initiate them. We built Nexus Connect to solve the "standing awkwardly near the snacks" problem. By offloading the cognitive load of finding common ground to Vertex AI, participants can bypass small talk and jump straight into meaningful, high-value conversations. It's a social catalyst designed for scale.

## 💡 What Makes This "Brand New"
1. **Dual-View Architecture**: Separates the **Event Hall View** (a high-performance D3.js spatial network visualized on a large monitor) from the **Participant View** (a lightweight, Framer Motion-driven mobile UI).
2. **Context-Aware Ice Breaking**: Not just matching tags. Gemini AI dynamically interrogates users based on their mood and generates exactly 3 bespoke conversation topics for every matched pair.
3. **Real-Time Visual Feedback**: The moment a user completes onboarding, their node physically "drops" into the global D3.js network graph on the main screen, instantly tethering to their best matches.

## 🛠️ Product Overview
Nexus Connect is a real-time event visualization and AI matchmaking platform.

- **Live Network Graph**: D3.js powered visualization handling real-time node forces.
- **Dynamic AI Onboarding**: Vertex AI poses personalized questions to users upon joining.
- **Smart Matchmaking**: Connects attendees based on multidimensional analysis.
- **AI Name Cards**: Generates "Nano-Banana" customized animal avatars for a playful, memorable digital identity.

## 🎬 Demo Flow (CRITICAL)
1. **Host Setup (Input)**: The presenter opens the Event Hall screen (Desktop). A glowing dark-mode D3.js canvas appears with a QR code for the session.
2. **Participant Onboarding (Input)**: A user scans the QR code on their phone, opens the Web App (Mobile), inputs `#username`, and selects a `Mood`.
3. **AI Interrogation (System)**: The backend (Cloud Run) triggers Vertex AI, instantly generating rapid-fire setup questions based on the user's initial input. The user submits answers.
4. **The Magic Moment (Output)**: 
   - **On the Big Screen**: A new node bursts into the D3.js graph, snapping connecting lines to 2-3 other highly compatible attendees in the room via Firestore real-time listeners.
   - **On the Phone**: A beautifully animated Digital Name Card drops down, revealing the matched partner's location, a bespoke Nano-Banana animal avatar, and **3 Gemini-generated conversation topics**.

## ⚙️ Technical Architecture
```text
[ Mobile UI (Next.js/React) ] --- (Firestore Real-time Sync) --- [ Event Hall UI (D3.js/React) ]
                 \                                                /
            (State: "waiting_for_ai")                     (State: "ready")
                   \                                            /
                    \------ [ Cloud Run (Worker) ] ------------/
                                  |         |
                           (Vertex AI)  (Nano-Banana API)
```
- **Frontend**: Next.js (App Router), React, TailwindCSS, Framer Motion. D3.js isolates heavy DOM manipulations to prevent React conflicts.
- **Backend / DB**: Firebase Firestore handles state machine transitions. Cloud Run processes AI payloads asynchronously.

## 🤖 Google Tech Usage (VERY IMPORTANT)
We integrated Google tech because of strictly enforced architectural constraints, not just for API calls.

- **Vertex AI (Gemini 1.5 Flash)**: Essential for extracting structural data from unstructured user answers. We don't just ask for text; we demand strict JSON schema compliance to parse and route the 3 specific conversation topics back to the frontend without breaking the app.
- **Firebase Firestore**: We rely heavily on sub-collections and real-time listeners. Our 5-stage state machine (`generating_questions` → `answering` → `waiting_for_ai` → `ready`) is entirely Firestore-driven, allowing the React UI to be completely stateless and purely reactive.
- **Google Cloud Run**: Using serverless containers ensures that computationally heavy AI generations do not block the real-time Event Hall view. This enables horizontal scaling if 500 people scan the QR code at the exact same moment.

## 📈 Scalability & Robustness
- **Load Handling**: By decoupling UI state from backend processing using Firestore as an event bus, the system smoothly handles simultaneous spikes (e.g., keynote finishes, everyone joins at once).
- **Error Boundaries**: If Gemini times out or Nano-Banana fails, the state machine reverts to an `error` status, safely triggering a Framer Motion fallback UI without crashing the global D3 graph.

## 🌐 Deployment & Reproducibility
1. Clone the repository: `git clone https://github.com/kannch8765/IceBreaker.git`
2. Install dependencies: `npm install`
3. Set up `.env.local` with Firebase config and Google Cloud credentials.
4. Run locally: `npm run dev`
5. Visit `http://localhost:3000/hall` for the host view, and scan the QR with your phone.

## 🧪 Technical Challenge & Difficulty
The hardest challenge was **React vs. D3.js DOM governance**. D3 expects to mutate the DOM, while React expects pure state mapping. We built a custom bridging hook that allows Firestore streams to update specific D3 simulation nodes (alpha forces) seamlessly *without* triggering full React re-renders. Visually, nodes smoothly glide into place instead of snapping abruptly when a new user finishes their AI generation.

## 🧬 “Outlier” Factor (異端性)
Instead of uploading a selfie or picking a generic avatar, we use the obscure **Nano-Banana API** triggered by the user's Vertex AI output. This assigns every user a highly stylized, quirky, and personalized "Animal Persona" (e.g., "A cybernetic neon sloth wearing sunglasses"). It completely bypasses privacy concerns while guaranteeing that the result is an instant conversation piece.

## 🎯 Impact & Future Potential
**Impact**: Eliminates social friction at professional events.
**Future**: Integrating LinkedIn API to allow the D3 graph to pull in professional histories, mapping not just "who is here," but "who you need to meet to raise your Series A." Nexus Connect can easily be licensed as a B2B SaaS for event organizers globally.

## 🙌 Team & Credits
- **Lead Engineer & Creative Technologist**: [Your Name/Handle]
- Thanks to the open-source communities behind D3.js and Framer Motion. 
- Powered by Google Cloud & Vertex AI.

---

# JP 日本語

<div align="center">

### 🌐 言語切替
EN [English](#-english) | 🇯🇵 **日本語**

</div>

## 🌍 Brand New "Hello World."
何十年もの間、「Hello World」は開発者が機械と交わす最初の言葉でした。AI時代において、私たちはこれを**「機械の力で促進される、人間同士の最初の挨拶」**として再定義します。

ハッカソンやカンファレンスには優秀な人々が集まりますが、心理的ハードルにより「Hello」と言えないことが多々あります。**Nexus**は、人間関係構築のための全く新しい「Hello World」です。AIを用いて気まずさを排除し、リアルタイムで繋がりを可視化し、完璧な会話のきっかけを提供する没入型プラットフォームです。見知らぬ人々の集まりを、生き生きとしたネットワークへと変貌させます。

## 🧠 Concept & Story
**なぜ今、これが必要なのか：** 私たちはリアルな繋がりを求めつつも、会話のきっかけを掴めずにいます。Nexusは、「会場の隅で気まずく立ち尽くす」という課題を解決するために生まれました。共通点を探すという認知的負荷をVertex AIに任せることで、参加者は表面的な会話を飛ばし、すぐに価値のある深い対話に入ることができます。スケールを前提に設計された、ソーシャルカタリスト（繋がりを加速する触媒）です。

## 💡 What Makes This "Brand New"
1. **デュアルビュー・アーキテクチャ**：大型モニターに映し出される高性能なD3.js空間ネットワーク（Event Hall View）と、Framer Motion駆動の軽量なモバイルUI（Participant View）を分離。
2. **コンテキスト連動型アイスブレイク**：単なるタグ付けマッチングではありません。Gemini AIがユーザーの気分に基づいて動的に質問を生成し、マッチしたペアごとに専用の話題を正確に3つ提供します。
3. **リアルタイムな視覚的フィードバック**：参加が完了した瞬間、メイン画面のD3.jsネットワークグラフに自分のノードが「落下」し、最適な相手と瞬時に線で結ばれる圧倒的な体験。

## 🛠️ Product Overview
Nexusは、イベントのリアルタイム可視化とAIマッチングを行うプラットフォームです。

- **ライブネットワークグラフ**：D3.jsによるリアルタイムな物理演算を用いたノード可視化。
- **動的AIオンボーディング**：Vertex AIが参加時にパーソナライズされた質問を投げかけます。
- **スマートマッチング**：多次元的な分析により、最適な参加者同士を繋ぎます。
- **AIネームカード**：「Nano-Banana」を用いてパーソナライズされた動物アバターを生成し、遊び心のある印象的なデジタルアイデンティティを提供します。

## 🎬 Demo Flow (CRITICAL)
1. **ホストのセットアップ（入力）**：プレゼンターがEvent Hall画面（PC）を開きます。ダークモードで光るD3.jsキャンバスと参加用QRコードが表示されます。
2. **参加者オンボーディング（入力）**：ユーザーがスマホでQRコードを読み取り、Webアプリを開いて「名前」と「今の気分」を入力します。
3. **AIインタビュアー（システム）**：バックエンド（Cloud Run）がVertex AIを呼び出し、初期入力に基づく質問を即座に生成。ユーザーがそれに回答します。
4. **マジック・モーメント（出力）**：
   - **巨大スクリーン上**：D3.jsグラフに新しいノードが弾け飛び、Firestoreのリアルタイム同期により、会場にいる相性の良い2～3人の参加者と瞬時に線で結ばれます。
   - **スマホ上**：美しいアニメーションと共にデジタルネームカードが表示され、マッチした相手、Nano-Banana生成の動物アバター、そして**Geminiが生成した3つの会話のきっかけ**が提示されます。

## ⚙️ Technical Architecture
```text
[ スマホUI (Next.js/React) ] --- (Firestore リアルタイム同期) --- [ 会場UI (D3.js/React) ]
                 \                                                /
            (状態: "waiting_for_ai")                        (状態: "ready")
                   \                                            /
                    \------ [ Cloud Run (ワーカー) ]------------/
                                  |         |
                           (Vertex AI)  (Nano-Banana API)
```
- **フロントエンド**: Next.js (App Router), React, TailwindCSS, Framer Motion。D3.jsはReactとの競合を避けるため、DOM操作を分離してパフォーマンスを確保しています。
- **バックエンド / DB**: Firebase Firestoreが状態遷移（ステートマシン）を管理し、Cloud Runが重いAI処理を非同期で実行します。

## 🤖 Google Tech Usage (VERY IMPORTANT)
単なるAPI呼び出しではなく、アーキテクチャ上の必然性からGoogleの技術を深く統合しています。

- **Vertex AI (Gemini 1.5 Flash)**：ユーザーの非定型な回答から構造化データを抽出するために不可欠です。単なるテキストではなく、厳密なJSONスキーマでの出力を要求し、アプリをクラッシュさせることなく3つの固有の話題をフロントエンドに確実に戻します。
- **Firebase Firestore**：サブコレクションとリアルタイムリスナーを極限まで活用。5段階のステートマシン（`generating_questions` → `answering` → `waiting_for_ai` → `ready`）は完全にFirestore駆動であり、React UIを完全にステートレスかつリアクティブに保ちます。
- **Google Cloud Run**：サーバーレスコンテナを使用することで、重いAI生成処理がリアルタイムなEvent Hallビューをブロックしないようにしています。500人が同時にQRコードをスキャンしても、水平スケールで完璧に処理します。

## 📈 Scalability & Robustness
- **負荷耐久性**：Firestoreをイベントバスとして使用し、UIの状態管理とバックエンド処理を分離。基調講演の終了直後など、全員が同時にアクセスするスパイクにもスムーズに対応します。
- **エラーハンドリング**：GeminiのタイムアウトやAPI障害が発生した場合、ステートマシンは`error`状態に移行。メインのD3グラフをクラッシュさせることなく、安全にFramer MotionのフォールバックUIを表示します。

## 🌐 Deployment & Reproducibility
1. リポジトリのクローン: `git clone https://github.com/kannch8765/IceBreaker.git`
2. 依存関係のインストール: `npm install`
3. `.env.local` に Firebase の設定と Google Cloud の認証情報を設定。
4. ローカルで実行: `npm run dev`
5. `http://localhost:3000/hall` にアクセスしてホスト画面を開き、スマホでQRコードを読み取ります。

## 🧪 Technical Challenge & Difficulty
最大の技術的課題は、**ReactとD3.jsにおけるDOM管理の衝突**でした。D3は直接DOMを操作しますが、Reactは状態の純粋なマッピングを求めます。私たちは専用のブリッジフックを構築し、Reactの全体再レンダリングを引き起こすことなく、Firestoreのストリームが特定のD3シミュレーションノードに動的かつ滑らかに力を加えることを可能にしました。これにより、AI処理が完了したノードが突然出現するのではなく、美しく滑り込むような視覚体験が実現しています。

## 🧬 “Outlier” Factor (異端性)
自撮り写真をアップロードしたり、一般的なアバターを選ぶのではなく、Vertex AIの出力からマニアックな**Nano-Banana API**を呼び出しています。これにより、全員に超個性的で奇抜な「動物ペルソナ」（例：「サングラスをかけたサイバーパンクなネオン・ナマケモノ」など）が割り当てられます。プライバシーの懸念を完全に排除しつつ、それがそのまま「最初の会話のネタ」になるという強烈な異端性を持ち合わせています。

## 🎯 Impact & Future Potential
**インパクト**：ビジネスイベントにおける心理的摩擦を完全に排除します。
**将来性**：LinkedIn APIを統合し、「誰がいるか」だけでなく「資金調達のために誰に会うべきか」までD3グラフで可視化可能。Nexusは、世界中のイベント主催者向けのB2B SaaSとして容易にライセンス展開できるポテンシャルを秘めています。

## 🙌 Team & Credits
- **リードエンジニア ＆ クリエイティブテクノロジスト**: [お名前/ハンドルネーム]
- D3.js および Framer Motion のオープンソースコミュニティに感謝します。
- Powered by Google Cloud & Vertex AI.
