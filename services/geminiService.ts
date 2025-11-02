import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_PROMPT = `You are a world-class chess grandmaster and analyst. Your name is 'ChessMind'.
Analyze the following chess position described by the user's text and the provided image of the board.

Your response must be structured in three distinct parts, separated by '---'.

Part 1: The Move
Provide the single best move in standard algebraic notation.
Then, provide a simple, one-sentence explanation of the move's main idea.
Format this part exactly as:
Best Move: [Your suggested move in algebraic notation]
Explanation: [Your simple, one-sentence explanation]

---

Part 2: The Analysis
Provide a detailed, expert-level analysis of why it's the optimal move, considering tactical possibilities, strategic advantages, and potential responses from the opponent.
Start this part with "Analysis:".

---

Part 3: The Diagram
Provide a simple 8x8 ASCII diagram of the board. Use standard piece notation (p, n, b, r, q, k for black and P, N, B, R, Q, K for white). Use '.' for empty squares.
On the diagram, highlight the move by placing an asterisk '*' on the starting square and an 'x' on the destination square.
Start this part with "Strategic Diagram:".
`;

interface ImagePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export const analyzeChessPosition = async (prompt: string, image: ImagePart | null): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';

    const parts: ({text: string} | ImagePart)[] = [
        {text: SYSTEM_PROMPT},
        {text: `User's scenario: "${prompt}"`}
    ];
    
    if (image) {
      parts.push(image);
    }
    
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
    });

    return response.text;
  } catch (error) {
    console.error("Error analyzing chess position:", error);
    if (error instanceof Error) {
        return `Error: An issue occurred while contacting the AI. Details: ${error.message}`;
    }
    return "Error: An unknown error occurred while contacting the AI.";
  }
};