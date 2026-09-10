/**
 * Client-Side Offline Rule-Based Extraction Engine.
 * Enables 100% offline structured loan extraction when no internet/backend is available.
 */

export function extractFieldsOffline(transcript, language = 'hi-IN') {
  const text = (transcript || '').trim();
  const lower = text.toLowerCase();

  const data = {
    applicant_name: null,
    village_or_address: null,
    loan_amount: null,
    loan_purpose: null,
    monthly_income: null,
    income_source: null,
    aadhaar_last4: null,
  };

  const explanations = {};

  if (!text) {
    return { data, explanations };
  }

  // 1. Aadhaar Last 4 digits (4 consecutive digits near aadhaar/आधार/ஆதார்)
  const aadhaarMatch = text.match(/(?:aadhaar|aadhar|आधार|ஆதார்)[^\d]{0,15}(\d{4})\b/i) || text.match(/\b(\d{4})\b/);
  if (aadhaarMatch) {
    data.aadhaar_last4 = aadhaarMatch[1];
    explanations.aadhaar_last4 = language === 'en-IN'
      ? `Aadhaar last 4 digits (${data.aadhaar_last4}) identified offline`
      : language === 'ta-IN' 
      ? `ஆதார் கடைசி 4 எண்கள் (${data.aadhaar_last4}) ஆஃப்லைனில் எடுக்கப்பட்டது`
      : language === 'mr-IN'
      ? `आधार शेवटचे 4 अंक (${data.aadhaar_last4}) ऑफलाइन नोंदवले`
      : `आधार अंतिम 4 अंक (${data.aadhaar_last4}) ऑफलाइन पहचाना`;
  }

  // 2. Loan Amount & Monthly Income extraction
  // Find all numbers with context
  const lakhMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|लाख|லட்சம்)/gi)];
  const thousandMatches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:thousand|k|हजार|ஆயிரம்)/gi)];
  const plainRupeeMatches = [...text.matchAll(/(?:rupees|rs|inr|₹|रुपये|ரூபாய்)[^\d]{0,10}(\d[\d,]*)/gi)];
  const generalNumbers = [...text.matchAll(/\b(\d{4,7})\b/g)];

  const foundAmounts = [];

  for (const m of lakhMatches) {
    foundAmounts.push({ val: parseFloat(m[1]) * 100000, idx: m.index, raw: m[0] });
  }
  for (const m of thousandMatches) {
    foundAmounts.push({ val: parseFloat(m[1]) * 1000, idx: m.index, raw: m[0] });
  }
  for (const m of plainRupeeMatches) {
    const num = parseFloat(m[1].replace(/,/g, ''));
    if (num > 500) foundAmounts.push({ val: num, idx: m.index, raw: m[0] });
  }
  for (const m of generalNumbers) {
    const num = parseFloat(m[1]);
    if (num >= 1000 && !foundAmounts.some(a => a.val === num)) {
      foundAmounts.push({ val: num, idx: m.index, raw: m[0] });
    }
  }

  // Sort by appearance in text
  foundAmounts.sort((a, b) => a.idx - b.idx);

  // Distinguish loan amount vs monthly income
  for (const item of foundAmounts) {
    const beforeText = text.substring(Math.max(0, item.idx - 40), item.idx).toLowerCase();
    const afterText = text.substring(item.idx, Math.min(text.length, item.idx + 40)).toLowerCase();
    const context = beforeText + ' ' + afterText;

    if (context.includes('कमाई') || context.includes('महीने') || context.includes('வருமானம்') || context.includes('மாதம்') || context.includes('उत्पन्न') || context.includes('दरमहा') || context.includes('income') || context.includes('salary') || context.includes('earn')) {
      if (!data.monthly_income) {
        data.monthly_income = item.val;
        explanations.monthly_income = `₹${item.val.toLocaleString('en-IN')} (Offline)`;
      }
    } else {
      if (!data.loan_amount) {
        data.loan_amount = item.val;
        explanations.loan_amount = `₹${item.val.toLocaleString('en-IN')} (Offline)`;
      } else if (!data.monthly_income && item.val < data.loan_amount) {
        data.monthly_income = item.val;
        explanations.monthly_income = `₹${item.val.toLocaleString('en-IN')} (Offline)`;
      }
    }
  }

  // Fallback defaults if numbers exist
  if (!data.loan_amount && foundAmounts.length > 0) {
    data.loan_amount = foundAmounts[0].val;
    explanations.loan_amount = `₹${data.loan_amount.toLocaleString('en-IN')} (Offline)`;
  }

  // 3. Applicant Name
  const namePatterns = [
    // English: my name is [name] / I am [name]
    /(?:my\s*name\s*is|name\s*is)\s*([a-zA-Z\s]{2,20}?)(?:,|and|live|from|\.|$)/i,
    // Tamil: என் பெயர் [name] அல்லது நான் [name]
    /(?:என்\s*பெயர்|பெயர்)\s*(?:ஆனது)?\s*([a-zA-Z\u0B80-\u0BFF\s]{2,20}?)(?:,|நான்|ஊர்|இருந்து|கடன்|\.|$)/i,
    /(?:நான்)\s*([a-zA-Z\u0B80-\u0BFF]{2,15})(?:\s+பேசுகிறேன்|\s+இருந்து)/i,
    // Hindi: मेरा नाम [name] है
    /(?:मेरा\s*नाम|नाम)\s*(?:है)?\s*([a-zA-Z\u0900-\u097F\s]{2,20}?)(?:है|हूँ|,|गाँव|रहने|\.|$)/i,
    // Marathi: माझे नाव [name] आहे
    /(?:माझे\s*नाव)\s*([a-zA-Z\u0900-\u097F\s]{2,20}?)(?:आहे|,|गाव|\.|$)/i,
  ];

  for (const pat of namePatterns) {
    const match = text.match(pat);
    if (match && match[1] && match[1].trim().length >= 2) {
      const cleanName = match[1].trim();
      if (!cleanName.match(/கடன்|லோன்|ரூபாய்|loan|rupee|हजार|ஆயிரம்|thousand|rupees/i)) {
        data.applicant_name = cleanName;
        explanations.applicant_name = language === 'en-IN'
          ? `Name "${cleanName}" identified`
          : language === 'ta-IN'
          ? `பெயர் "${cleanName}" கண்டறியப்பட்டது`
          : `नाम "${cleanName}" पहचाना गया`;
        break;
      }
    }
  }

  // 4. Village or Address
  const villagePatterns = [
    // English: live in [city] / from [city]
    /(?:live\s*in|from|address\s*is)\s*([a-zA-Z\s]{2,20}?)(?:,|and|need|loan|\.|$)/i,
    // Tamil: ஊர் [village] / [village] ஊரைச் சேர்ந்தவன்
    /(?:ஊர்|கிராமம்)\s*(?:ஆனது)?\s*([a-zA-Z\u0B80-\u0BFF\s]{2,20}?)(?:,|எனக்கு|\.|$)/i,
    /([a-zA-Z\u0B80-\u0BFF]{3,15})\s*(?:ஊரைச்\s*சேர்ந்தவன்|ஊர்|மாவட்டம்)/i,
    // Hindi: गाँव [village] / [village] का रहने वाला
    /(?:गाँव|गांव|पता)\s*(?:का\s*नाम)?\s*([a-zA-Z\u0900-\u097F\s]{2,20}?)(?:है|,|का\s*रहने|\.|$)/i,
    /([a-zA-Z\u0900-\u097F]{3,15})\s*(?:का\s*रहने\s*वाला|गाँव\s*से|जिले)/i,
    // Marathi: गाव [village]
    /(?:गाव)\s*([a-zA-Z\u0900-\u097F\s]{2,20}?)(?:आहे|,|\.|$)/i,
  ];

  for (const pat of villagePatterns) {
    const match = text.match(pat);
    if (match && match[1] && match[1].trim().length >= 2) {
      const cleanVillage = match[1].trim();
      data.village_or_address = cleanVillage;
      explanations.village_or_address = language === 'en-IN'
        ? `Address "${cleanVillage}"`
        : language === 'ta-IN'
        ? `ஊர் "${cleanVillage}"`
        : `गाँव "${cleanVillage}"`;
      break;
    }
  }

  // 5. Loan Purpose
  const purposeKeywords = [
    { keys: ['retail store', 'retail shop', 'store', 'shop'], val: 'Retail store (business)' },
    { keys: ['tractor'], val: 'Tractor and equipment (agriculture)' },
    { keys: ['dairy', 'cow', 'cattle', 'milk'], val: 'Dairy and livestock (agriculture)' },
    { keys: ['farming', 'seeds', 'fertilizer', 'crops'], val: 'Farming and agriculture (agriculture)' },
    { keys: ['விவசாய', 'பயிர்', 'உரம்', 'விதை', 'பண்ணை'], val: 'விவசாய செலவுகள் (Farming)' },
    { keys: ['டிராக்டர்', 'tractor', 'டிராக்டருக்கு'], val: 'டிராக்டர் வாங்குதல் (Tractor)' },
    { keys: ['மாடு', 'பசு', 'ஆடு', 'பால்'], val: 'கால்நடை வளர்ப்பு (Livestock / Dairy)' },
    { keys: ['கடை', 'வியாபாரம்', 'மளிகை'], val: 'மளிகை கடை விரிவுபடுத்தல் (Shop Expansion)' },
    { keys: ['ट्रैक्टर'], val: 'ट्रैक्टर और कृषि उपकरण (Tractor)' },
    { keys: ['दुकान', 'किराना', 'व्यापार'], val: 'दुकान विस्तार (Shop Expansion)' },
    { keys: ['गाय', 'भैंस', 'डेयरी', 'दूध', 'पशु'], val: 'डेयरी व पशुपालन (Dairy/Livestock)' },
    { keys: ['खेती', 'फसल', 'खाद', 'बीज'], val: 'खेती और बीज खरीद (Farming)' },
    { keys: ['शेती', 'बियाणे', 'खत'], val: 'शेती खर्च (Farming)' },
  ];

  for (const pk of purposeKeywords) {
    if (pk.keys.some(k => lower.includes(k.toLowerCase()))) {
      data.loan_purpose = pk.val;
      explanations.loan_purpose = language === 'en-IN'
        ? `Purpose: ${pk.val}`
        : language === 'ta-IN' 
        ? `நோக்கம்: ${pk.val}` 
        : `उद्देश्य: ${pk.val}`;
      break;
    }
  }

  // 6. Income Source
  const incomeKeywords = [
    { keys: ['retail store', 'retail shop', 'shop', 'business'], val: 'Retail store (small shop)' },
    { keys: ['farming', 'agriculture', 'farmer'], val: 'Farming (agriculture)' },
    { keys: ['dairy', 'milk selling'], val: 'Dairy farming (dairy)' },
    { keys: ['salary', 'job', 'employed'], val: 'Salaried employment (job)' },
    { keys: ['விவசாய', 'பயிர்'], val: 'விவசாயம் (Agriculture)' },
    { keys: ['வியாபாரம்', 'கடை', 'மளிகை'], val: 'வணிகம் / கடை (Retail Business)' },
    { keys: ['பால்', 'கால்நடை'], val: 'பால் பண்ணை (Dairy Farming)' },
    { keys: ['किसान', 'खेती', 'कृषि'], val: 'कृषि (Agriculture)' },
    { keys: ['दुकान', 'व्यापार'], val: 'दुकानदारी (Shopkeeper)' },
    { keys: ['दूध', 'डेयरी'], val: 'डेयरी व्यवसाय (Dairy)' },
    { keys: ['शेतकरी', 'शेती'], val: 'शेती (Agriculture)' },
  ];

  for (const ik of incomeKeywords) {
    if (ik.keys.some(k => lower.includes(k.toLowerCase()))) {
      data.income_source = ik.val;
      explanations.income_source = language === 'en-IN'
        ? `Source: ${ik.val}`
        : language === 'ta-IN' 
        ? `ஆதாரம்: ${ik.val}` 
        : `साधन: ${ik.val}`;
      break;
    }
  }

  return { data, explanations };
}
