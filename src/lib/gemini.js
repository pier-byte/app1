import { GoogleGenAI } from '@google/genai';

let ai = null;

function getAI() {
  if (!ai) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Gemini] API key non configurata. Imposta VITE_GEMINI_API_KEY in .env.local');
      return null;
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

/**
 * Stima il tempo di studio per un compito usando Gemini 2.5 Flash
 * @param {string} taskTitle - Titolo del compito
 * @param {string} category - Categoria (Studiare, Esercizi, etc.)
 * @returns {Promise<number|null>} Minuti stimati o null se fallisce
 */
export async function estimateStudyTime(taskTitle, category) {
  const client = getAI();
  if (!client) return null;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Sei un assistente scolastico. Stima in MINUTI quanto tempo serve a una studentessa di scuola superiore per completare questo compito.

Compito: "${taskTitle}"
Categoria: ${category}

Rispondi SOLO con un numero intero (i minuti stimati). Niente altro.`,
    });

    const text = response.text.trim();
    const minutes = parseInt(text, 10);
    return isNaN(minutes) ? null : Math.max(5, Math.min(minutes, 300));
  } catch (err) {
    console.error('[Gemini] Errore stima tempo:', err);
    return null;
  }
}

/**
 * Analizza un input testuale di cibo e restituisce i macronutrienti
 * @param {string} foodText - Es: "150g pollo e riso"
 * @returns {Promise<{calories:number, protein:number, carbs:number, fat:number, description:string}|null>}
 */
export async function parseFoodInput(foodText) {
  const client = getAI();
  if (!client) return null;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Sei un nutrizionista. Analizza questo alimento/pasto e stima i macronutrienti.

Input: "${foodText}"

Rispondi SOLO in JSON valido con questo formato esatto (numeri arrotondati):
{"calories": 350, "protein": 30, "carbs": 40, "fat": 8, "description": "150g petto di pollo grigliato con 80g riso basmati"}

Se l'input non è un alimento, rispondi: {"error": "Input non valido"}`,
    });

    const text = response.text.trim();
    // Rimuovi eventuale markdown code fence
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    if (parsed.error) return null;
    return {
      calories: Math.round(parsed.calories || 0),
      protein: Math.round(parsed.protein || 0),
      carbs: Math.round(parsed.carbs || 0),
      fat: Math.round(parsed.fat || 0),
      description: parsed.description || foodText,
    };
  } catch (err) {
    console.error('[Gemini] Errore parsing cibo:', err);
    return null;
  }
}
