import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Volume2,
  CheckCircle2,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Send,
  Lock,
  Keyboard,
  Play,
  Check,
  Building2,
  ChevronRight
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// FIELD ORDER - the conversation progresses through these in sequence
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_KEYS = [
  'applicant_name',
  'village_or_address',
  'loan_amount',
  'loan_purpose',
  'monthly_income',
  'income_source',
  'aadhaar_last4'
];

// ─────────────────────────────────────────────────────────────────────────────
// Per-language question prompts for every field step
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_QUESTIONS = {
  'ta-IN': {
    applicant_name:     'வணக்கம்! உங்கள் கடன் விண்ணப்பத்திற்கு நான் உதவுகிறேன். முதலில், உங்கள் முழு பெயர் என்ன?',
    village_or_address: 'நன்றி! நீங்கள் எந்த கிராமம் அல்லது நகரில் வசிக்கிறீர்கள்?',
    loan_amount:        'சரி! நீங்கள் எவ்வளவு தொகை கடனாக வேண்டும்? (உதாரணம்: ஐம்பதாயிரம் ரூபாய்)',
    loan_purpose:       'இந்த கடன் எந்த தொழில் அல்லது நோக்கத்திற்காக தேவை?',
    monthly_income:     'சரி! உங்கள் தற்போதைய மாத வருமானம் எவ்வளவு?',
    income_source:      'நீங்கள் என்ன தொழில் செய்கிறீர்கள் அல்லது வருமானம் எங்கிருந்து வருகிறது?',
    aadhaar_last4:      'கிட்டத்தட்ட முடிந்தது! உங்கள் ஆதார் அட்டையின் கடைசி 4 இலக்கங்கள் என்ன?',
    completed:          'மிக்க நன்றி! அனைத்து விவரங்களும் பதிவாகியுள்ளன. இப்போது மதிப்பீட்டிற்கு விண்ணப்பிக்கலாம்.'
  },
  'hi-IN': {
    applicant_name:     'नमस्ते! मैं आपके लोन आवेदन में सहायता करूँगा। सबसे पहले, आपका पूरा नाम क्या है?',
    village_or_address: 'धन्यवाद! आप किस गाँव या शहर में रहते हैं?',
    loan_amount:        'ठीक है! आप कितनी लोन राशि चाहते हैं? (उदाहरण: पचास हजार रुपये)',
    loan_purpose:       'यह लोन किस काम या व्यापार के लिए चाहिए?',
    monthly_income:     'अच्छा! आपकी वर्तमान मासिक कमाई कितनी है?',
    income_source:      'आप कौन सा काम करते हैं या आपकी आमदनी का स्रोत क्या है?',
    aadhaar_last4:      'लगभग हो गया! आपके आधार कार्ड के आखिरी 4 अंक क्या हैं?',
    completed:          'बहुत धन्यवाद! सभी जानकारी दर्ज हो गई है। अब आप क्रेडिट मूल्यांकन के लिए आवेदन कर सकते हैं।'
  },
  'te-IN': {
    applicant_name:     'నమస్కారం! మీ లోన్ దరఖాస్తులో నేను సహాయం చేస్తాను. మొదట, మీ పూర్తి పేరు ఏమిటి?',
    village_or_address: 'ధన్యవాదాలు! మీరు ఏ గ్రామం లేదా నగరంలో నివసిస్తున్నారు?',
    loan_amount:        'సరే! మీకు ఎంత లోన్ మొత్తం అవసరం? (ఉదాహరణ: యాభై వేల రూపాయలు)',
    loan_purpose:       'ఈ లోన్ ఏ వ్యాపారానికి లేదా ఉద్దేశానికి అవసరం?',
    monthly_income:     'అర్థమైంది! మీ నెలవారీ ఆదాయం ఎంత?',
    income_source:      'మీరు ఏ వ్యాపారం చేస్తున్నారు లేదా ఆదాయం ఎక్కడ నుండి వస్తుంది?',
    aadhaar_last4:      'దాదాపు అయిపోయింది! మీ ఆధార్ కార్డ్ చివరి 4 అంకెలు ఏమిటి?',
    completed:          'చాలా ధన్యవాదాలు! అన్ని వివరాలు నమోదయ్యాయి. ఇప్పుడు క్రెడిట్ మూల్యాంకనానికి దరఖాస్తు చేయవచ్చు.'
  },
  'ml-IN': {
    applicant_name:     'നമസ്കാരം! നിങ്ങളുടെ ലോൺ അപേക്ഷയ്ക്ക് ഞാൻ സഹായിക്കാം. ആദ്യം, നിങ്ങളുടെ പൂർണ്ണ പേര് എന്താണ്?',
    village_or_address: 'നന്ദി! നിങ്ങൾ ഏത് ഗ്രാമത്തിലോ നഗരത്തിലോ താമസിക്കുന്നു?',
    loan_amount:        'ശരി! നിങ്ങൾക്ക് എത്ര തുക ലോൺ ആവശ്യമാണ്? (ഉദാഹരണം: അൻപതിനായിരം രൂപ)',
    loan_purpose:       'ഈ ലോൺ ഏത് ബിസിനസ്സിനോ ആവശ്യത്തിനോ വേണ്ടിയാണ്?',
    monthly_income:     'ശരി! നിങ്ങളുടെ നിലവിലെ മാസ വരുമാനം എത്രയാണ്?',
    income_source:      'നിങ്ങൾ ഏത് ജോലി ചെയ്യുന്നു അല്ലെങ്കിൽ വരുമാനം എവിടെ നിന്ന് ലഭിക്കുന്നു?',
    aadhaar_last4:      'ഏതാണ്ട് തീർന്നു! നിങ്ങളുടെ ആധാർ കാർഡിന്റെ അവസാനത്തെ 4 അക്കങ്ങൾ ഏതാണ്?',
    completed:          'വളരെ നന്ദി! എല്ലാ വിവരങ്ങളും രേഖപ്പെടുത്തി. ഇപ്പോൾ ക്രെഡിറ്റ് മൂല്യനിർണ്ണയത്തിന് അപേക്ഷിക്കാം.'
  },
  'mr-IN': {
    applicant_name:     'नमस्कार! मी तुमच्या कर्ज अर्जात मदत करेन. सर्वप्रथम, तुमचे पूर्ण नाव काय आहे?',
    village_or_address: 'धन्यवाद! तुम्ही कोणत्या गावात किंवा शहरात राहता?',
    loan_amount:        'ठीक आहे! तुम्हाला किती कर्ज रक्कम हवी आहे? (उदाहरण: पन्नास हजार रुपये)',
    loan_purpose:       'हे कर्ज कोणत्या व्यवसायासाठी किंवा कारणासाठी हवे आहे?',
    monthly_income:     'बरे! तुमचे सध्याचे मासिक उत्पन्न किती आहे?',
    income_source:      'तुम्ही कोणता व्यवसाय करता किंवा उत्पन्न कुठून येते?',
    aadhaar_last4:      'जवळजवळ झाले! तुमच्या आधार कार्डचे शेवटचे 4 अंक काय आहेत?',
    completed:          'खूप धन्यवाद! सर्व माहिती नोंदवली गेली आहे. आता क्रेडिट मूल्यांकनासाठी अर्ज करा.'
  },
  'en-IN': {
    applicant_name:     'Hello! I will help you with your loan application. First, what is your full name?',
    village_or_address: 'Thank you! Which village or town do you currently live in?',
    loan_amount:        'Got it! How much loan amount do you need? (Example: fifty thousand rupees)',
    loan_purpose:       'What is this loan for? Which business or purpose?',
    monthly_income:     'Alright! What is your current monthly income?',
    income_source:      'What is your occupation or main source of income?',
    aadhaar_last4:      'Almost done! What are the last 4 digits of your Aadhaar card?',
    completed:          'Thank you! All details have been recorded. You can now submit for credit evaluation.'
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UI copy per language
// ─────────────────────────────────────────────────────────────────────────────
const LOCALIZED_COPY = {
  'ta-IN': {
    back: 'முகப்புக்குத் திரும்பு',
    subTag: 'புதிய விண்ணப்பம் - TAMIL',
    title: 'ஒரு உரையாடலைத் தொடங்கலாம்.',
    subtitle: 'இயல்பாகப் பேசுங்கள். உங்கள் தகவல்களைப் புரிந்து கொண்டு தேவையான கேள்விகளை மட்டும் கேட்போம்.',
    listening: 'கேட்கிறது',
    ready: 'தயார்',
    localEngine: 'Sarvam AI குரல் இயந்திரம்',
    privacyBadge: 'ஒலி பாதுகாப்பாக செயலாக்கப்படுகிறது',
    liveText: 'நேரடி உரை',
    waitingVoice: 'குரலுக்காக காத்திருக்கிறது',
    placeholderAnswer: 'நீங்கள் பேசும்போது உங்கள் வார்த்தைகள் இங்கே தோன்றும்.',
    useDemo: 'டெமோவைப் பயன்படுத்துங்கள்',
    typeResponse: 'பதிலை எழுதுங்கள்',
    inputPlaceholder: 'ஒரு பதிலை எழுதி Enter அழுத்துங்கள்...',
    structuredApp: 'கட்டமைக்கப்பட்ட விண்ணப்பம்',
    recordedDetails: 'பதிவு செய்யப்பட்ட விவரங்கள்',
    submitToBank: 'வங்கிக்கு விண்ணப்பிக்கவும் & கடன் மதிப்பீடு செய்க',
    completedAll: 'அனைத்தும் நிறைவடைந்தது! விண்ணப்பிக்க தயார்.',
    fields: {
      applicant_name: 'முழு பெயர்',
      village_or_address: 'கிராமம் / முகவரி',
      loan_amount: 'கடன் தொகை',
      loan_purpose: 'தொழில் / நோக்கம்',
      monthly_income: 'மாத வருமானம்',
      income_source: 'வருமான ஆதாரம்',
      aadhaar_last4: 'ஆதார் கடைசி 4 எண்கள்'
    }
  },
  'hi-IN': {
    back: 'मुख्य पृष्ठ पर वापस जाएँ',
    subTag: 'नया आवेदन - HINDI',
    title: 'आइए बातचीत शुरू करें।',
    subtitle: 'स्वाभाविक रूप से बोलें। हम आपकी जानकारी समझकर केवल जरूरी सवाल पूछेंगे।',
    listening: 'सुन रहा है',
    ready: 'तैयार',
    localEngine: 'Sarvam AI वॉयस इंजन',
    privacyBadge: 'ऑडियो सुरक्षित रूप से प्रोसेस किया जाता है',
    liveText: 'लाइव टेक्स्ट',
    waitingVoice: 'आवाज़ की प्रतीक्षा...',
    placeholderAnswer: 'बोलने पर आपके शब्द यहाँ दिखाई देंगे।',
    useDemo: 'डेमो प्रोफ़ाइल भरें',
    typeResponse: 'लिखकर जवाब दें',
    inputPlaceholder: 'यहाँ उत्तर लिखें और Enter दबाएँ...',
    structuredApp: 'संरचित आवेदन',
    recordedDetails: 'दर्ज विवरण',
    submitToBank: 'बैंक में जमा करें और क्रेडिट जांचें',
    completedAll: 'सब पूरा! जमा करने के लिए तैयार।',
    fields: {
      applicant_name: 'पूरा नाम',
      village_or_address: 'गाँव / पता',
      loan_amount: 'लोन राशि',
      loan_purpose: 'लोन का उद्देश्य',
      monthly_income: 'मासिक कमाई',
      income_source: 'कमाई का साधन',
      aadhaar_last4: 'आधार अंतिम 4 अंक'
    }
  },
  'en-IN': {
    back: 'Back to overview',
    subTag: 'NEW APPLICATION - ENGLISH',
    title: "Let's start a conversation.",
    subtitle: "Speak naturally. We will understand your details and ask only necessary questions.",
    listening: 'Listening',
    ready: 'Ready',
    localEngine: 'Sarvam AI Voice Engine',
    privacyBadge: 'Audio processed securely',
    liveText: 'Live transcript',
    waitingVoice: 'Waiting for voice...',
    placeholderAnswer: 'Your spoken words will appear here.',
    useDemo: 'Fill Demo Profile',
    typeResponse: 'Type Response',
    inputPlaceholder: 'Type an answer and press Enter...',
    structuredApp: 'Structured Application',
    recordedDetails: 'Recorded Details',
    submitToBank: 'Submit Application & Run Credit Check',
    completedAll: 'All done! Ready to submit.',
    fields: {
      applicant_name: 'Full Name',
      village_or_address: 'Village / Address',
      loan_amount: 'Loan Amount',
      loan_purpose: 'Purpose / Business',
      monthly_income: 'Monthly Income',
      income_source: 'Source of Income',
      aadhaar_last4: 'Aadhaar Last 4'
    }
  },
  'te-IN': {
    back: 'అవలోకనానికి వెనుకకు',
    subTag: 'కొత్త దరఖాస్తు - TELUGU',
    title: 'సంభాషణ ప్రారంభిద్దాం.',
    subtitle: 'సహజంగా మాట్లాడండి. మీ వివరాలు అర్థం చేసుకుని అవసరమైన ప్రశ్నలు మాత్రమే అడుగుతాం.',
    listening: 'వింటున్నాం',
    ready: 'సిద్ధం',
    localEngine: 'Sarvam AI వాయిస్ ఇంజిన్',
    privacyBadge: 'ఆడియో సురక్షితంగా ప్రాసెస్ చేయబడుతుంది',
    liveText: 'లైవ్ టెక్స్ట్',
    waitingVoice: 'వాయిస్ కోసం వేచి ఉంది...',
    placeholderAnswer: 'మీరు మాట్లాడినప్పుడు మీ మాటలు ఇక్కడ కనిపిస్తాయి.',
    useDemo: 'డెమో భర్తీ చేయండి',
    typeResponse: 'టైప్ చేసి సమాధానం ఇవ్వండి',
    inputPlaceholder: 'ఇక్కడ సమాధానం టైప్ చేసి Enter నొక్కండి...',
    structuredApp: 'నిర్మాణాత్మక దరఖాస్తు',
    recordedDetails: 'నమోదు చేయబడిన వివరాలు',
    submitToBank: 'బ్యాంక్‌కు దరఖాస్తు చేసి క్రెడిట్ తనిఖీ చేయండి',
    completedAll: 'అన్నీ పూర్తయ్యాయి! సమర్పించడానికి సిద్ధం.',
    fields: {
      applicant_name: 'పూర్తి పేరు',
      village_or_address: 'గ్రామం / చిరునామా',
      loan_amount: 'లోన్ మొత్తం',
      loan_purpose: 'వ్యాపారం / ఉద్దేశం',
      monthly_income: 'నెలవారీ ఆదాయం',
      income_source: 'ఆదాయ వనరు',
      aadhaar_last4: 'ఆధార్ చివరి 4 అంకెలు'
    }
  },
  'ml-IN': {
    back: 'അവലോകനത്തിലേക്ക് മടങ്ങുക',
    subTag: 'പുതിയ അപേക്ഷ - MALAYALAM',
    title: 'ഒരു സംഭാഷണം ആരംഭിക്കാം.',
    subtitle: 'സ്വാഭാവികമായി സംസാരിക്കൂ. നിങ്ങളുടെ വിവരങ്ങൾ മനസ്സിലാക്കി ആവശ്യമായ ചോദ്യങ്ങൾ മാത്രം ചോദിക്കും.',
    listening: 'കേൾക്കുന്നു',
    ready: 'തയ്യാർ',
    localEngine: 'Sarvam AI വോയ്‌സ് എഞ്ചിൻ',
    privacyBadge: 'ഓഡിയോ സുരക്ഷിതമായി പ്രോസസ്സ് ചെയ്യുന്നു',
    liveText: 'തത്സമയ ടെക്‌സ്‌റ്റ്',
    waitingVoice: 'ശബ്ദത്തിനായി കാത്തിരിക്കുന്നു...',
    placeholderAnswer: 'നിങ്ങൾ സംസാരിക്കുമ്പോൾ വാക്കുകൾ ഇവിടെ ദൃശ്യമാകും.',
    useDemo: 'ഡെമോ പ്രൊഫൈൽ പൂരിപ്പിക്കൂ',
    typeResponse: 'ടൈപ്പ് ചെയ്ത് ഉത്തരം നൽകൂ',
    inputPlaceholder: 'ഇവിടെ ഉത്തരം ടൈപ്പ് ചെയ്ത് Enter അമർത്തൂ...',
    structuredApp: 'ഘടനാപരമായ അപേക്ഷ',
    recordedDetails: 'രേഖപ്പെടുത്തിയ വിവരങ്ങൾ',
    submitToBank: 'ബാങ്കിൽ അപേക്ഷ നൽകി ക്രെഡിറ്റ് പരിശോധിക്കൂ',
    completedAll: 'എല്ലാം പൂർത്തിയായി! സമർപ്പിക്കാൻ തയ്യാർ.',
    fields: {
      applicant_name: 'പൂർണ്ണ നാമം',
      village_or_address: 'ഗ്രാമം / വിലാസം',
      loan_amount: 'ലോൺ തുക',
      loan_purpose: 'ബിസിനസ്സ് / ഉദ്ദേശ്യം',
      monthly_income: 'മാസ വരുമാനം',
      income_source: 'വരുമാന ഉറവിടം',
      aadhaar_last4: 'ആധാർ അവസാനത്തെ 4 അക്കങ്ങൾ'
    }
  },
  'mr-IN': {
    back: 'मुख्यपृष्ठावर परत जा',
    subTag: 'नवीन अर्ज - MARATHI',
    title: 'संभाषण सुरू करूया.',
    subtitle: 'स्वाभाविकपणे बोला. आम्ही तुमची माहिती समजून केवळ आवश्यक प्रश्न विचारू.',
    listening: 'ऐकत आहे',
    ready: 'तयार',
    localEngine: 'Sarvam AI व्हॉइस इंजिन',
    privacyBadge: 'ऑडिओ सुरक्षितपणे प्रक्रिया केली जाते',
    liveText: 'थेट मजकूर',
    waitingVoice: 'आवाजाची वाट पाहत आहे...',
    placeholderAnswer: 'बोलताना तुमचे शब्द येथे दिसतील.',
    useDemo: 'डेमो भरा',
    typeResponse: 'टाइप करून उत्तर द्या',
    inputPlaceholder: 'येथे उत्तर टाइप करा आणि Enter दाबा...',
    structuredApp: 'संरचित अर्ज',
    recordedDetails: 'नोंदवलेले तपशील',
    submitToBank: 'बँकेत अर्ज द्या आणि क्रेडिट तपासा',
    completedAll: 'सर्व पूर्ण! सादर करण्यासाठी तयार.',
    fields: {
      applicant_name: 'पूर्ण नाव',
      village_or_address: 'गाव / पत्ता',
      loan_amount: 'कर्ज रक्कम',
      loan_purpose: 'व्यवसाय / उद्देश',
      monthly_income: 'मासिक उत्पन्न',
      income_source: 'उत्पन्नाचा स्रोत',
      aadhaar_last4: 'आधार शेवटचे 4 अंक'
    }
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// Helper: get the next unfilled field key
// ─────────────────────────────────────────────────────────────────────────────
function getNextUnfilledField(formData) {
  return FIELD_KEYS.find(k => !formData[k]) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get the question for the next field (or a completion message)
// ─────────────────────────────────────────────────────────────────────────────
function getQuestionForField(fieldKey, language) {
  const questions = FIELD_QUESTIONS[language] || FIELD_QUESTIONS['en-IN'];
  return fieldKey ? (questions[fieldKey] || '') : (questions.completed || '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: parse typed text into the correct field
// ─────────────────────────────────────────────────────────────────────────────
function parseTypedTextToField(txt, formData) {
  const nextField = getNextUnfilledField(formData);
  if (!nextField) return null;

  if (nextField === 'loan_amount' || nextField === 'monthly_income') {
    const numMatch = txt.match(/[\d,]+/);
    if (numMatch) {
      const num = parseFloat(numMatch[0].replace(/,/g, ''));
      if (!isNaN(num)) return { field: nextField, value: num };
    }
  }
  if (nextField === 'aadhaar_last4') {
    const digits = txt.replace(/\D/g, '').slice(0, 4);
    if (digits.length === 4) return { field: nextField, value: digits };
    if (txt.trim().length >= 4) return { field: nextField, value: txt.trim().slice(-4) };
  }
  return { field: nextField, value: txt.trim() };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function buildConfirmQuestion(key, val, language) {
  const fieldNames = {
    'ta-IN': { applicant_name:'உங்கள் பெயர்', village_or_address:'உங்கள் முகவரி', loan_amount:'கடன் தொகை', loan_purpose:'கடன் நோக்கம்', monthly_income:'மாத வருமானம்', income_source:'வருமான ஆதாரம்', aadhaar_last4:'ஆதார் எண்' },
    'hi-IN': { applicant_name:'आपका नाम', village_or_address:'आपका पता', loan_amount:'लोन राशि', loan_purpose:'लोन उद्देश्य', monthly_income:'मासिक आय', income_source:'आय का स्रोत', aadhaar_last4:'आधार नंबर' },
    'te-IN': { applicant_name:'మీ పేరు', village_or_address:'మీ చిరునామా', loan_amount:'లోన్ మొత్తం', loan_purpose:'లోన్ ఉద్దేశం', monthly_income:'నెలవారీ ఆదాయం', income_source:'ఆదాయ వనరు', aadhaar_last4:'ఆధార్ సంఖ్య' },
    'ml-IN': { applicant_name:'നിങ്ങളുടെ പേര്', village_or_address:'നിങ്ങളുടെ വിലാസം', loan_amount:'ലോൺ തുക', loan_purpose:'ലോൺ ഉദ്ദേശ്യം', monthly_income:'മാസ വരുമാനം', income_source:'വരുമാന ഉറവിടം', aadhaar_last4:'ആധാർ നമ്പർ' },
    'mr-IN': { applicant_name:'तुमचे नाव', village_or_address:'तुमचा पत्ता', loan_amount:'कर्ज रक्कम', loan_purpose:'कर्ज उद्देश', monthly_income:'मासिक उत्पन्न', income_source:'उत्पन्न स्रोत', aadhaar_last4:'आधार क्रमांक' },
    'en-IN': { applicant_name:'Your name is', village_or_address:'Your address is', loan_amount:'Loan amount is', loan_purpose:'Loan purpose is', monthly_income:'Monthly income is', income_source:'Income source is', aadhaar_last4:'Aadhaar last 4 digits are' },
  };
  const names = fieldNames[language] || fieldNames['en-IN'];
  const label = names[key] || key;
  let displayVal = val || '';
  if (val && (key === 'loan_amount' || key === 'monthly_income')) {
    const numStr = Number(val).toLocaleString('en-IN');
    displayVal = language === 'ta-IN' ? `${numStr} ரூபாய்`
      : language === 'hi-IN' ? `${numStr} रुपये`
      : language === 'te-IN' ? `${numStr} రూపాయలు`
      : language === 'ml-IN' ? `${numStr} രൂപ`
      : language === 'mr-IN' ? `${numStr} रुपये`
      : `${numStr} rupees`;
  } else if (val && key === 'aadhaar_last4') {
    displayVal = val;
  }

  return language === 'ta-IN' ? `${label} ${displayVal}, சரியா?`
    : language === 'hi-IN' ? `${label} ${displayVal}, सही है?`
    : language === 'te-IN' ? `${label} ${displayVal}, సరియేనా?`
    : language === 'ml-IN' ? `${label} ${displayVal}, ശരിയല്ലേ?`
    : language === 'mr-IN' ? `${label} ${displayVal}, बरोबर आहे का?`
    : `${label} ${displayVal}, right?`;
}

export default function VoiceSessionStudio({
  language = 'ta-IN',
  formData,
  confirmedFields = [],
  pendingConfirmField = null,
  onUpdateField,
  onConfirmField,
  onRetryField,
  onResetForm,
  onNewApplication,
  onSubmitApplication,
  onBack,
  isRecording,
  liveTranscript = '',
  audioData = null,
  onStartRecord,
  onStopRecord,
  isSpeaking,
  onPlayTTS,
  isSubmitting,
  onFillDemoProfile
}) {
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [activePrompt, setActivePrompt] = useState('');
  const hasInitialized = useRef(false);

  const t = LOCALIZED_COPY[language] || LOCALIZED_COPY['en-IN'];

  const fieldKeys = FIELD_KEYS;
  const confirmedCount = confirmedFields.length;
  const progressPct = Math.round((confirmedCount / fieldKeys.length) * 100);
  const nextField = fieldKeys.find(k => !formData[k] || !confirmedFields.includes(k)) || null;
  const allFilled = confirmedFields.length === fieldKeys.length;

  // ─── Initial greeting: play the first unanswered field's question on mount ──
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = false;
    }
    const currentNext = fieldKeys.find(k => !formData[k] || !confirmedFields.includes(k)) || 'applicant_name';
    const question = getQuestionForField(currentNext, language);
    setActivePrompt(question);

    const timer = setTimeout(() => {
      if (onPlayTTS) onPlayTTS(question, language);
      hasInitialized.current = true;
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // ─── Update active prompt when pendingConfirmField or nextField changes ──
  useEffect(() => {
    if (!hasInitialized.current) return;

    if (pendingConfirmField && formData[pendingConfirmField]) {
      const confirmQ = buildConfirmQuestion(pendingConfirmField, formData[pendingConfirmField], language);
      setActivePrompt(confirmQ);
    } else if (nextField) {
      const question = getQuestionForField(nextField, language);
      setActivePrompt(question);
    } else {
      const questions = FIELD_QUESTIONS[language] || FIELD_QUESTIONS['en-IN'];
      setActivePrompt(questions.completed || 'All done!');
    }
  }, [pendingConfirmField, nextField, formData, language]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    const parsed = parseTypedTextToField(manualText.trim(), formData);
    if (parsed) {
      onUpdateField(parsed.field, parsed.value);
    }
    setManualText('');
    setShowManualInput(false);
  };

  const currentFieldLabel = nextField ? (t.fields[nextField] || '') : t.completedAll;

  return (
    <div className="voice-session-page animate-fadeIn">
      {/* Top Breadcrumb & Status Row */}
      <div className="session-top-meta">
        <button
          type="button"
          className="btn-back-nav"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.back}</span>
        </button>

        <div className="session-live-pill">
          <span className={`dot-green-pulse ${isRecording ? 'recording' : ''}`} />
          <span className="text-xs font-bold text-emerald-600">
            {isRecording ? t.listening : t.ready}
          </span>
        </div>
      </div>

      <div className="session-headline-wrap">
        <div className="session-subtag">{t.subTag}</div>
        <h1 className="session-main-title">{t.title}</h1>
        <p className="session-main-desc">{t.subtitle}</p>
      </div>

      {/* Two Column Grid */}
      <div className="session-studio-grid">
        {/* Left Column: Voice Console */}
        <div className="session-console-pane">
          {/* Engine Badges */}
          <div className="console-engine-badges">
            <span className="badge-local-engine">
              <span className="dot-green-small" />
              {t.localEngine}
            </span>
            <span className="badge-privacy-lock">
              <Lock className="w-3 h-3 text-slate-400" />
              {t.privacyBadge}
            </span>
          </div>

          {/* Dark Teal Orbital Soundwave Console */}
          <div className="console-radar-card">
            <div className="console-orbit-wrap">
              <div className={`console-ring ring-c3 ${isRecording ? 'pulse-fast' : ''}`} />
              <div className={`console-ring ring-c2 ${isRecording ? 'pulse-med' : ''}`} />
              <div className="console-ring ring-c1" />

              <button
                type="button"
                className={`console-mic-trigger ${isRecording ? 'recording' : ''} ${isSpeaking ? 'speaking' : ''}`}
                onClick={isRecording ? onStopRecord : onStartRecord}
                title={isRecording ? 'Click to stop recording' : 'Click to speak'}
                disabled={isSpeaking}
              >
                {isSpeaking
                  ? <Volume2 className="w-8 h-8 text-amber-400 animate-pulse" />
                  : <Mic className={`w-8 h-8 ${isRecording ? 'text-white animate-bounce' : 'text-emerald-400'}`} />
                }
              </button>
            </div>

            {/* Soundwave Bars Visualizer - driven by real audioData */}
            <div className="console-waveform-strip">
              {(audioData && audioData.length > 0
                ? Array.from(audioData.slice(0, 16)).map((val, idx) => {
                    const heightPct = isRecording ? Math.max(18, Math.round((val / 255) * 100)) : 18;
                    return (
                      <div
                        key={idx}
                        className="console-bar animate-soundwave"
                        style={{ height: `${heightPct}%` }}
                      />
                    );
                  })
                : [30, 60, 90, 45, 80, 100, 70, 40, 65, 85, 95, 55, 35, 75, 90, 45].map((val, idx) => (
                    <div
                      key={idx}
                      className={`console-bar ${isRecording ? 'animate-soundwave' : ''}`}
                      style={{ height: `${isRecording ? val : 18}%` }}
                    />
                  ))
              )}
            </div>

            {/* Current step instruction */}
            <div className="console-prompt-instruction">
              {isRecording
                ? t.listening
                : (isSpeaking
                    ? (language === 'ta-IN' ? 'கேளுங்கள்...' : language === 'hi-IN' ? 'सुनिए...' : 'Listening...')
                    : (pendingConfirmField
                        ? (language === 'ta-IN' ? 'ஆமாம் அல்லது இல்லை என கூறவும்' : language === 'hi-IN' ? 'हाँ या ना कहें' : 'Say Yes or No')
                        : (allFilled
                            ? t.completedAll
                            : `${t.fields[nextField] || ''} ${language === 'ta-IN' ? 'சொல்லுங்கள்' : language === 'hi-IN' ? 'बताएं' : '- speak now'}`)
                      )
                  )
              }
            </div>
          </div>

          {/* Active Prompt Box */}
          <div className={`console-prompt-card ${isSpeaking ? 'speaking-glow' : ''}`}>
            <Volume2 className={`w-5 h-5 shrink-0 mt-0.5 ${isSpeaking ? 'text-amber-500 animate-pulse' : 'text-emerald-600'}`} />
            <div className="flex-1 text-sm font-semibold text-slate-800">
              {activePrompt}
            </div>
            <button
              type="button"
              className={`btn-replay-prompt ${isSpeaking ? 'active' : ''}`}
              onClick={() => onPlayTTS && onPlayTTS(activePrompt, language)}
              title="Replay this question"
              disabled={isSpeaking}
            >
              <RotateCcw className="w-4 h-4 text-slate-500 hover:text-emerald-600" />
            </button>
          </div>

          {/* Live Transcript Box */}
          <div className="console-transcript-card">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-slate-700">{t.liveText}</span>
              <span className={`text-[11px] font-semibold ${isRecording ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`}>
                {isRecording ? `${t.listening}...` : t.waitingVoice}
              </span>
            </div>
            <div className={`text-xs min-h-[36px] leading-relaxed ${liveTranscript ? 'text-slate-900 font-medium' : 'text-slate-500 italic'}`}>
              {liveTranscript || (isRecording ? `${t.listening}...` : t.placeholderAnswer)}
            </div>
          </div>

          {/* Fallback Action Buttons */}
          <div className="console-action-buttons">
            <button
              type="button"
              className="btn-console-tool"
              onClick={onFillDemoProfile}
              title="Auto-fill all fields with demo data"
            >
              <Play className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t.useDemo}</span>
            </button>

            <button
              type="button"
              className="btn-console-tool"
              onClick={() => setShowManualInput(!showManualInput)}
            >
              <Keyboard className="w-3.5 h-3.5 text-blue-600" />
              <span>{t.typeResponse}</span>
            </button>
          </div>

          {/* Manual Text Input Fallback */}
          {showManualInput && (
            <form onSubmit={handleManualSubmit} className="console-manual-input-form animate-fadeIn">
              <div className="text-[10px] text-slate-500 mb-1 font-semibold">
                {pendingConfirmField
                  ? `▶ ${language === 'ta-IN' ? 'உறுதிப்படுத்தல்' : 'Confirming'}: ${t.fields[pendingConfirmField]}`
                  : (nextField
                    ? `▶ ${language === 'ta-IN' ? 'இப்போது கேட்கப்படுவது' : language === 'hi-IN' ? 'अभी पूछा जा रहा है' : 'Currently asking'}: ${t.fields[nextField] || nextField}`
                    : (language === 'ta-IN' ? 'அனைத்தும் நிறைவடைந்தது!' : language === 'hi-IN' ? 'सब भर गया!' : 'All fields filled!'))}
              </div>
              <input
                type="text"
                className="console-text-input"
                placeholder={nextField
                  ? (language === 'ta-IN' ? `${t.fields[nextField]} உள்ளிடவும்...`
                    : language === 'hi-IN' ? `${t.fields[nextField]} दर्ज करें...`
                    : `Enter ${t.fields[nextField]}...`)
                  : 'All done!'
                }
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                disabled={allFilled}
                autoFocus
              />
              <button type="submit" className="btn-send-manual" disabled={allFilled}>
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Structured Application Checklist */}
        <div className="session-checklist-pane">
          <div className="checklist-card-box">
            <div className="flex justify-between items-center mb-2">
              <div>
                <div className="checklist-pretag">{t.structuredApp}</div>
                <h3 className="checklist-heading">{t.recordedDetails}</h3>
              </div>
              <div className="checklist-progress-text">{progressPct}% complete</div>
            </div>

            {/* Progress Bar */}
            <div className="checklist-progress-track">
              <div
                className="checklist-progress-fill-green"
                style={{ width: `${progressPct}%`, transition: 'width 0.5s ease' }}
              />
            </div>

            {/* Field Stack */}
            <div className="checklist-fields-stack">
              {fieldKeys.map((key) => {
                const val = formData[key];
                const isConfirmed = confirmedFields.includes(key);
                const isPendingConfirm = key === pendingConfirmField;
                const isCurrentField = !isConfirmed && !isPendingConfirm && key === nextField;
                const fieldLabel = t.fields[key] || key;

                let displayVal = val;
                if (val && (key === 'loan_amount' || key === 'monthly_income')) {
                  displayVal = `₹${Number(val).toLocaleString('en-IN')}`;
                } else if (val && key === 'aadhaar_last4') {
                  displayVal = `•••• ${val}`;
                }

                const waitingPlaceholder = isPendingConfirm
                  ? (language === 'ta-IN' ? '← ஆமாம் / இல்லை என கூறவும்' : language === 'hi-IN' ? '← हाँ / ना कहें' : '← Say Yes or No')
                  : isCurrentField
                    ? (language === 'ta-IN' ? '← இப்போது கேட்கிறோம்' : language === 'hi-IN' ? '← अभी पूछ रहे हैं' : '← Currently asking')
                    : (language === 'ta-IN' ? 'காத்திருக்கிறது' : language === 'hi-IN' ? 'प्रतीक्षा...' : 'Waiting...');

                return (
                  <div
                    key={key}
                    className={`checklist-row-item ${isConfirmed ? 'filled' : (isPendingConfirm ? 'pending-confirm' : (isCurrentField ? 'current-field' : 'waiting'))}`}
                  >
                    <div className="checklist-status-dot">
                      {isConfirmed ? (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      ) : isPendingConfirm ? (
                        <span className="dot-confirm-pulse" />
                      ) : isCurrentField ? (
                        <span className="dot-current-pulse" />
                      ) : (
                        <span className="dot-hollow" />
                      )}
                    </div>

                    <div className="checklist-row-content">
                      <div className={`checklist-row-label ${isPendingConfirm ? 'text-amber-700 font-bold' : (isCurrentField ? 'text-emerald-700 font-bold' : '')}`}>
                        {fieldLabel}
                        {isPendingConfirm && <span className="ml-1 text-[10px] text-amber-600 font-bold animate-pulse">▲ CONFIRM (ஆமாம் / இல்லை)</span>}
                        {isCurrentField && <span className="ml-1 text-[10px] text-emerald-600 animate-pulse">▲ ASKING NOW</span>}
                      </div>
                      <div className="checklist-row-value">
                        {val ? (
                          <span className="text-slate-900 font-semibold">{displayVal}</span>
                        ) : (
                          <span className={`font-normal ${isPendingConfirm ? 'text-amber-600 font-semibold' : (isCurrentField ? 'text-emerald-600 font-semibold' : 'text-slate-400')}`}>
                            {waitingPlaceholder}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── Per-field action buttons ── */}
                    {val && (
                      <div className="checklist-field-actions">
                        {/* Confirm button */}
                        <button
                          type="button"
                          className={`btn-field-confirm ${isPendingConfirm ? 'pulse-btn' : ''}`}
                          onClick={() => {
                            if (onConfirmField) onConfirmField(key);
                          }}
                          title={language === 'ta-IN' ? 'உறுதிப்படுத்து (ஆமாம்)' : 'Confirm (Yes)'}
                        >
                          ✓ {isPendingConfirm ? (language === 'ta-IN' ? 'ஆமாம்' : 'Yes') : ''}
                        </button>
                        {/* Retry / re-record just this field */}
                        <button
                          type="button"
                          className="btn-field-retry"
                          onClick={() => {
                            if (onRetryField) onRetryField(key);
                          }}
                          title={language === 'ta-IN' ? 'மாற்று / மீண்டும் பதிவு செய் (இல்லை)' : 'Re-record (No)'}
                        >
                          ↺ {isPendingConfirm ? (language === 'ta-IN' ? 'இல்லை' : 'No') : ''}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Bottom Action Row: Reset + New Application ── */}
            <div className="checklist-bottom-actions">
              <button
                type="button"
                className="btn-reset-form"
                onClick={() => { if (onResetForm) onResetForm(); }}
                title={language === 'ta-IN' ? 'அனைத்து தகவல்களையும் அழித்து மீண்டும் தொடங்கு' : language === 'hi-IN' ? 'सभी जानकारी हटाएं और फिर से शुरू करें' : 'Clear all and restart from field 1'}
                disabled={isSubmitting}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {language === 'ta-IN' ? 'மீண்டும் நிரப்பு'
                    : language === 'hi-IN' ? 'फिर से भरें'
                    : language === 'te-IN' ? 'మళ్ళీ నింపండి'
                    : language === 'ml-IN' ? 'വീണ്ടും പൂരിപ്പിക്കൂ'
                    : language === 'mr-IN' ? 'पुन्हा भरा'
                    : 'Retry All'}
                </span>
              </button>

              <button
                type="button"
                className="btn-new-application"
                onClick={() => { if (onNewApplication) onNewApplication(); }}
                title={language === 'ta-IN' ? 'புதிய விண்ணப்பத்தை தொடங்கு' : 'Start a brand new application'}
                disabled={isSubmitting}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {language === 'ta-IN' ? 'புதிய விண்ணப்பம்'
                    : language === 'hi-IN' ? 'नया आवेदन'
                    : language === 'te-IN' ? 'కొత్త దరఖాస్తు'
                    : language === 'ml-IN' ? 'പുതിയ അപേക്ഷ'
                    : language === 'mr-IN' ? 'नवीन अर्ज'
                    : 'New Application'}
                </span>
              </button>
            </div>

            {/* Submission CTA */}
            <button
              type="button"
              className={`btn-submit-underwriting ${allFilled ? 'ready' : ''}`}
              onClick={onSubmitApplication}
              disabled={isSubmitting}
            >
              <Building2 className="w-5 h-5" />
              <span>
                {isSubmitting
                  ? (language === 'ta-IN' ? 'மதிப்பீடு செய்கிறது...' : language === 'hi-IN' ? 'मूल्यांकन हो रहा है...' : 'Evaluating Credit...')
                  : t.submitToBank}
              </span>
              {allFilled && !isSubmitting && <ChevronRight className="w-4 h-4 text-emerald-200" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
