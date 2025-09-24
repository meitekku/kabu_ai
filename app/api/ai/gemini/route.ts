import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini APIキーを環境変数から取得
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const textData = formData.get('text') as string;
    const imageFile = formData.get('image') as File | null;

    if (!textData) {
      return NextResponse.json({ error: "Required field 'text' is missing." }, { status: 400 });
    }

    let result;

    if (imageFile) {
      // 画像付きの場合
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // 画像をbase64に変換
      const imageBuffer = await imageFile.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      
      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: imageFile.type
        }
      };

      const response = await model.generateContent([textData, imagePart]);
      result = response.response.text();
    } else {
      // テキストのみの場合
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent(textData);
      result = response.response.text();
    }

    return NextResponse.json({
      success: true,
      response: result,
      hasImage: !!imageFile,
      imageName: imageFile ? imageFile.name : null
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process request with Gemini API.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}