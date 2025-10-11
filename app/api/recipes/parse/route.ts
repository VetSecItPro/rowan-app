import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, imageBase64 } = body;

    if (!text && !imageBase64) {
      return NextResponse.json(
        { error: 'Please provide either text or an image' },
        { status: 400 }
      );
    }

    // Use Gemini 1.5 Flash for cost-effectiveness
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a recipe parser. Extract recipe information from the provided content and return ONLY valid JSON (no markdown formatting, no code blocks).

The JSON should have this exact structure:
{
  "name": "Recipe name",
  "description": "Brief description",
  "ingredients": [
    {"name": "ingredient name", "amount": "quantity", "unit": "measurement unit"}
  ],
  "instructions": "Step-by-step instructions",
  "prep_time": number (in minutes),
  "cook_time": number (in minutes),
  "servings": number,
  "difficulty": "easy" | "medium" | "hard",
  "cuisine_type": "cuisine type",
  "tags": ["tag1", "tag2"]
}

Rules:
- Extract all visible ingredients with their amounts and units
- If amount/unit is not specified, use empty strings
- Combine all instruction steps into a single paragraph or numbered list
- Estimate prep_time and cook_time if not explicitly stated
- Set difficulty based on recipe complexity (easy/medium/hard)
- Identify cuisine_type from the recipe (e.g., Italian, Mexican, Asian)
- Extract relevant tags (e.g., vegetarian, gluten-free, dessert)
- Return ONLY the JSON object, no other text

${text ? `Recipe content:\n${text}` : 'See the image for recipe content.'}`;

    let result;

    if (imageBase64) {
      // Process image
      const imageData = {
        inlineData: {
          data: imageBase64.split(',')[1], // Remove data:image/xxx;base64, prefix
          mimeType: imageBase64.split(';')[0].split(':')[1],
        },
      };

      result = await model.generateContent([prompt, imageData]);
    } else {
      // Process text only
      result = await model.generateContent(prompt);
    }

    const response = await result.response;
    const rawText = response.text();

    // Clean up the response - remove markdown code blocks if present
    let cleanedText = rawText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    const recipeData = JSON.parse(cleanedText);

    // Validate that we have the required fields
    if (!recipeData.name || !recipeData.ingredients || recipeData.ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract recipe information. Please ensure the content contains a valid recipe.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      recipe: recipeData,
    });

  } catch (error) {
    console.error('Recipe parsing error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Failed to parse recipe data. Please try with a different recipe or format.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred while parsing the recipe. Please try again.' },
      { status: 500 }
    );
  }
}
