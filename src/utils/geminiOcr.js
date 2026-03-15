/**
 * Uses Gemini Vision API to parse a receipt image and extract:
 * - title (store/merchant name or main item)
 * - amount (total in IDR)
 * - category (mapped to one of our expense categories)
 * - note (short summary)
 */

const CATEGORY_LABELS = {
  food: ['restaurant', 'cafe', 'warung', 'makan', 'food', 'bakery', 'kopi', 'coffee', 'boba', 'mcd', 'kfc', 'pizza', 'sushi', 'ramen', 'ayam', 'nasi', 'burger', 'indomaret', 'alfamart', 'hypermart', 'supermarket', 'grocery'],
  transport: ['grab', 'gojek', 'ojek', 'taxi', 'uber', 'blue bird', 'parkir', 'bensin', 'pertamina', 'toll', 'tol', 'busway', 'mrt', 'commuter', 'krl', 'kereta', 'pesawat', 'tiket', 'airport'],
  shopping: ['shopee', 'tokopedia', 'lazada', 'toko', 'shop', 'fashion', 'baju', 'sepatu', 'elektronik', 'gadget', 'hp', 'laptop', 'mall', 'uniqlo', 'zara', 'h&m', 'sport', 'nike', 'adidas'],
  entertainment: ['bioskop', 'cinema', 'xxi', 'cgv', 'netflix', 'spotify', 'steam', 'game', 'konser', 'event', 'tiket', 'playground', 'bowling', 'karaoke'],
  health: ['apotek', 'apotik', 'farmasi', 'kimia farma', 'guardian', 'k24', 'klinik', 'dokter', 'rumah sakit', 'rs', 'dental', 'vitamin', 'obat', 'medika'],
  education: ['buku', 'book', 'gramedia', 'kursus', 'les', 'seminar', 'workshop', 'training', 'tuition', 'sekolah', 'kampus', 'universitas'],
  bills: ['pln', 'listrik', 'pdam', 'air', 'wifi', 'internet', 'indihome', 'telkom', 'myrepublic', 'first media', 'tv', 'langganan', 'iuran', 'asuransi', 'cicilan'],
  investment: ['reksa dana', 'saham', 'crypto', 'bitcoin', 'bibit', 'stockbit', 'ajaib', 'deposito', 'tabungan'],
};

function guessCategory(text) {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_LABELS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return cat;
    }
  }
  return 'other';
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Main function: sends image to Gemini and returns parsed expense data
 */
export async function parseReceiptWithGemini(imageFile, apiKey) {
  const base64Image = await fileToBase64(imageFile);
  const mimeType = imageFile.type || 'image/jpeg';

  const prompt = `You are a receipt/struk parser for an Indonesian expense tracker app.

Analyze this receipt/struk image and extract the following information. Return ONLY a valid JSON object with no markdown or extra text:

{
  "title": "<merchant name or main purchase item, max 40 chars>",
  "amount": <total amount as number in IDR, no dots/commas, just integer>,
  "category": "<one of: food, transport, shopping, entertainment, health, education, bills, investment, other>",
  "note": "<brief 1-line description of what was purchased>",
  "date": "<date in YYYY-MM-DD format if visible, otherwise null>"
}

Rules:
- title: Use the store/restaurant name if visible, otherwise describe the main item
- amount: Extract the TOTAL amount (look for "TOTAL", "GRAND TOTAL", "JUMLAH", etc.)
- category: Choose the most appropriate category based on the merchant/items
- note: Brief summary like "Makan siang di Warteg" or "Belanja kebutuhan"
- If you cannot read the receipt clearly, make your best guess from what's visible

Important: Return ONLY the JSON object, nothing else.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Clean up any markdown code blocks
  const cleaned = rawText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: try to extract JSON from text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('Could not parse Gemini response as JSON');
    }
  }

  // Validate and sanitize
  const today = new Date().toISOString().split('T')[0];
  return {
    title: String(parsed.title || 'Receipt').slice(0, 40),
    amount: Number(parsed.amount) || 0,
    category: parsed.category || guessCategory(parsed.title || ''),
    note: String(parsed.note || ''),
    date: parsed.date || today,
    type: 'expense', // receipts are always expenses
  };
}
