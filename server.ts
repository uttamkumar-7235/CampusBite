import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// API: AI Meal Recommendations via Gemini API (keeps GEMINI_API_KEY secure on server)
app.post('/api/recommendations', async (req, res) => {
  try {
    const { budget = 150, dietary = 'all', meal_time = 'lunch', available_dishes = [] } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.json({
        source: 'rule_based',
        message: 'Rule-based recommendations (Gemini API key not configured in environment)',
        combos: generateRuleBasedCombos(available_dishes, Number(budget), dietary, meal_time),
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are the executive chef of "CampusBite", the official canteen of Prasad Institute of Technology (PIT) in India.
Recommend 2 to 3 practical, delicious meal combos from the real menu provided below.

Budget: ₹${budget} INR
Dietary Preference: ${dietary} (veg: vegetarian only, quick: ready in under 8 mins, healthy: lower calorie, all: any)
Time of day: ${meal_time}

Available dishes list:
${JSON.stringify(available_dishes.map((d: any) => ({
  id: d.id,
  name: d.name,
  price: d.price,
  category: d.category,
  is_veg: d.is_veg,
  prep_time_mins: d.prep_time_mins,
  calories: d.calories
})))}

Strict rules:
1. ONLY use dishes from the list above. Do NOT invent new dishes.
2. The total sum of items in each combo MUST be less than or equal to ₹${budget}.
3. Respect dietary preferences strictly (if veg, is_veg must be true).
4. Provide a punchy combo name, short appetizing reason, and a tag (e.g. "Best Value", "Chef's Pick", "Power Snack").

Return ONLY valid JSON matching this schema:
[
  {
    "name": "Combo Name",
    "item_ids": ["id1", "id2"],
    "totalPrice": 120,
    "savingsOrTag": "Value Saver",
    "reason": "Why this combo is great for students"
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const text = response.text || '[]';
      const parsedCombos = JSON.parse(text);

      // Verify that all returned item_ids exist in available_dishes and recalculate accurate sum
      const validatedCombos = parsedCombos.map((combo: any) => {
        const items = (combo.item_ids || [])
          .map((id: string) => available_dishes.find((d: any) => d.id === id))
          .filter(Boolean);
        const actualTotal = items.reduce((sum: number, it: any) => sum + Number(it.price), 0);
        return {
          name: combo.name || 'Student Special Combo',
          items,
          totalPrice: actualTotal,
          savingsOrTag: combo.savingsOrTag || 'Canteen Special',
          reason: combo.reason || 'Specially paired for your taste and budget.',
        };
      }).filter((combo: any) => combo.items.length > 0 && combo.totalPrice <= budget);

      if (validatedCombos.length > 0) {
        return res.json({
          source: 'gemini_ai',
          combos: validatedCombos,
        });
      }
    } catch (aiErr: any) {
      console.warn('Gemini API call failed, falling back to rule-based recommender:', aiErr?.message);
    }

    // Graceful Fallback if Gemini threw error or quota exceeded
    return res.json({
      source: 'rule_based',
      combos: generateRuleBasedCombos(available_dishes, Number(budget), dietary, meal_time),
    });
  } catch (err: any) {
    console.error('Recommendations endpoint error:', err);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Multi-turn Gemini Chatbot endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], model = 'gemini-3.8-flash' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
      let reply = "Namaste! I'm Chef Bite, your Prasad Institute of Technology Canteen assistant. Ask me about our 12 dishes, quick combos under any budget, or preparation times!";
      if (lastMsg.includes('dosa')) {
        reply = "Our Crispy Masala Dosa is ₹80! Pure veg, served with freshly grated coconut chutney and drumstick sambar, ready in ~8 mins.";
      } else if (lastMsg.includes('roll') || lastMsg.includes('paneer')) {
        reply = "The Paneer Tikka Kathi Roll is ₹95! Tandoori spiced paneer cubes in flaky handmade paratha with mint mayo. Our #1 student pick!";
      } else if (lastMsg.includes('under') || lastMsg.includes('budget') || lastMsg.includes('100') || lastMsg.includes('cheap')) {
        reply = "Great combos under ₹100:\n• Special Samosa Chaat (₹60) + Kulhad Chai (₹20) = ₹80\n• Indori Poha (₹40) + Frosted Cold Coffee (₹55) = ₹95\n• Cheesy Maggi (₹50) + Chai (₹20) = ₹70";
      } else if (lastMsg.includes('coffee')) {
        reply = "Frosted Cold Coffee is ₹55! Thick, creamy with chocolate drizzle and foam, ready in 4 mins.";
      } else if (lastMsg.includes('time') || lastMsg.includes('quick')) {
        reply = "Fastest items: Kulhad Chai (3 mins), Mango Lassi (3 mins), Indori Poha (4 mins), and Cold Coffee (4 mins)!";
      }
      return res.json({ reply });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are "Chef Bite", the lively, helpful AI canteen chatbot for CampusBite at Prasad Institute of Technology (PIT).
You know our exact menu of 12 dishes in INR:
1. Paneer Tikka Kathi Roll: ₹95 (Snacks, Veg, 10 min prep, 380 kcal)
2. Crispy Masala Dosa: ₹80 (South Indian, Veg, 8 min prep, 320 kcal)
3. Special Samosa Chaat: ₹60 (Snacks, Veg, 5 min prep, 340 kcal)
4. Frosted Cold Coffee: ₹55 (Beverages, Veg, 4 min prep, 210 kcal)
5. Royal Veg Dum Biryani: ₹120 (Meals, Veg, 15 min prep, 520 kcal)
6. Amritsari Chole Bhature: ₹110 (Meals, Veg, 12 min prep, 580 kcal)
7. Cheesy Masala Maggi: ₹50 (Fast Food, Veg, 6 min prep, 310 kcal)
8. Indori Poha with Sev: ₹40 (Snacks, Veg, 4 min prep, 230 kcal)
9. Mumbai Butter Pav Bhaji: ₹85 (Fast Food, Veg, 8 min prep, 460 kcal)
10. Triple Cheese Grilled Sandwich: ₹75 (Fast Food, Veg, 7 min prep, 390 kcal)
11. Kulhad Adrak Masala Chai: ₹20 (Beverages, Veg, 3 min prep, 110 kcal)
12. Alphonso Mango Lassi: ₹60 (Desserts, Veg, 3 min prep, 250 kcal)

Canteen Rules:
- Payment is 100% Cash / UPI at Counter #1.
- Food pickup is at Counter #2 once order status changes to "Ready".
- Help students calculate meal prices, recommend combos under their budget, and answer dietary questions.
- Keep answers friendly, concise, and structured with bullet points.`;

    const chatContents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), 4000)
      );

      const response = await Promise.race([
        ai.models.generateContent({
          model: model || 'gemini-3.8-flash',
          contents: chatContents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        }),
        timeoutPromise,
      ]);

      const reply = response.text || "I'm here to help you pick your next canteen meal!";
      return res.json({ reply });
    } catch (aiErr: any) {
      console.warn('Gemini chat API call failed, using canteen assistant fallback:', aiErr?.message);
      const fallbackReply = generateFallbackChatResponse(messages);
      return res.json({ reply: fallbackReply });
    }
  } catch (err: any) {
    console.error('Chat API outer error:', err);
    return res.json({
      reply: "Namaste! Our kitchen is currently bustling. Samosa Chaat is ₹60, Masala Dosa is ₹80, and Kathi Roll is ₹95. Counter #1 is open for cash/UPI payments!"
    });
  }
});

function generateFallbackChatResponse(messages: any[]) {
  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
  if (lastMsg.includes('dosa')) {
    return "Our Crispy Masala Dosa is ₹80! Pure veg, served with freshly made coconut chutney and spicy drumstick sambar, ready in ~8 mins.";
  }
  if (lastMsg.includes('roll') || lastMsg.includes('paneer')) {
    return "The Paneer Tikka Kathi Roll is ₹95! Tandoori spiced paneer cubes in flaky handmade paratha with mint mayo. Our #1 student pick!";
  }
  if (lastMsg.includes('under') || lastMsg.includes('budget') || lastMsg.includes('100') || lastMsg.includes('cheap')) {
    return "Great combos under ₹100:\n• Special Samosa Chaat (₹60) + Kulhad Chai (₹20) = ₹80\n• Indori Poha (₹40) + Frosted Cold Coffee (₹55) = ₹95\n• Cheesy Maggi (₹50) + Chai (₹20) = ₹70";
  }
  if (lastMsg.includes('coffee')) {
    return "Frosted Cold Coffee is ₹55! Thick, creamy with chocolate drizzle and foam, ready in 4 mins.";
  }
  if (lastMsg.includes('time') || lastMsg.includes('quick')) {
    return "Fastest items: Kulhad Chai (3 mins), Mango Lassi (3 mins), Indori Poha (4 mins), and Cold Coffee (4 mins)!";
  }
  if (lastMsg.includes('where') || lastMsg.includes('collect') || lastMsg.includes('counter')) {
    return "Pay cash or UPI at Counter #1. When your token status shows 'Ready', collect your fresh food at Counter #2!";
  }
  return "Namaste! I'm Chef Bite. Today's favorites are Paneer Tikka Kathi Roll (₹95), Masala Dosa (₹80), and Frosted Cold Coffee (₹55). How can I help with your order?";
}

// Rule-based meal combo engine (reliable, zero latency, deterministic)
function generateRuleBasedCombos(dishes: any[], budget: number, dietary: string, mealTime: string) {
  let filtered = dishes.filter((d) => d.is_available !== false);

  if (dietary === 'veg') {
    filtered = filtered.filter((d) => d.is_veg);
  } else if (dietary === 'quick') {
    filtered = filtered.filter((d) => d.prep_time_mins <= 8);
  } else if (dietary === 'healthy') {
    filtered = filtered.filter((d) => (d.calories || 300) <= 350);
  }

  const beverages = filtered.filter((d) => d.category === 'Beverages');
  const solids = filtered.filter((d) => d.category !== 'Beverages');

  const combos: any[] = [];

  // Combo 1: Main + Drink combo
  for (const solid of solids) {
    for (const drink of beverages) {
      const sum = solid.price + drink.price;
      if (sum <= budget) {
        combos.push({
          name: `${solid.name} & ${drink.name}`,
          items: [solid, drink],
          totalPrice: sum,
          savingsOrTag: 'Popular Pair',
          reason: `Balanced canteen duo ready in under ${Math.max(solid.prep_time_mins, drink.prep_time_mins)} minutes.`,
        });
        break;
      }
    }
    if (combos.length >= 2) break;
  }

  // Combo 2: Single hearty meal within budget
  const hearty = solids.filter((s) => s.price <= budget).sort((a, b) => b.price - a.price)[0];
  if (hearty) {
    combos.push({
      name: `Hearty Solo: ${hearty.name}`,
      items: [hearty],
      totalPrice: hearty.price,
      savingsOrTag: 'Pocket Friendly',
      reason: `Filling and economical pick for ₹${hearty.price}.`,
    });
  }

  return combos.slice(0, 3);
}

// Dev & Production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`CampusBite server running on port ${port}`);
  });
}

startServer();
