export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          YAML Template LP System
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          全自動LP制作テンプレートシステム
          <br />
          MrTスタイル黄金律とナレッジ統合で95点以上の最高品質LP生成
        </p>

        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-lg mb-12 shadow-xl">
          <h2 className="text-2xl font-bold mb-2">🔥 NEW: 統合LP生成システム</h2>
          <p className="text-indigo-100 mb-4">
            13LP徹底分析から抽出したMrTスタイル黄金律を100%適用！<br />
            マルチエージェントシステムで自動的にナレッジを蓄積・統合
          </p>
          <a
            href="/generate"
            className="inline-block px-6 py-3 bg-white text-indigo-600 rounded-lg font-bold hover:bg-indigo-50 transition"
          >
            今すぐ無料で試す →
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              1. 画像アップロード
            </h3>
            <p className="text-gray-600">
              LPのスクリーンショットをアップロードするだけで自動解析
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              2. YAML化
            </h3>
            <p className="text-gray-600">
              OCRとレイアウト検出で自動的にYAMLテンプレートを生成
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              3. LP量産
            </h3>
            <p className="text-gray-600">
              テキストを差し替えるだけで同じデザインのLPを大量生産
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <a
            href="/dashboard"
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            ダッシュボードへ
          </a>
          <a
            href="/templates"
            className="px-8 py-3 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition"
          >
            テンプレート一覧
          </a>
        </div>

        <div className="mt-16 text-sm text-gray-500">
          <p>Powered by Next.js, Drizzle ORM, Stripe, AWS S3, Vercel</p>
        </div>
      </div>
    </div>
  );
}
