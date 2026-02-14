import { NextResponse } from 'next/server';

const GLM_API_URL = process.env.GLM_API_URL || 'https://ollama.kabu-ai.jp/glm/api/paas/v4/chat/completions';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const textData = formData.get('text') as string;
    const imageFile = formData.get('image') as File | null;

    if (!textData) {
      return NextResponse.json({ error: "Required field 'text' is missing." }, { status: 400 });
    }

    if (!process.env.GLM_API_KEY) {
      return NextResponse.json({ error: 'GLM_API_KEY is not configured.' }, { status: 500 });
    }

    const modelName = imageFile ? 'glm-4v-flash' : 'glm-4.7-flashx';

    let messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>;

    if (imageFile) {
      const imageBuffer = await imageFile.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');

      messages = [{
        role: 'user',
        content: [
          { type: 'text', text: textData },
          { type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${imageBase64}` } },
        ],
      }];
    } else {
      messages = [{ role: 'user', content: textData }];
    }

    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GLM API Error:', response.status, errorText);
      return NextResponse.json({
        error: 'Failed to process request with GLM API.',
        details: errorText,
      }, { status: 500 });
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      response: result,
      hasImage: !!imageFile,
      imageName: imageFile ? imageFile.name : null
    });

  } catch (error) {
    console.error('GLM API Error:', error);
    return NextResponse.json({
      error: 'Failed to process request with GLM API.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
