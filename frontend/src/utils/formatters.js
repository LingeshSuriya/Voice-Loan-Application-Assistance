/**
 * Utility module for spoken number parsing, transliteration, 
 * field value formatting, and currency formatting across Tamil, Hindi, Telugu, Marathi, Malayalam, and English.
 */

const HARDCODED_TRANSLITERATION_MAP = {
  // Common Names
  'கார்த்திக்': 'Karthik',
  'கார்த்தி': 'Karthi',
  'முகமது இர்பான்': 'Mohamed Irfan',
  'முகமது': 'Mohamed',
  'இர்பான்': 'Irfan',
  'ராகுல்': 'Rahul',
  'ரகுல்': 'Ragul',
  'ராகூல்': 'Rahul',
  'சாபரி': 'Sabari',
  'சபரி': 'Sabari',
  'விக்னேஷ்': 'Vignesh',
  'சுரேஷ்': 'Suresh',
  'ரமேஷ்': 'Ramesh',
  'சரவணன்': 'Saravanan',
  'கணேஷ்': 'Ganesh',
  'குமார்': 'Kumar',
  'ராஜேஷ்': 'Rajesh',
  'முருகன்': 'Murugan',
  'செந்தில்': 'Senthil',
  'அருண்': 'Arun',
  'காயத்ரி': 'Gayathri',
  'பிரியா': 'Priya',
  'லட்சுமி': 'Lakshmi',
  'दीपक': 'Deepak',
  'राहुल': 'Rahul',
  'राहुअल': 'Rahul',
  'राघुल': 'Raghul',
  'अमित': 'Amit',
  'सुमित': 'Sumit',
  'संजय': 'Sanjay',
  'विक्रम': 'Vikram',
  'सुरेश': 'Suresh',
  'रमेश': 'Ramesh',
  'राकेश': 'Rakesh',
  'రాహుల్': 'Rahul',

  // Towns / Cities / Addresses
  'கடையநல்லூர்': 'Kadayanallur',
  'கடையநல்லுர்': 'Kadayanallur',
  'பாளையங்கோட்டை': 'Palayamkottai',
  'மதுரை': 'Madurai',
  'சென்னை': 'Chennai',
  'சென்னையும்': 'Chennai',
  'கோவை': 'Coimbatore',
  'கோயம்புத்தூர்': 'Coimbatore',
  'திருநெல்வேலி': 'Tirunelveli',
  'நெல்லை': 'Nellai',
  'திருச்சி': 'Trichy',
  'திருச்சிராப்பள்ளி': 'Tiruchirappalli',
  'சேலம்': 'Salem',
  'ஈரோடு': 'Erode',
  'தஞ்சாவூர்': 'Thanjavur',
  'தூத்துக்குடி': 'Tuticorin',
  'தென்காசி': 'Tenkasi',
  'திண்டுக்கல்': 'Dindigul',
  'நாகர்கோவில்': 'Nagercoil',
  'வேலூர்': 'Vellore',
  'नागपुर': 'Nagpur',
  'पुणे': 'Pune',
  'मुंबई': 'Mumbai',
  'दिल्ली': 'Delhi',
  'हैदराबाद': 'Hyderabad',
  'जयपुर': 'Jaipur',
  'लखनऊ': 'Lucknow',
  'इंदौर': 'Indore',
  'भोपाल': 'Bhopal',
  'वाराणसी': 'Varanasi',
  'சுடலை முத்து': 'Sudalai Muthu',
  'சுடலைமுத்து': 'Sudalaimuthu',
  'சுடலை': 'Sudalai',
  'முத்து': 'Muthu',
  'पटना': 'Patna'
};

/**
 * Phonetic Tamil to Latin transliterator for unmapped terms.
 */
function transliterateTamilToLatin(text) {
  if (!text) return '';

  const independentVowels = {
    'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo',
    'எ': 'e', 'ஏ': 'ae', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oo', 'ஔ': 'au'
  };

  const consonantRoots = {
    'க': 'k', 'ங': 'ng', 'ச': 's', 'ஞ': 'ny', 'ட': 'd', 'ண': 'n',
    'த': 'th', 'ந': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r',
    'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n',
    'ஜ': 'j', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h', 'க்ஷ': 'ksh'
  };

  const vowelSigns = {
    'ா': 'a', 'ி': 'i', 'ீ': 'i', 'ு': 'u', 'ூ': 'u',
    'ெ': 'e', 'ே': 'e', 'ை': 'ai', 'ொ': 'o', 'ோ': 'o', 'ௌ': 'au'
  };

  const words = text.trim().split(/\s+/);
  const outWords = [];

  for (const word of words) {
    let out = '';
    let i = 0;
    while (i < word.length) {
      const char = word[i];
      const nextChar = word[i + 1];

      if (independentVowels[char]) {
        out += independentVowels[char];
        i++;
        continue;
      }

      if (consonantRoots[char]) {
        const root = consonantRoots[char];
        if (nextChar === '்') {
          out += root;
          i += 2;
        } else if (nextChar && vowelSigns[nextChar]) {
          out += root + vowelSigns[nextChar];
          i += 2;
        } else {
          out += root + 'a';
          i++;
        }
        continue;
      }

      out += char;
      i++;
    }

    if (out) {
      outWords.push(out.charAt(0).toUpperCase() + out.slice(1));
    }
  }

  return outWords.join(' ');
}

/**
 * Phonetic Devanagari to Latin transliterator for unmapped terms.
 */
function transliterateDevanagariToLatin(text) {
  if (!text) return '';

  const independentVowels = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au'
  };

  const consonantRoots = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h'
  };

  const vowelSigns = {
    'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au'
  };

  const words = text.trim().split(/\s+/);
  const outWords = [];

  for (const word of words) {
    let out = '';
    let i = 0;
    while (i < word.length) {
      const char = word[i];
      const nextChar = word[i + 1];

      if (independentVowels[char]) {
        out += independentVowels[char];
        i++;
        continue;
      }

      if (consonantRoots[char]) {
        const root = consonantRoots[char];
        if (nextChar === '्') {
          out += root;
          i += 2;
        } else if (nextChar && vowelSigns[nextChar]) {
          out += root + vowelSigns[nextChar];
          i += 2;
        } else {
          out += root + 'a';
          i++;
        }
        continue;
      }

      out += char;
      i++;
    }

    if (out) {
      outWords.push(out.charAt(0).toUpperCase() + out.slice(1));
    }
  }

  return outWords.join(' ');
}

/**
 * Transliterates regional script text to English Latin characters.
 */
export function transliterateToEnglish(text) {
  if (!text || typeof text !== 'string') return '';
  const clean = text.trim();
  if (!clean) return '';
  if (/^[a-zA-Z0-9\s.,'-]+$/.test(clean)) return clean;

  for (const [key, val] of Object.entries(HARDCODED_TRANSLITERATION_MAP)) {
    if (clean.includes(key) || key.includes(clean)) return val;
  }

  if (/[\u0B80-\u0BFF]/.test(clean)) {
    return transliterateTamilToLatin(clean);
  }
  if (/[\u0900-\u097F]/.test(clean)) {
    return transliterateDevanagariToLatin(clean);
  }

  return clean;
}

/**
 * Returns English candidate variants for a given name or address.
 */
export function getEnglishVariantsFE(val) {
  if (!val) return [''];
  let clean = typeof val === 'object' ? (val.english || val.regional || '') : String(val);
  clean = clean.trim();
  if (!clean) return [''];

  for (const [key, mapVal] of Object.entries(HARDCODED_TRANSLITERATION_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      const base = mapVal;
      return Array.from(new Set([
        base,
        base.endsWith('h') ? base.slice(0, -1) : base + 'h',
        base.replace(/sh/g, 's'),
        base.replace(/k/g, 'g')
      ])).slice(0, 3);
    }
  }

  if (/^[a-zA-Z\s]+$/.test(clean)) {
    const base = clean.charAt(0).toUpperCase() + clean.slice(1);
    return Array.from(new Set([
      base,
      base.endsWith('h') ? base.slice(0, -1) : base + 'h'
    ])).slice(0, 3);
  }

  const latinTransliterated = transliterateToEnglish(clean);
  if (latinTransliterated && latinTransliterated !== clean) {
    return Array.from(new Set([
      latinTransliterated,
      latinTransliterated.endsWith('h') ? latinTransliterated.slice(0, -1) : latinTransliterated + 'h'
    ])).slice(0, 3);
  }

  return [clean];
}

/**
 * Parses spoken numbers in Tamil, Hindi, Telugu, Marathi, Malayalam, and English.
 * Handles words like "ஒரு லட்சம்", "ஐம்பதாயிரம்", "एक लाख", "पचास हजार", "1.5 lakh", "50k", etc.
 */
export function parseSpokenNumber(input) {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return isNaN(input) ? null : input;

  let text = String(input).trim().toLowerCase();
  if (typeof input === 'object' && input !== null) {
    const raw = input.regional || input.english || '';
    text = String(raw).trim().toLowerCase();
  }

  if (!text) return null;

  // Direct number string
  const cleanDigitsOnly = text.replace(/,/g, '');
  if (/^\d+(?:\.\d+)?$/.test(cleanDigitsOnly)) {
    return parseFloat(cleanDigitsOnly);
  }

  // Lakh word multipliers (100,000)
  const lakhWordMap = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'ஒரு': 1, 'ஒன்று': 1, 'இரண்டு': 2, 'ரெண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5,
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5, 'दस': 10,
    'ఒక': 1, 'రెండు': 2, 'మూడు': 3, 'నాలుగు': 4, 'ఐదు': 5
  };

  // Lakh regex
  const lakhMatch = text.match(/(\d+(?:\.\d+)?|[a-z\u0B80-\u0BFF\u0900-\u097F\u0C00-\u0C7F]+)\s*(?:lakh|lakhs|lac|lacs|लाख|லட்சம்|இலட்சம்|లక్ష)/i);
  if (lakhMatch) {
    const valStr = lakhMatch[1].trim();
    if (!isNaN(parseFloat(valStr))) {
      return parseFloat(valStr) * 100000;
    }
    const wordVal = lakhWordMap[valStr] || 1;
    return wordVal * 100000;
  }

  if (/^(?:ஒரு|ஒன்று|1)\s*(?:லட்சம்|இலட்சம்)$/i.test(text) || text.includes('ஒரு லட்சம்') || text.includes('ஒரு இலட்சம்')) return 100000;
  if (/^(?:இரண்டு|ரெண்டு|2)\s*(?:லட்சம்|இலட்சம்)$/i.test(text) || text.includes('இரண்டு லட்சம்')) return 200000;
  if (/^(?:एक|1)\s*लाख$/i.test(text) || text.includes('एक लाख')) return 100000;
  if (/^(?:दो|2)\s*लाख$/i.test(text) || text.includes('दो लाख')) return 200000;

  // Composite thousand words
  const thousandWordMap = {
    'பத்தாயிரம்': 10000,
    'இருபதாயிரம்': 20000,
    'முப்பதாயிரம்': 30000,
    'நாற்பதாயிரம்': 40000,
    'ஐம்பதாயிரம்': 50000,
    'அறுபதாயிரம்': 60000,
    'எழுபதாயிரம்': 70000,
    'எண்பதாயிரம்': 80000,
    'தொன்னூறாயிரம்': 90000,
    'ஆயிரம்': 1000,
    'ஓராயிரம்': 1000,
    'दस हजार': 10000, 'दस हज़ार': 10000,
    'बीस हजार': 20000, 'बीस हज़ार': 20000,
    'तीस हजार': 30000, 'तीस हज़ार': 30000,
    'चालीस हजार': 40000, 'चालिस हजार': 40000,
    'पचास हजार': 50000, 'पचास हज़ार': 50000,
    'साठ हजार': 60000, 'सत्तर हजार': 70000, 'अस्सी हजार': 80000, 'नब्बे हजार': 90000,
    'एक हजार': 1000, 'एक हज़ार': 1000,
    'ten thousand': 10000, 'twenty thousand': 20000, 'thirty thousand': 30000,
    'forty thousand': 40000, 'fifty thousand': 50000, 'sixty thousand': 60000,
    'seventy thousand': 70000, 'eighty thousand': 80000, 'ninety thousand': 90000,
    'పది వేలు': 10000, 'ఇరవై వేలు': 20000, 'ముప్పై వేలు': 30000,
    'నలభై వేలు': 40000, 'యాభై వేలు': 50000,
  };

  for (const [phrase, num] of Object.entries(thousandWordMap)) {
    if (text.includes(phrase)) return num;
  }

  // Thousand regex
  const thousandMatch = text.match(/(\d+(?:\.\d+)?|[a-z\u0B80-\u0BFF\u0900-\u097F\u0C00-\u0C7F]+)\s*(?:thousand|k|हजार|हज़ार|ஆயிரம்|வேలు)/i);
  if (thousandMatch) {
    const valStr = thousandMatch[1].trim();
    if (!isNaN(parseFloat(valStr))) {
      return parseFloat(valStr) * 1000;
    }
    const tensMap = {
      'ten': 10, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
      'பத்து': 10, 'இருபது': 20, 'முப்பது': 30, 'நாற்பது': 40, 'ஐம்பது': 50,
      'दस': 10, 'बीस': 20, 'तीस': 30, 'चालीस': 40, 'पचास': 50,
      'పది': 10, 'ఇరవై': 20, 'ముప్పై': 30, 'నలభై': 40, 'యాభై': 50
    };
    const wordVal = tensMap[valStr] || lakhWordMap[valStr] || 1;
    return wordVal * 1000;
  }

  // Extract digits >= 4 characters
  const matchNum = text.match(/\b(\d{4,7})\b/);
  if (matchNum) return parseFloat(matchNum[1]);

  // Fallback to first digits if any
  const firstNum = text.match(/\d+(?:\.\d+)?/);
  if (firstNum) return parseFloat(firstNum[0]);

  return null;
}

/**
 * Safely formats any value into UI display string.
 * Candidate objects `{ regional, english }` become `"regional (english)"`.
 */
export function formatFieldValue(val) {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'object') {
    if (val.regional && val.english && val.regional !== val.english) {
      return `${val.regional} (${val.english})`;
    }
    return val.regional || val.english || '';
  }
  return String(val);
}

/**
 * Safely formats candidate objects or text for TTS spoken speech prompts.
 * E.g., for Tamil: "உங்கள் பெயர் கார்த்திக், ஆங்கிலத்தில் Karthik, சரியா?"
 */
export function formatSpeechValue(key, val, language = 'ta-IN') {
  if (!val) return '';
  let regStr = '';
  let engStr = '';

  if (typeof val === 'object') {
    regStr = val.regional || '';
    engStr = val.english || '';
  } else {
    regStr = String(val);
    engStr = transliterateToEnglish(regStr);
  }

  if (key === 'loan_amount' || key === 'monthly_income') {
    const num = parseSpokenNumber(val);
    const numStr = num !== null ? num.toLocaleString('en-IN') : String(val);
    return language === 'ta-IN' ? `${numStr} ரூபாய்`
      : language === 'hi-IN' ? `${numStr} रुपये`
      : language === 'te-IN' ? `${numStr} రూపాయలు`
      : language === 'ml-IN' ? `${numStr} രൂപ`
      : language === 'mr-IN' ? `${numStr} रुपये`
      : `${numStr} rupees`;
  }

  if (regStr && engStr && regStr !== engStr && ['applicant_name', 'village_or_address'].includes(key)) {
    if (language === 'ta-IN') return `${regStr}, ஆங்கிலத்தில் ${engStr}`;
    if (language === 'hi-IN') return `${regStr}, अंग्रेजी में ${engStr}`;
    if (language === 'te-IN') return `${regStr}, ఇంగ్లీష్ లో ${engStr}`;
    return `${regStr}, in English ${engStr}`;
  }

  return regStr || engStr;
}

/**
 * Formats numbers into currency string without NaN errors.
 */
export function formatCurrency(val, lang = 'en-IN') {
  if (val === null || val === undefined || val === '') return '';
  const parsed = parseSpokenNumber(val);
  if (parsed === null || isNaN(parsed)) {
    return typeof val === 'string' ? val : '';
  }
  return `₹${parsed.toLocaleString('en-IN')}`;
}
