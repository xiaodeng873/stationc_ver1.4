import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GOOGLE_GEMINI_API_KEY = "AIzaSyDz_Rcu5Vm_D__-bkIKAvfGVUOlhcy855o";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("開始檢測可用的 Gemini 模型...");

    // 1. 列出所有可用的模型
    const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_GEMINI_API_KEY}`;

    const listResponse = await fetch(listModelsUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let availableModels: any[] = [];
    let listError = null;

    if (listResponse.ok) {
      const listData = await listResponse.json();
      availableModels = listData.models || [];
      console.log(`找到 ${availableModels.length} 個可用模型`);
    } else {
      listError = await listResponse.text();
      console.error("列出模型失敗:", listError);
    }

    // 2. 測試常見的模型版本
    const modelsToTest = [
      "gemini-1.5-pro",
      "gemini-1.5-pro-001",
      "gemini-1.5-pro-002",
      "gemini-1.5-flash",
      "gemini-1.5-flash-001",
      "gemini-1.5-flash-002",
      "gemini-2.0-flash-exp",
      "gemini-pro",
      "gemini-pro-vision",
    ];

    const testResults = [];

    for (const modelName of modelsToTest) {
      console.log(`測試模型: ${modelName}...`);

      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;

      const testPayload = {
        contents: [
          {
            parts: [
              {
                text: "測試",
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 100,
        },
      };

      try {
        const testResponse = await fetch(testUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testPayload),
        });

        if (testResponse.ok) {
          const testData = await testResponse.json();
          testResults.push({
            model: modelName,
            status: "✅ 可用",
            statusCode: testResponse.status,
            hasResponse: !!testData.candidates,
          });
          console.log(`✅ ${modelName} 可用`);
        } else {
          const errorText = await testResponse.text();
          testResults.push({
            model: modelName,
            status: "❌ 不可用",
            statusCode: testResponse.status,
            error: errorText.substring(0, 200),
          });
          console.log(`❌ ${modelName} 不可用 (${testResponse.status})`);
        }
      } catch (error) {
        testResults.push({
          model: modelName,
          status: "❌ 錯誤",
          error: error.message,
        });
        console.log(`❌ ${modelName} 測試錯誤:`, error.message);
      }
    }

    // 3. 整理結果
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      apiKeyStatus: listResponse.ok ? "有效" : "可能無效或受限",
      totalAvailableModels: availableModels.length,
      availableModels: availableModels.map((m) => ({
        name: m.name,
        displayName: m.displayName,
        supportedGenerationMethods: m.supportedGenerationMethods,
      })),
      testResults: testResults,
      recommendation: testResults.find((r) => r.status === "✅ 可用")
        ? `建議使用: ${testResults.find((r) => r.status === "✅ 可用")?.model}`
        : "警告：沒有找到可用的模型！",
      listModelsError: listError,
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("測試過程發生錯誤:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "未知錯誤",
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
