import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GOOGLE_GEMINI_API_KEY = "AIzaSyDz_Rcu5Vm_D__-bkIKAvfGVUOlhcy855o";

interface GeminiRequest {
  ocrText: string;
  prompt: string;
}

interface GeminiResponse {
  extractedData: any;
  confidenceScores: Record<string, number>;
  success: boolean;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { ocrText, prompt }: GeminiRequest = await req.json();

    if (!ocrText || !prompt) {
      return new Response(
        JSON.stringify({ success: false, error: "缺少OCR文字或prompt" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;

    const fullPrompt = `${prompt}\n\n以下是OCR識別的文字：\n${ocrText}\n\n請直接返回JSON格式，不要有任何其他文字說明。`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              text: fullPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
    };

    const geminiResponse = await fetch(geminiApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Google Gemini API 錯誤: ${geminiResponse.status}` 
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

    const geminiData = await geminiResponse.json();

    if (geminiData.candidates && geminiData.candidates[0]?.content?.parts) {
      let responseText = geminiData.candidates[0].content.parts[0].text;
      
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      try {
        const extractedData = JSON.parse(responseText);
        
        const confidenceScores: Record<string, number> = {};
        for (const key in extractedData) {
          if (extractedData[key] && extractedData[key] !== '') {
            confidenceScores[key] = 0.85;
          } else {
            confidenceScores[key] = 0.0;
          }
        }
        
        const result: GeminiResponse = {
          extractedData,
          confidenceScores,
          success: true,
        };

        return new Response(JSON.stringify(result), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      } catch (parseError) {
        console.error("JSON parse error:", parseError, "\nResponse:", responseText);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "無法解析AI返回的資料，請嘗試修改prompt" 
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "AI無法生成有效的輸出" 
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error("Error in gemini-extract function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "未知錯誤" 
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
