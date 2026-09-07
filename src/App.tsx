import { useEffect, useMemo, useState } from "react";
import { estimatedNpsImpact, money, tdsDifference } from "./lib/tax";
import taxCheckIllustration from "./assets/tax-check-illustration.svg";

type Stage =
  | "home"
  | "documents"
  | "parsing"
  | "understood"
  | "question"
  | "opportunity"
  | "readiness";
type ScenarioId = "priya" | "arjun" | "meera";
type Theme = "light" | "dark" | "system";
type TaxRegime = "new" | "old";
type JourneyMode = "automated" | "guided" | null;
type AutomationStep =
  | "idle"
  | "choose-document"
  | "processing"
  | "nps-question"
  | "reviewing"
  | "complete";
type TaxOLanguage =
  | "en"
  | "hi"
  | "bn"
  | "ta"
  | "te"
  | "mr"
  | "kn"
  | "ml";

type Scenario = {
  id: ScenarioId;
  firstName: string;
  label: string;
  income: number;
  form16Tds: number;
  aisTds: number;
  status: "ready" | "almost" | "stop";
  attention: number;
  note: string;
};

type TaxHistoryEntry = {
  year: string;
  paid: number;
  status: string;
};

type DocumentOption = {
  icon: string;
  title: string;
  detail: string;
  source: string;
  checks: string[];
  supported: boolean;
};

type SavingCheck = {
  icon: string;
  title: string;
  detail: string;
  checklist: string;
};

type TaxOLanguageOption = {
  label: string;
  welcome: string;
  guide: string;
  ask: string;
  placeholder: string;
  send: string;
};

type TaxOChatCopy = {
  intro: string;
  processing: string;
  understoodOld: string;
  understoodNew: string;
  npsQuestion: string;
  reviewing: string;
  done: string;
  useForm16: string;
  explainProcess: string;
  explainSavings: string;
  next: string;
  processingLabel: string;
  you: string;
  yes: string;
  no: string;
  unsure: string;
};

const scenarios: Record<ScenarioId, Scenario> = {
  priya: {
    id: "priya",
    firstName: "Priya",
    label: "Opportunity + mismatch",
    income: 12_90_000,
    form16Tds: 1_42_000,
    aisTds: 1_32_000,
    status: "stop",
    attention: 2,
    note: "The full hero journey: an NPS opportunity and a TDS mismatch.",
  },
  arjun: {
    id: "arjun",
    firstName: "Arjun",
    label: "Clean salaried taxpayer",
    income: 9_80_000,
    form16Tds: 71_500,
    aisTds: 71_500,
    status: "ready",
    attention: 0,
    note: "A clean check for a taxpayer who is ready to move forward.",
  },
  meera: {
    id: "meera",
    firstName: "Meera",
    label: "Missing bank interest",
    income: 11_40_000,
    form16Tds: 1_08_000,
    aisTds: 1_08_000,
    status: "almost",
    attention: 1,
    note: "A gentle prompt to review interest reported by a bank.",
  },
};

const profileIllustrations: Record<ScenarioId, { mark: string; detail: string }> = {
  priya: { mark: "✦", detail: "Opportunity and mismatch" },
  arjun: { mark: "✓", detail: "Clean salaried check" },
  meera: { mark: "⌁", detail: "Bank-interest review" },
};

const tourSlides = [
  {
    icon: "◉",
    eyebrow: "START WITH A PROFILE",
    title: "Choose the demo that matches the story you want to explore.",
    copy: "The profile menu switches between Priya’s mismatch, Arjun’s clean salaried check, and Meera’s bank-interest review. Each uses safe synthetic information.",
  },
  {
    icon: "O",
    eyebrow: "REGIME SWITCH",
    title: "Use O or N to compare the relevant tax path.",
    copy: "The Regime button switches between Old and New. TaxPath keeps the selected path visible and changes the deductions and next questions it can show in this demo.",
  },
  {
    icon: "⇄",
    eyebrow: "CHOOSE YOUR WAY",
    title: "Let TaxO guide you, or review it yourself.",
    copy: "TaxO-led check turns the synthetic Form 16 into a short conversation. Manual review lets you pick documents and move through each check at your own pace.",
  },
  {
    icon: "▤",
    eyebrow: "UNDERSTAND BEFORE DECIDING",
    title: "Documents become clear checks, not a filing form.",
    copy: "TaxPath explains what the sample Form 16 shows, compares information such as TDS, and asks only follow-ups that may matter to the selected demo.",
  },
  {
    icon: "✓",
    eyebrow: "READINESS, EXPLAINED",
    title: "The final screen tells you what to review next.",
    copy: "A ready state means the synthetic checks are complete. “Don’t file yet” identifies the specific item to verify first—TaxPath never files or submits anything.",
  },
];

const taxPaidHistory: Record<ScenarioId, TaxHistoryEntry[]> = {
  priya: [
    { year: "FY 2024–25", paid: 1_35_400, status: "Filed" },
    { year: "FY 2023–24", paid: 1_21_600, status: "Filed" },
    { year: "FY 2022–23", paid: 1_08_900, status: "Filed" },
  ],
  arjun: [
    { year: "FY 2024–25", paid: 76_200, status: "Filed" },
    { year: "FY 2023–24", paid: 68_400, status: "Filed" },
    { year: "FY 2022–23", paid: 59_800, status: "Filed" },
  ],
  meera: [
    { year: "FY 2024–25", paid: 1_02_300, status: "Filed" },
    { year: "FY 2023–24", paid: 94_700, status: "Filed" },
    { year: "FY 2022–23", paid: 87_100, status: "Filed" },
  ],
};

const documentOptions: DocumentOption[] = [
  {
    icon: "▤",
    title: "Form 16",
    detail: "Best place to start",
    source: "Employer-issued tax certificate",
    checks: ["Salary income", "TDS deducted", "Employer details"],
    supported: true,
  },
  {
    icon: "◫",
    title: "AIS",
    detail: "Your reported income",
    source: "Annual Information Statement",
    checks: ["Interest income", "Dividends", "Reported TDS"],
    supported: false,
  },
  {
    icon: "✓",
    title: "26AS",
    detail: "Your TDS records",
    source: "Tax credit statement",
    checks: ["TDS credits", "Advance tax", "Self-assessment tax"],
    supported: false,
  },
  {
    icon: "▱",
    title: "Investment proof",
    detail: "Savings & deductions",
    source: "Investment and insurance records",
    checks: ["Section 80C", "Health insurance", "NPS contributions"],
    supported: false,
  },
  {
    icon: "⌂",
    title: "Home-loan certificate",
    detail: "Interest & principal",
    source: "Lender-issued annual certificate",
    checks: ["Interest paid", "Principal repayment", "Property details"],
    supported: false,
  },
  {
    icon: "⋯",
    title: "Other document",
    detail: "Salary slip, bank statement…",
    source: "Supporting tax document",
    checks: ["Income item", "Potential deduction", "Supporting evidence"],
    supported: false,
  },
];

const oldRegimeSavingChecks: SavingCheck[] = [
  {
    icon: "▱",
    title: "Section 80C investments",
    detail: "Investments and principal repayment — up to ₹1.5 lakh limit",
    checklist:
      "Check your EPF, PPF, ELSS, life-insurance, tuition-fee or eligible home-loan-principal records. The combined Section 80C limit and actual proofs still need verification.",
  },
  {
    icon: "✚",
    title: "Health insurance · 80D",
    detail: "Premiums for yourself, family or parents may matter",
    checklist:
      "Check the premium certificate, who paid it, and the insured persons’ ages. The available limit can vary, so this demo does not estimate a benefit yet.",
  },
  {
    icon: "⌂",
    title: "Home-loan interest · 24(b)",
    detail: "Interest certificate and property details may matter",
    checklist:
      "Use the lender’s annual certificate to separate interest from principal, then confirm the property use and applicable conditions before claiming anything.",
  },
  {
    icon: "⌁",
    title: "HRA and rent",
    detail: "Salary structure and rent evidence may affect exemption",
    checklist:
      "Check whether your salary includes HRA, your rent receipts and the relevant city details. TaxPath keeps this as a review item, not an automatic claim.",
  },
];

const taxoLanguages: Record<TaxOLanguage, TaxOLanguageOption> = {
  en: {
    label: "English",
    welcome: "Your multilingual tax guide",
    guide: "Ask about this demo in your preferred language.",
    ask: "What can I help you understand?",
    placeholder: "Ask TaxO if you’re stuck…",
    send: "Send",
  },
  hi: {
    label: "हिंदी",
    welcome: "आपका बहुभाषी टैक्स गाइड",
    guide: "अपनी पसंदीदा भाषा में इस डेमो के बारे में पूछें।",
    ask: "मैं क्या समझने में आपकी मदद करूँ?",
    placeholder: "TaxO से पूछें…",
    send: "भेजें",
  },
  bn: {
    label: "বাংলা",
    welcome: "আপনার বহুভাষী ট্যাক্স গাইড",
    guide: "আপনার পছন্দের ভাষায় এই ডেমো সম্পর্কে জিজ্ঞাসা করুন।",
    ask: "আমি কী বুঝতে সাহায্য করতে পারি?",
    placeholder: "TaxO-কে জিজ্ঞাসা করুন…",
    send: "পাঠান",
  },
  ta: {
    label: "தமிழ்",
    welcome: "உங்கள் பன்மொழி வரி வழிகாட்டி",
    guide: "உங்கள் விருப்ப மொழியில் இந்த டெமோவைப் பற்றி கேளுங்கள்.",
    ask: "நான் எதைப் புரிந்துகொள்ள உதவலாம்?",
    placeholder: "TaxO-விடம் கேளுங்கள்…",
    send: "அனுப்பு",
  },
  te: {
    label: "తెలుగు",
    welcome: "మీ బహుభాషా పన్ను మార్గదర్శి",
    guide: "మీకు నచ్చిన భాషలో ఈ డెమో గురించి అడగండి.",
    ask: "నేను ఏమి అర్థం చేసుకోవడంలో సహాయం చేయగలను?",
    placeholder: "TaxOని అడగండి…",
    send: "పంపు",
  },
  mr: {
    label: "मराठी",
    welcome: "तुमचा बहुभाषिक कर मार्गदर्शक",
    guide: "तुमच्या पसंतीच्या भाषेत या डेमोबद्दल विचारा.",
    ask: "मी काय समजून घेण्यास मदत करू?",
    placeholder: "TaxO ला विचारा…",
    send: "पाठवा",
  },
  kn: {
    label: "ಕನ್ನಡ",
    welcome: "ನಿಮ್ಮ ಬಹುಭಾಷಾ ತೆರಿಗೆ ಮಾರ್ಗದರ್ಶಿ",
    guide: "ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯಲ್ಲಿ ಈ ಡೆಮೊ ಬಗ್ಗೆ ಕೇಳಿ.",
    ask: "ನಾನು ಏನನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸಹಾಯ ಮಾಡಲಿ?",
    placeholder: "TaxO ಅನ್ನು ಕೇಳಿ…",
    send: "ಕಳುಹಿಸಿ",
  },
  ml: {
    label: "മലയാളം",
    welcome: "നിങ്ങളുടെ ബഹുഭാഷാ നികുതി ഗൈഡ്",
    guide: "നിങ്ങളുടെ ഇഷ്ടഭാഷയിൽ ഈ ഡെമോയെക്കുറിച്ച് ചോദിക്കൂ.",
    ask: "എന്ത് മനസ്സിലാക്കാൻ ഞാൻ സഹായിക്കട്ടെ?",
    placeholder: "TaxO യോട് ചോദിക്കൂ…",
    send: "അയയ്ക്കുക",
  },
};

const taxoChatCopy: Record<TaxOLanguage, TaxOChatCopy> = {
  en: { intro: "Hi, I’m TaxO. I’ll prepare this synthetic return from a Form 16, then show you each check before anything is decided.", processing: "I’m reading the synthetic Form 16: salary, employer TDS and financial year.", understoodOld: "Form 16 understood. I found salary income and TDS. One quick check may affect your old-regime benefit.", understoodNew: "Form 16 understood. I found salary income and TDS. One quick check may affect your regime comparison.", npsQuestion: "Do you contribute to NPS?", reviewing: "Thanks. I’m preparing your review with that answer.", done: "Process done. I prepared the same review checks for you below. Please review them before making any filing decision.", useForm16: "Use synthetic Form 16", explainProcess: "Explain the process", explainSavings: "Explain savings checks", next: "What should I do next?", processingLabel: "Processing Form 16", you: "You", yes: "Yes", no: "No", unsure: "I’m not sure" },
  hi: { intro: "नमस्ते, मैं TaxO हूँ। मैं इस सिंथेटिक Form 16 से तैयारी करूँगा, फिर किसी निर्णय से पहले हर जांच दिखाऊँगा।", processing: "मैं सिंथेटिक Form 16 पढ़ रहा हूँ: वेतन, नियोक्ता TDS और वित्तीय वर्ष।", understoodOld: "Form 16 समझ लिया गया। वेतन आय और TDS मिले। एक जांच पुराने टैक्स-रेजीम के लाभ को प्रभावित कर सकती है।", understoodNew: "Form 16 समझ लिया गया। वेतन आय और TDS मिले। एक जांच टैक्स-रेजीम की तुलना को प्रभावित कर सकती है।", npsQuestion: "क्या आप NPS में योगदान करते हैं?", reviewing: "धन्यवाद। मैं उस उत्तर के साथ आपकी समीक्षा तैयार कर रहा हूँ।", done: "प्रक्रिया पूरी हुई। नीचे समीक्षा जांच तैयार है। फाइलिंग का निर्णय लेने से पहले इन्हें देखें।", useForm16: "सिंथेटिक Form 16 चुनें", explainProcess: "प्रक्रिया समझाएँ", explainSavings: "बचत जांच समझाएँ", next: "मुझे आगे क्या करना चाहिए?", processingLabel: "Form 16 प्रोसेस हो रहा है", you: "आप", yes: "हाँ", no: "नहीं", unsure: "मुझे पक्का नहीं है" },
  bn: { intro: "হ্যালো, আমি TaxO। এই সিন্থেটিক Form 16 থেকে প্রস্তুতি নেব, তারপর সিদ্ধান্তের আগে প্রতিটি পরীক্ষা দেখাব।", processing: "আমি সিন্থেটিক Form 16 পড়ছি: বেতন, নিয়োগকর্তার TDS এবং আর্থিক বছর।", understoodOld: "Form 16 বোঝা গেছে। বেতন আয় ও TDS পাওয়া গেছে। একটি পরীক্ষা পুরনো রেজিমের সুবিধাকে প্রভাবিত করতে পারে।", understoodNew: "Form 16 বোঝা গেছে। বেতন আয় ও TDS পাওয়া গেছে। একটি পরীক্ষা রেজিম তুলনাকে প্রভাবিত করতে পারে।", npsQuestion: "আপনি কি NPS-এ অবদান রাখেন?", reviewing: "ধন্যবাদ। ওই উত্তরের ভিত্তিতে আপনার রিভিউ তৈরি করছি।", done: "প্রক্রিয়া সম্পন্ন। নিচে রিভিউ পরীক্ষাগুলি তৈরি করেছি। ফাইল করার সিদ্ধান্তের আগে দেখুন।", useForm16: "সিন্থেটিক Form 16 ব্যবহার করুন", explainProcess: "প্রক্রিয়াটি ব্যাখ্যা করুন", explainSavings: "সাশ্রয় পরীক্ষা ব্যাখ্যা করুন", next: "আমার পরের পদক্ষেপ কী?", processingLabel: "Form 16 প্রক্রিয়াকরণ হচ্ছে", you: "আপনি", yes: "হ্যাঁ", no: "না", unsure: "আমি নিশ্চিত নই" },
  ta: { intro: "வணக்கம், நான் TaxO. இந்த செயற்கை Form 16-இலிருந்து தயாரிப்பேன்; முடிவெடுக்கும் முன் ஒவ்வொரு சோதனையையும் காண்பிப்பேன்.", processing: "செயற்கை Form 16-ஐப் படிக்கிறேன்: சம்பளம், நிறுவனர் TDS மற்றும் நிதியாண்டு.", understoodOld: "Form 16 புரிந்துகொள்ளப்பட்டது. சம்பள வருமானம் மற்றும் TDS கிடைத்தது. ஒரு சோதனை பழைய ரெஜிம் பலனை பாதிக்கலாம்.", understoodNew: "Form 16 புரிந்துகொள்ளப்பட்டது. சம்பள வருமானம் மற்றும் TDS கிடைத்தது. ஒரு சோதனை ரெஜிம் ஒப்பீட்டை பாதிக்கலாம்.", npsQuestion: "நீங்கள் NPS-க்கு பங்களிக்கிறீர்களா?", reviewing: "நன்றி. அந்த பதிலுடன் உங்கள் மதிப்பாய்வைத் தயாரிக்கிறேன்.", done: "செயல்முறை முடிந்தது. கீழே மதிப்பாய்வு சோதனைகளைத் தயாரித்துள்ளேன். தாக்கல் முடிவுக்கு முன் பாருங்கள்.", useForm16: "செயற்கை Form 16 பயன்படுத்துக", explainProcess: "செயல்முறையை விளக்குக", explainSavings: "சேமிப்பு சோதனைகளை விளக்குக", next: "அடுத்து நான் என்ன செய்ய வேண்டும்?", processingLabel: "Form 16 செயலாக்கப்படுகிறது", you: "நீங்கள்", yes: "ஆம்", no: "இல்லை", unsure: "எனக்குத் தெரியவில்லை" },
  te: { intro: "హలో, నేను TaxO. ఈ సింథటిక్ Form 16 నుంచి సిద్ధం చేస్తాను; నిర్ణయం ముందు ప్రతి తనిఖీని చూపుతాను.", processing: "సింథటిక్ Form 16 చదువుతున్నాను: జీతం, యజమాని TDS మరియు ఆర్థిక సంవత్సరం.", understoodOld: "Form 16 అర్థమైంది. జీత ఆదాయం, TDS గుర్తించాను. ఒక తనిఖీ పాత రీజిమ్ ప్రయోజనాన్ని ప్రభావితం చేయవచ్చు.", understoodNew: "Form 16 అర్థమైంది. జీత ఆదాయం, TDS గుర్తించాను. ఒక తనిఖీ రీజిమ్ పోలికను ప్రభావితం చేయవచ్చు.", npsQuestion: "మీరు NPS కు చెల్లిస్తున్నారా?", reviewing: "ధన్యవాదాలు. ఆ సమాధానంతో మీ సమీక్షను సిద్ధం చేస్తున్నాను.", done: "ప్రక్రియ పూర్తయింది. దిగువ సమీక్ష తనిఖీలను సిద్ధం చేశాను. ఫైలింగ్ నిర్ణయం ముందు చూడండి.", useForm16: "సింథటిక్ Form 16 ఉపయోగించండి", explainProcess: "ప్రక్రియను వివరించండి", explainSavings: "పొదుపు తనిఖీలను వివరించండి", next: "నేను తరువాత ఏమి చేయాలి?", processingLabel: "Form 16 ప్రాసెస్ అవుతోంది", you: "మీరు", yes: "అవును", no: "కాదు", unsure: "నాకు ఖచ్చితంగా తెలియదు" },
  mr: { intro: "नमस्कार, मी TaxO आहे. या सिंथेटिक Form 16 वरून तयारी करेन आणि निर्णयापूर्वी प्रत्येक तपासणी दाखवेन.", processing: "मी सिंथेटिक Form 16 वाचत आहे: पगार, नियोक्ता TDS आणि आर्थिक वर्ष.", understoodOld: "Form 16 समजला. पगाराचे उत्पन्न आणि TDS सापडले. एक तपासणी जुन्या रेजीमच्या फायद्यावर परिणाम करू शकते.", understoodNew: "Form 16 समजला. पगाराचे उत्पन्न आणि TDS सापडले. एक तपासणी रेजीम तुलनेवर परिणाम करू शकते.", npsQuestion: "तुम्ही NPS मध्ये योगदान देता का?", reviewing: "धन्यवाद. त्या उत्तरासह तुमचे पुनरावलोकन तयार करीत आहे.", done: "प्रक्रिया पूर्ण झाली. खाली पुनरावलोकन तपासण्या तयार केल्या आहेत. फाइलिंगचा निर्णय घेण्यापूर्वी पाहा.", useForm16: "सिंथेटिक Form 16 वापरा", explainProcess: "प्रक्रिया समजावून सांगा", explainSavings: "बचत तपासण्या समजावून सांगा", next: "मी पुढे काय करावे?", processingLabel: "Form 16 प्रक्रिया सुरू आहे", you: "तुम्ही", yes: "होय", no: "नाही", unsure: "मला खात्री नाही" },
  kn: { intro: "ನಮಸ್ಕಾರ, ನಾನು TaxO. ಈ ಸಿಂಥೆಟಿಕ್ Form 16 ನಿಂದ ತಯಾರಿ ಮಾಡಿ, ನಿರ್ಧಾರಕ್ಕೂ ಮುನ್ನ ಪ್ರತಿ ಪರಿಶೀಲನೆಯನ್ನು ತೋರಿಸುತ್ತೇನೆ.", processing: "ಸಿಂಥೆಟಿಕ್ Form 16 ಓದುತ್ತಿದ್ದೇನೆ: ವೇತನ, ಉದ್ಯೋಗದಾತ TDS ಮತ್ತು ಹಣಕಾಸು ವರ್ಷ.", understoodOld: "Form 16 ಅರ್ಥವಾಯಿತು. ವೇತನ ಆದಾಯ ಮತ್ತು TDS ಸಿಕ್ಕಿವೆ. ಒಂದು ಪರಿಶೀಲನೆ ಹಳೆಯ ರೆಜೀಮ್ ಲಾಭದ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರಬಹುದು.", understoodNew: "Form 16 ಅರ್ಥವಾಯಿತು. ವೇತನ ಆದಾಯ ಮತ್ತು TDS ಸಿಕ್ಕಿವೆ. ಒಂದು ಪರಿಶೀಲನೆ ರೆಜೀಮ್ ಹೋಲಿಕೆಯ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರಬಹುದು.", npsQuestion: "ನೀವು NPS ಗೆ ಕೊಡುಗೆ ನೀಡುತ್ತೀರಾ?", reviewing: "ಧನ್ಯವಾದಗಳು. ಆ ಉತ್ತರದೊಂದಿಗೆ ನಿಮ್ಮ ಪರಿಶೀಲನೆಯನ್ನು ತಯಾರಿಸುತ್ತಿದ್ದೇನೆ.", done: "ಪ್ರಕ್ರಿಯೆ ಪೂರ್ಣಗೊಂಡಿದೆ. ಕೆಳಗೆ ಪರಿಶೀಲನಾ ಅಂಶಗಳನ್ನು ತಯಾರಿಸಿದ್ದೇನೆ. ಫೈಲಿಂಗ್ ನಿರ್ಧಾರಕ್ಕೂ ಮುನ್ನ ನೋಡಿ.", useForm16: "ಸಿಂಥೆಟಿಕ್ Form 16 ಬಳಸಿ", explainProcess: "ಪ್ರಕ್ರಿಯೆ ವಿವರಿಸಿ", explainSavings: "ಉಳಿತಾಯ ಪರಿಶೀಲನೆ ವಿವರಿಸಿ", next: "ನಾನು ಮುಂದೆ ಏನು ಮಾಡಬೇಕು?", processingLabel: "Form 16 ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿದೆ", you: "ನೀವು", yes: "ಹೌದು", no: "ಇಲ್ಲ", unsure: "ನನಗೆ ಖಚಿತವಿಲ್ಲ" },
  ml: { intro: "ഹലോ, ഞാൻ TaxO. ഈ സിന്തറ്റിക് Form 16-ൽ നിന്ന് തയ്യാറാക്കി, തീരുമാനത്തിന് മുമ്പ് ഓരോ പരിശോധനയും കാണിക്കും.", processing: "സിന്തറ്റിക് Form 16 വായിക്കുകയാണ്: ശമ്പളം, തൊഴിലുടമയുടെ TDS, സാമ്പത്തിക വർഷം.", understoodOld: "Form 16 മനസ്സിലാക്കി. ശമ്പള വരുമാനവും TDS-ഉം കണ്ടെത്തി. ഒരു പരിശോധന പഴയ റജീം ആനുകൂല്യത്തെ ബാധിക്കാം.", understoodNew: "Form 16 മനസ്സിലാക്കി. ശമ്പള വരുമാനവും TDS-ഉം കണ്ടെത്തി. ഒരു പരിശോധന റജീം താരതമ്യത്തെ ബാധിക്കാം.", npsQuestion: "നിങ്ങൾ NPS-ലേക്ക് സംഭാവന ചെയ്യുന്നുണ്ടോ?", reviewing: "നന്ദി. ആ മറുപടിയോടെ നിങ്ങളുടെ അവലോകനം തയ്യാറാക്കുന്നു.", done: "പ്രക്രിയ പൂർത്തിയായി. താഴെ അവലോകന പരിശോധനകൾ തയ്യാറാക്കി. ഫയലിംഗ് തീരുമാനത്തിന് മുമ്പ് പരിശോധിക്കുക.", useForm16: "സിന്തറ്റിക് Form 16 ഉപയോഗിക്കുക", explainProcess: "പ്രക്രിയ വിശദീകരിക്കുക", explainSavings: "സേവിംഗ് പരിശോധന വിശദീകരിക്കുക", next: "ഞാൻ അടുത്തതായി എന്ത് ചെയ്യണം?", processingLabel: "Form 16 പ്രോസസ്സ് ചെയ്യുന്നു", you: "നിങ്ങൾ", yes: "അതെ", no: "ഇല്ല", unsure: "എനിക്ക് ഉറപ്പില്ല" },
};

const stages: Record<Stage, number> = {
  home: 0,
  documents: 1,
  parsing: 1,
  understood: 2,
  question: 3,
  opportunity: 4,
  readiness: 5,
};
function Icon({ children }: { children: string }) {
  return (
    <span className="icon" aria-hidden="true">
      {children}
    </span>
  );
}

function App() {
  const [stage, setStage] = useState<Stage>("home");
  const [showWelcome, setShowWelcome] = useState(true);
  const [scenarioId, setScenarioId] = useState<ScenarioId>("priya");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [regime, setRegime] = useState<TaxRegime>("old");
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("taxpath-theme") as Theme) || "light",
  );
  const [showWhy, setShowWhy] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [selectedSavingCheck, setSelectedSavingCheck] =
    useState<SavingCheck | null>(null);
  const [npsAnswer, setNpsAnswer] = useState<"yes" | "no" | "unsure" | null>(
    null,
  );
  const [assistant, setAssistant] = useState<string | null>(null);
  const [assistantQuestion, setAssistantQuestion] = useState<string | null>(
    null,
  );
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentOption | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [journeyMode, setJourneyMode] = useState<JourneyMode>(null);
  const [automationStep, setAutomationStep] =
    useState<AutomationStep>("idle");
  const [taxoContext, setTaxoContext] = useState<string | null>(null);
  const [taxoLanguage, setTaxoLanguage] = useState<TaxOLanguage>("en");
  const [tourStep, setTourStep] = useState(() =>
    localStorage.getItem("taxpath-tour-seen") ? -1 : 0,
  );
  const scenario = scenarios[scenarioId] ?? scenarios.priya;
  const isOldRegime = regime === "old";
  const impact = useMemo(
    () => (isOldRegime ? estimatedNpsImpact(50_000) : 0),
    [isOldRegime],
  );
  const mismatch = tdsDifference(scenario.form16Tds, scenario.aisTds);

  useEffect(() => {
    localStorage.setItem("taxpath-theme", theme);
    const actualTheme =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    document.documentElement.dataset.theme = actualTheme;
  }, [theme]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => setShowWelcome(false),
      reducedMotion ? 450 : 2400,
    );
    return () => window.clearTimeout(timer);
  }, []);

  function beginParsing() {
    if (journeyMode === "automated") {
      startTaxOForm16();
      return;
    }
    setSelectedDocument(null);
    setStage("parsing");
    window.setTimeout(() => setStage("understood"), 1600);
  }
  function startTaxOForm16() {
    setSelectedDocument(null);
    setAutomationStep("processing");
    setTaxoContext(
      "TaxO reads the synthetic Form 16, extracts salary and TDS, and prepares the same checks shown in this demo. It never files or submits anything.",
    );
    setStage("parsing");
    window.setTimeout(() => {
      setStage("understood");
      setAutomationStep("nps-question");
    }, 1600);
  }
  function answerTaxOAutomation(answer: "yes" | "no" | "unsure") {
    setNpsAnswer(answer);
    setSelectedSavingCheck(null);
    setAutomationStep("reviewing");
    setStage("question");
    window.setTimeout(() => {
      setStage("opportunity");
      setAutomationStep("complete");
    }, 520);
  }
  function startJourney(mode: Exclude<JourneyMode, null>) {
    setJourneyMode(mode);
    setSelectedDocument(null);
    setAutomationStep(mode === "automated" ? "choose-document" : "idle");
    setAssistantQuestion(null);
    setAssistant(null);
    setTaxoContext(
      mode === "automated"
        ? "TaxO will prepare the synthetic Form 16 path alongside the familiar TaxPath checks. Nothing is filed in this demo."
        : null,
    );
    setAssistantOpen(mode === "automated");
    setStage("documents");
  }
  function switchJourneyMode() {
    const nextMode = journeyMode === "automated" ? "guided" : "automated";
    setJourneyMode(nextMode);
    setSelectedDocument(null);
    setAssistantQuestion(null);
    setAssistant(null);
    if (nextMode === "guided") {
      setAutomationStep("idle");
      setTaxoContext(null);
      setAssistantOpen(false);
      return;
    }
    const nextStep: AutomationStep =
      stage === "documents"
        ? "choose-document"
        : stage === "parsing"
          ? "processing"
          : stage === "understood" || stage === "question"
            ? "nps-question"
            : "complete";
    setAutomationStep(nextStep);
    setTaxoContext("TaxO is continuing at your current step. It does not reset your progress or submit anything.");
    setAssistantOpen(true);
  }
  function returnHome() {
    setStage("home");
    setJourneyMode(null);
    setAutomationStep("idle");
    setTaxoContext(null);
    setAssistant(null);
    setAssistantQuestion(null);
    setAssistantOpen(false);
    setSelectedDocument(null);
    setSelectedSavingCheck(null);
    setNpsAnswer(null);
    setShowWhy(false);
    setShowExplain(false);
  }
  function answerNps(answer: "yes" | "no" | "unsure") {
    if (journeyMode === "automated") {
      answerTaxOAutomation(answer);
      return;
    }
    setNpsAnswer(answer);
    setSelectedSavingCheck(null);
    window.setTimeout(() => setStage("opportunity"), 340);
  }
  function selectScenario(id: ScenarioId) {
    setScenarioId(id);
    setNpsAnswer(null);
    setAssistant(null);
    setAssistantQuestion(null);
    setSelectedDocument(null);
    setAssistantOpen(false);
    setJourneyMode(null);
    setAutomationStep("idle");
    setTaxoContext(null);
    setShowExplain(false);
    setSelectedSavingCheck(null);
    setStage("home");
  }
  function quickAnswer(prompt: string) {
    const question = prompt.trim();
    if (!question) return;
    setTaxoContext(null);
    const answers: Record<string, string> = {
      "Explain TaxO process":
        "TaxO uses the synthetic Form 16 to read salary, TDS and the financial year, then asks only relevant follow-up questions. It prepares review checks for you to inspect; it does not file, submit or make a final eligibility decision.",
      "Why is my tax this high?":
        "Most of " +
        scenario.firstName +
        "'s tax comes from salary. We have not treated the NPS check as a confirmed saving yet.",
      "Can I save tax?": isOldRegime
        ? "The old-regime demo highlights NPS, Section 80C, health insurance, home-loan interest and HRA as separate items to verify. TaxPath will not promise a saving until the relevant conditions and proofs are checked."
        : "In this new-regime demo, TaxPath does not apply a personal NPS deduction. You can compare regimes before you file.",
      "What is this mismatch?": mismatch
        ? "Your Form 16 and AIS differ by " +
          money.format(mismatch) +
          " in TDS. Check the source records before filing."
        : "The TDS records shown in this synthetic scenario agree.",
      "What should I do next?":
        scenario.status === "stop"
          ? "Review the AIS / Form 16 TDS difference before you move to filing."
          : "Complete the remaining check, then review your filing readiness.",
    };
    const stageGuidance: Record<Stage, string> = {
      home: "Start with the synthetic Form 16. I’ll show what I understood before asking any follow-up questions.",
      documents:
        "Choose the highlighted Form 16 for the strongest demo journey, or select any document you recognise to get a helpful explanation.",
      parsing:
        "I’m reading the safe, preloaded sample now. No real document or government account is involved.",
      understood:
        "Review the income and TDS summary, then continue to the short relevant check.",
      question:
        "Answer based on what you know. You can open “Why are you asking?” before choosing, and the prototype does not make a final eligibility decision.",
      opportunity:
        "This screen shows a potential benefit, not a promise. Use “Show me why” to see the assumptions before you continue.",
      readiness:
        scenario.status === "stop"
          ? "Open the highlighted review item, compare the source records, and update the demo only after you confirm the amount."
          : "Review the highlighted item before continuing. TaxPath keeps the decision clear and does not submit anything for you.",
    };
    setAssistantQuestion(question);
    const response =
      answers[question] ??
      "I can help with this screen. " +
        stageGuidance[stage] +
        " For official tax advice, confirm the source documents or speak to a qualified professional.";
    setAssistant(
      taxoLanguage === "en"
        ? response
        : taxoLanguages[taxoLanguage].guide + " " + response,
    );
    setAssistantOpen(true);
  }
  function closeTour() {
    localStorage.setItem("taxpath-tour-seen", "true");
    setTourStep(-1);
  }
  function nextTourStep() {
    if (tourStep >= tourSlides.length - 1) {
      closeTour();
      return;
    }
    setTourStep(tourStep + 1);
  }
  function restartTour() {
    setTourStep(0);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={returnHome}
          aria-label="Go to TaxPath home"
        >
          <span className="brand-mark">✦</span>
          <span>taxpath</span>
        </button>
        <div className="top-actions">
          <div className="demo-profile-picker">
            <button
              type="button"
              className="demo-profile-trigger"
              aria-label={`Demo profile: ${scenario.firstName}`}
              aria-haspopup="listbox"
              aria-expanded={profileMenuOpen}
              aria-controls="demo-profile-options"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            >
              <span className={"demo-profile-avatar " + scenario.id} aria-hidden="true">
                <b>{scenario.firstName.slice(0, 1)}</b>
                <i>{profileIllustrations[scenario.id].mark}</i>
              </span>
              <span className="demo-profile-trigger-copy">
                <strong>{scenario.firstName}</strong>
                <small>Demo profile</small>
              </span>
              <span className="demo-profile-chevron" aria-hidden="true">⌄</span>
            </button>
            {profileMenuOpen && (
              <div id="demo-profile-options" className="demo-profile-menu" role="listbox" aria-label="Demo profiles">
                {Object.values(scenarios).map((item) => {
                  const illustration = profileIllustrations[item.id];
                  const isSelected = scenarioId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={"demo-profile-option " + (isSelected ? "selected" : "")}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        selectScenario(item.id);
                        setProfileMenuOpen(false);
                      }}
                    >
                      <span className={"demo-profile-avatar " + item.id} aria-hidden="true">
                        <b>{item.firstName.slice(0, 1)}</b>
                        <i>{illustration.mark}</i>
                      </span>
                      <span className="demo-profile-copy">
                        <strong>{item.firstName}</strong>
                        <small>{item.label}</small>
                      </span>
                      {isSelected && <span className="demo-profile-current" aria-hidden="true">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            className="regime-toggle"
            onClick={() => {
              setRegime(isOldRegime ? "new" : "old");
              setSelectedSavingCheck(null);
            }}
            aria-label={`Switch to ${isOldRegime ? "New" : "Old"} regime`}
            title={`Switch to ${isOldRegime ? "New" : "Old"} regime`}
          >
            <span aria-hidden="true">{isOldRegime ? "O" : "N"}</span>
            <small>{isOldRegime ? "Old" : "New"}</small>
          </button>
          <label className="theme-select">
            <span className="sr-only">Colour theme</span>
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value as Theme)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
            <small>{theme === "dark" ? "Dark" : "Light"}</small>
          </button>
          <span className="demo-pill">Demo mode</span>
        </div>
        <div className="profile-actions">
          <button
            className="tour-button"
            onClick={restartTour}
            aria-label="See a walkthrough of TaxPath"
          >
            ?
          </button>
          <button className="avatar" aria-label="Open profile">
            P
          </button>
        </div>
      </header>
      <main className={journeyMode === "automated" ? "taxo-led-main" : ""}>
        {stage !== "home" && <Progress active={stages[stage]} />}
        {stage !== "home" && journeyMode && (
          <div className="journey-mode-banner">
            <span className={journeyMode === "automated" ? "taxo-mode-dot" : "manual-mode-dot"} aria-hidden="true" />
            <div>
              <strong>{journeyMode === "automated" ? "TaxO-led check" : "Manual review"}</strong>
              <small>
                {journeyMode === "automated"
                  ? "TaxO drives the demo conversation; you review each outcome."
                  : "You choose the documents, checks and next steps yourself."}
              </small>
            </div>
            <button onClick={switchJourneyMode}>
              Switch to {journeyMode === "automated" ? "manual review" : "TaxO-led check"}
            </button>
          </div>
        )}
        {stage === "home" && (
          <section className="hero page">
            <div className="eyebrow">
              <span className="pulse" /> Independent prototype · Build What
              Moves India
            </div>
            <div className="hero-grid">
              <div>
                <h1>
                  Your tax,
                  <br />
                  <em>without</em> the tax headache.
                </h1>
                <p className="hero-copy">
                  I’ll look at what you already have and help you figure out
                  what’s worth checking—before you file.
                </p>
                <section className="journey-choice" aria-labelledby="journey-title">
                  <div className="step-label">CHOOSE YOUR START</div>
                  <h2 id="journey-title">How would you like to prepare?</h2>
                  <div className="journey-choice-grid">
                    <button
                      className="journey-option automated"
                      onClick={() => startJourney("automated")}
                    >
                      <span className="journey-option-icon" aria-hidden="true">✦</span>
                      <span>
                        <strong>Let TaxO prepare my check</strong>
                        <small>A conversational Form 16 demo, led by TaxO</small>
                      </span>
                      <span aria-hidden="true">→</span>
                    </button>
                    <button
                      className="journey-option"
                      onClick={() => startJourney("guided")}
                    >
                      <span className="journey-option-icon manual" aria-hidden="true">↗</span>
                      <span>
                        <strong>I’ll review it myself</strong>
                        <small>Choose documents and checks at your own pace</small>
                      </span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </section>
                <p className="privacy-note">
                  <Icon>⌁</Icon> This demo uses only synthetic information.
                  TaxO prepares checks but never files or submits anything.
                </p>
                <div className="hero-art" aria-hidden="true">
                  <img src={taxCheckIllustration} alt="" />
                  <span>Understand · check · proceed</span>
                </div>
              </div>
              <aside className="snapshot-card">
                <div className="snapshot-head">
                  <span>YOUR TAX CHECK</span>
                  <span className="year-chip">FY 2025–26</span>
                </div>
                <h2>{scenario.firstName}, here’s what I’ll help you check.</h2>
                <Mini
                  icon="↗"
                  colour="blue"
                  title="Understand"
                  detail="What your documents say"
                />
                <Mini
                  icon="✦"
                  colour="green"
                  title="Find opportunities"
                  detail="Benefits worth checking"
                />
                <Mini
                  icon="!"
                  colour="amber"
                  title="Catch issues"
                  detail="Before you move to filing"
                />
                <div className="scenario-note">{scenario.note}</div>
              </aside>
            </div>
            <TaxHistory scenarioId={scenario.id} />
          </section>
        )}
        {stage === "documents" && (
          <section className="page flow-page">
            <div className="step-label">STEP 1 OF 5</div>
            <h1>
              {journeyMode === "automated"
                ? "Let’s start TaxO with your Form 16."
                : "What do you have?"}
            </h1>
            <p className="intro">
              {journeyMode === "automated"
                ? "TaxO can prepare the synthetic Form 16 path and surface the same checks for your review."
                : "Start anywhere. I’ll work with what you have and tell you what may matter next."}
            </p>
            {journeyMode === "automated" ? (
              <aside className="taxo-source-summary" aria-live="polite">
                <div className="taxo-source-mark" aria-hidden="true">▤</div>
                <div>
                  <div className="step-label">TAXO SOURCE</div>
                  <h2>Form 16 · synthetic demo</h2>
                  <p>
                    TaxO is ready to use the preloaded Form 16. Choose “Use
                    synthetic Form 16” in the TaxO chat to continue.
                  </p>
                </div>
                <div className="taxo-source-checks">
                  <span>Salary income</span>
                  <span>TDS details</span>
                  <span>Financial year</span>
                </div>
              </aside>
            ) : (
              <>
                <div className="document-grid">
                  {documentOptions.map((document) => (
                    <button
                      className={
                        "document-card " +
                        (document.supported ? "featured" : "guided")
                      }
                      key={document.title}
                      onClick={() =>
                        document.supported
                          ? beginParsing()
                          : setSelectedDocument(document)
                      }
                    >
                      <span className="document-icon">{document.icon}</span>
                      <strong>{document.title}</strong>
                      <small>{document.detail}</small>
                      {document.supported ? (
                        <span className="recommended">Recommended</span>
                      ) : (
                        <span className="document-status">Guided preview</span>
                      )}
                    </button>
                  ))}
                </div>
                {selectedDocument && (
                  <aside className="document-guide" aria-live="polite">
                    <div>
                      <div className="step-label">DOCUMENT GUIDANCE</div>
                      <h2>{selectedDocument.title}</h2>
                      <p>
                        This document is recognised in the prototype, but its
                        automated analysis is not part of this demo journey yet.
                      </p>
                    </div>
                    <div className="document-guide-data">
                      <div>
                        <span>Source</span>
                        <strong>{selectedDocument.source}</strong>
                      </div>
                      <div>
                        <span>TaxPath would check</span>
                        <strong>{selectedDocument.checks.join(" · ")}</strong>
                      </div>
                      <div>
                        <span>Demo status</span>
                        <strong>Guidance available</strong>
                      </div>
                    </div>
                    <button className="button primary" onClick={beginParsing}>
                      Continue with Form 16 demo <span>→</span>
                    </button>
                  </aside>
                )}
                <button
                  className="unknown-link"
                  onClick={() => {
                    setAssistantQuestion("I don’t know what I need");
                    setAssistant(
                      "That’s okay. Start with any document you recognise. For this prototype’s complete, guided journey, choose the synthetic Form 16.",
                    );
                    setAssistantOpen(true);
                  }}
                >
                  I don’t know what I need <span>→</span>
                </button>
              </>
            )}
          </section>
        )}
        {stage === "parsing" && (
          <section
            className="page parse-page"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="document-preview">
              <div className="doc-top">
                FORM 16 <span>SYNTHETIC</span>
              </div>
              <div className="doc-lines" />
              <div className="doc-lines short" />
              <div className="doc-lines" />
              <div className="doc-stamp">
                TAXPATH
                <br />
                DEMO
              </div>
            </div>
            <div className="parse-copy">
              <div className="step-label">SYNTHETIC DOCUMENT</div>
              <h1>I’m understanding your Form 16.</h1>
              <p>
                <span className="loading-dot" aria-hidden="true" />
                Demo mode is reading a safe, preloaded sample. Nothing real is
                uploaded.
              </p>
              <div className="parse-steps">
                <span>✓ Uploading</span>
                <span>✓ Reading</span>
                <span className="active">◌ Understanding</span>
                <span>○ Extracting</span>
              </div>
            </div>
          </section>
        )}
        {stage === "understood" && (
          <section className="page understood-page">
            <div className="success-orb">✓</div>
            <div className="step-label">FORM 16 UNDERSTOOD</div>
            <h1>I’ve understood your Form 16.</h1>
            <p className="intro">
              Here’s the information I found. You can review it now; I’ll also
              check it against your other tax information later.
            </p>
            <div className="data-card">
              <Data
                label="Annual income"
                value={money.format(scenario.income)}
              />
              <Data
                label="TDS deducted"
                value={money.format(scenario.form16Tds)}
              />
              <Data label="Employer" value="Northstar Labs Pvt. Ltd." />
              <Data label="Financial year" value="2025–26" />
            </div>
            <div className="next-card">
              <span className="assistant-star">✦</span>
              <div>
                <strong>
                  Now I’ll check if there’s anything worth your attention.
                </strong>
                <p>I’ll ask only what could change your tax situation.</p>
              </div>
            </div>
            <button
              className="button primary"
              onClick={() => setStage("question")}
            >
              Let’s check <span>→</span>
            </button>
          </section>
        )}
        {stage === "question" && (
          <section className="page question-page">
            <div className="question-count">
              1 <span>/ 3 relevant checks</span>
            </div>
            <div className="question-card">
              <div className="question-symbol">✦</div>
              <div className="step-label">
                {isOldRegime ? "A POTENTIAL BENEFIT" : "A REGIME CHECK"}
              </div>
              <h1>Do you contribute to NPS?</h1>
              <p>
                {isOldRegime
                  ? "National Pension System contributions can matter to your tax calculation in some situations."
                  : "Your selected new regime changes how this personal NPS contribution is treated in this synthetic demo."}
              </p>
              <button
                className="why-button"
                onClick={() => setShowWhy(!showWhy)}
                aria-expanded={showWhy}
              >
                Why are you asking? <span>{showWhy ? "−" : "+"}</span>
              </button>
              {showWhy && (
                <div className="why-panel">
                  Because this may reveal a legitimate tax benefit you haven’t
                  considered. I’m checking rather than assuming—and I’ll ask for
                  the detail only if it changes something.
                </div>
              )}
              <div className="answer-row">
                <button onClick={() => answerNps("yes")}>Yes</button>
                <button onClick={() => answerNps("no")}>No</button>
                <button onClick={() => answerNps("unsure")}>
                  I’m not sure
                </button>
              </div>
            </div>
            <p className="quiet-note">
              You can change this answer later. This prototype never uses it to
              determine final eligibility.
            </p>
          </section>
        )}
        {stage === "opportunity" && (
          <section className="page opportunity-page">
            <div className="step-label">YOUR TAX OPPORTUNITIES</div>
            <h1>
              {isOldRegime
                ? npsAnswer === "no"
                  ? "Several things are still worth checking."
                  : "I found several areas worth checking."
                : "Your regime choice changes this check."}
            </h1>
            <p className="intro">
              {isOldRegime
                ? "This is not a confirmed tax saving. It is a useful next question based on the information in this synthetic demo."
                : "Under this synthetic new-regime scenario, TaxPath does not apply a personal NPS deduction. It keeps the item visible so you can compare before filing."}
            </p>
            <article className="opportunity-card">
              <div className="opportunity-icon">✦</div>
              <div className="opportunity-content">
                <div className="tag positive">
                  {isOldRegime ? "POTENTIAL BENEFIT" : "REGIME CHECK"}
                </div>
                <h2>NPS contribution</h2>
                <p>
                  {isOldRegime
                    ? "We found a possible contribution of ₹50,000 to check. Depending on your selected regime and applicable conditions, it may affect your calculation."
                    : "The ₹50,000 personal contribution remains visible for comparison, but TaxPath does not apply it as a deduction in this new-regime demo."}
                </p>
              </div>
              <div className="impact">
                <span>
                  {isOldRegime
                    ? "Potential tax impact"
                    : "Tax impact in this demo"}
                </span>
                <strong>{money.format(impact)}</strong>
                <small>
                  {isOldRegime
                    ? "Estimated, not confirmed"
                    : "Not applied in new regime"}
                </small>
              </div>
              <button
                className="explain-button"
                onClick={() => setShowExplain(!showExplain)}
              >
                Show me why <span>→</span>
              </button>
              {showExplain && (
                <div className="explain-panel">
                  <Data
                    label="Selected regime"
                    value={isOldRegime ? "Old regime" : "New regime"}
                  />
                  <span>↓</span>
                  <Data
                    label={
                      isOldRegime
                        ? "Possible NPS contribution"
                        : "Personal NPS deduction"
                    }
                    value={isOldRegime ? "₹50,000" : "Not applied in this demo"}
                  />
                  <span>↓</span>
                  <Data
                    label={isOldRegime ? "Potential tax impact" : "Next step"}
                    value={
                      isOldRegime
                        ? money.format(impact)
                        : "Compare before filing"
                    }
                  />
                  <p>
                    {isOldRegime
                      ? "This is a transparent illustration, not a filing calculation. TaxPath needs to verify the relevant conditions before treating it as a confirmed benefit."
                      : "This is a regime comparison, not a filing calculation. TaxPath keeps the contribution visible so you can make an informed choice before filing."}
                  </p>
                </div>
              )}
            </article>
            {isOldRegime && (
              <section className="saving-checks" aria-labelledby="saving-checks-title">
                <div className="saving-checks-heading">
                  <div>
                    <div className="step-label">MORE OLD-REGIME CHECKS</div>
                    <h2 id="saving-checks-title">Explore other tax-saving sections</h2>
                  </div>
                  <p>
                    These are separate checks, not additions to the NPS estimate.
                    Open one to see exactly what evidence to review.
                  </p>
                </div>
                <div className="saving-check-grid">
                  {oldRegimeSavingChecks.map((check) => (
                    <button
                      key={check.title}
                      className={
                        "saving-check" +
                        (selectedSavingCheck?.title === check.title
                          ? " selected"
                          : "")
                      }
                      onClick={() => setSelectedSavingCheck(check)}
                      aria-expanded={selectedSavingCheck?.title === check.title}
                    >
                      <span className="saving-check-icon" aria-hidden="true">
                        {check.icon}
                      </span>
                      <span>
                        <strong>{check.title}</strong>
                        <small>{check.detail}</small>
                      </span>
                      <span className="saving-check-arrow" aria-hidden="true">
                        →
                      </span>
                    </button>
                  ))}
                </div>
                {selectedSavingCheck && (
                  <article className="saving-check-detail" aria-live="polite">
                    <div>
                      <span className="step-label">WHAT TO VERIFY</span>
                      <h3>{selectedSavingCheck.title}</h3>
                      <p>{selectedSavingCheck.checklist}</p>
                    </div>
                    <button
                      className="saving-check-close"
                      onClick={() => setSelectedSavingCheck(null)}
                    >
                      Close <span>×</span>
                    </button>
                  </article>
                )}
              </section>
            )}
            <div className="opportunity-list">
              {!isOldRegime && (
                <Mini
                  icon="✓"
                  colour="green"
                  title="Health insurance"
                  detail="Information found in your sample data"
                />
              )}
              <Mini
                icon={mismatch ? "!" : "✓"}
                colour={mismatch ? "red" : "green"}
                title={mismatch ? "AIS mismatch" : "TDS records"}
                detail={
                  mismatch
                    ? "Needs attention before filing"
                    : "Information matches"
                }
              />
            </div>
            <button
              className="button primary"
              onClick={() => setStage("readiness")}
            >
              Check my filing readiness <span>→</span>
            </button>
          </section>
        )}
        {stage === "readiness" && (
          <Readiness
            scenario={scenario}
            mismatch={mismatch}
            regime={regime}
            onAssistant={quickAnswer}
            onHome={returnHome}
          />
        )}
      </main>
      <TaxO
        onPrompt={quickAnswer}
        answer={assistant}
        question={assistantQuestion}
        open={assistantOpen}
        onToggle={() => setAssistantOpen(!assistantOpen)}
        onClose={() => setAssistantOpen(false)}
        language={taxoLanguage}
        onLanguageChange={setTaxoLanguage}
        journeyMode={journeyMode}
        automationStep={automationStep}
        onStartForm16={startTaxOForm16}
        onAnswerAutomation={answerTaxOAutomation}
        context={taxoContext}
        isOldRegime={isOldRegime}
        npsAnswer={npsAnswer}
        stage={stage}
      />
      {tourStep >= 0 && (
        <Tour step={tourStep} onNext={nextTourStep} onClose={closeTour} />
      )}
      {showWelcome && <WelcomeSplash onEnter={() => setShowWelcome(false)} />}
    </div>
  );
}
function WelcomeSplash({ onEnter }: { onEnter: () => void }) {
  return (
    <section
      className="welcome-splash"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="welcome-orbit welcome-orbit-one" aria-hidden="true" />
      <div className="welcome-orbit welcome-orbit-two" aria-hidden="true" />
      <div className="welcome-content">
        <div className="welcome-mark" aria-hidden="true">✦</div>
        <div className="welcome-brand" id="welcome-title">taxpath</div>
        <p className="welcome-tagline">the <em>right</em> path</p>
        <div className="welcome-path" aria-hidden="true">
          <span />
          <i />
          <b />
        </div>
        <p className="welcome-status">A calmer way to understand your tax.</p>
        <button className="welcome-enter" onClick={onEnter} autoFocus>
          Enter TaxPath <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
function Mini({
  icon,
  colour,
  title,
  detail,
}: {
  icon: string;
  colour: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="mini-row">
      <span className={"mini-icon " + colour}>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}
function Data({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function TaxHistory({ scenarioId }: { scenarioId: ScenarioId }) {
  const history = taxPaidHistory[scenarioId];
  return (
    <section className="tax-history" aria-labelledby="tax-history-title">
      <div className="tax-history-copy">
        <div className="step-label">YOUR TAX HISTORY</div>
        <h2 id="tax-history-title">Last 3 years of tax paid</h2>
        <p>
          A simple view of the synthetic returns already filed in this demo.
        </p>
      </div>
      <div className="tax-history-list">
        {history.map((entry) => (
          <div className="tax-history-item" key={entry.year}>
            <div>
              <span>{entry.year}</span>
              <strong>{money.format(entry.paid)}</strong>
            </div>
            <small>✓ {entry.status}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
function Progress({ active }: { active: number }) {
  const labels = [
    "Start",
    "Documents",
    "Understand",
    "Check",
    "Opportunities",
    "Ready",
  ];
  return (
    <div className="progress" aria-label={"Progress: " + labels[active]}>
      <div className="progress-inner">
        {labels.map((label, index) => (
          <div
            className={
              index <= active ? "progress-step active" : "progress-step"
            }
            key={label}
          >
            <span>{index < active ? "✓" : index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
function TaxO({
  onPrompt,
  answer,
  question,
  open,
  onToggle,
  onClose,
  language,
  onLanguageChange,
  journeyMode,
  automationStep,
  onStartForm16,
  onAnswerAutomation,
  context,
  isOldRegime,
  npsAnswer,
  stage,
}: {
  onPrompt: (prompt: string) => void;
  answer: string | null;
  question: string | null;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  language: TaxOLanguage;
  onLanguageChange: (language: TaxOLanguage) => void;
  journeyMode: JourneyMode;
  automationStep: AutomationStep;
  onStartForm16: () => void;
  onAnswerAutomation: (answer: "yes" | "no" | "unsure") => void;
  context: string | null;
  isOldRegime: boolean;
  npsAnswer: "yes" | "no" | "unsure" | null;
  stage: Stage;
}) {
  const [query, setQuery] = useState("");
  const [showPrompts, setShowPrompts] = useState(false);
  const copy = taxoLanguages[language];
  const chat = taxoChatCopy[language];
  const prompts = [
    "Why is my tax this high?",
    "Can I save tax?",
    "What is this mismatch?",
    "What should I do next?",
  ];
  return (
    <div className="taxo-float">
      {open && (
        <aside className="taxo-panel" aria-label="TaxO tax assistant">
          <div className="taxo-panel-head">
            <div className="taxo-title">
              <span className="taxo-mini" aria-hidden="true">
                <i />
                <i />
                <b />
              </span>
              <div>
                <strong>TaxO</strong>
                <small>{copy.welcome}</small>
              </div>
            </div>
            <button
              onClick={onClose}
              className="taxo-close"
              aria-label="Close TaxO"
            >
              ×
            </button>
          </div>
          <label className="taxo-language">
            <span>Language</span>
            <select
              value={language}
              onChange={(event) =>
                onLanguageChange(event.target.value as TaxOLanguage)
              }
              aria-label="TaxO language"
            >
              {Object.entries(taxoLanguages).map(([code, option]) => (
                <option key={code} value={code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {context && (
            <div className="taxo-context" tabIndex={0}>
              <span aria-hidden="true">i</span>
              <div role="tooltip">{context}</div>
              <small>About this automated demo</small>
            </div>
          )}
          <div className="taxo-chat-log" aria-live="polite">
            {journeyMode === "automated" && (
              <>
                <div className="taxo-bubble">
                  {chat.intro}
                </div>
                {automationStep === "choose-document" && (
                  <div className="taxo-replies">
                    <button onClick={onStartForm16}>{chat.useForm16}</button>
                    <button onClick={() => onPrompt("Explain TaxO process")}>{chat.explainProcess}</button>
                  </div>
                )}
                {automationStep !== "choose-document" && (
                  <>
                    <div className="taxo-bubble">
                      {automationStep === "processing"
                        ? chat.processing
                        : isOldRegime ? chat.understoodOld : chat.understoodNew}
                    </div>
                    {automationStep === "processing" && (
                      <div className="taxo-processing">
                        <span className="loading-dot" aria-hidden="true" /> {chat.processingLabel}
                      </div>
                    )}
                  </>
                )}
                {(automationStep === "reviewing" || automationStep === "complete") && npsAnswer && (
                  <div className="taxo-question">
                    {chat.you}: {npsAnswer === "unsure" ? chat.unsure : npsAnswer === "yes" ? chat.yes : chat.no}
                  </div>
                )}
                {automationStep === "nps-question" && (
                  <>
                    <div className="taxo-bubble taxo-question-bubble">
                      {chat.npsQuestion}
                    </div>
                    <div className="taxo-replies">
                      <button onClick={() => onAnswerAutomation("yes")}>{chat.yes}</button>
                      <button onClick={() => onAnswerAutomation("no")}>{chat.no}</button>
                      <button onClick={() => onAnswerAutomation("unsure")}>{chat.unsure}</button>
                    </div>
                  </>
                )}
                {automationStep === "reviewing" && (
                  <div className="taxo-bubble">{chat.reviewing}</div>
                )}
                {automationStep === "complete" && (
                  <>
                    <div className="taxo-bubble">
                      {chat.done}
                    </div>
                    <div className="taxo-replies">
                      <button onClick={() => onPrompt("Can I save tax?")}>{chat.explainSavings}</button>
                      <button onClick={() => onPrompt("What should I do next?")}>{chat.next}</button>
                    </div>
                  </>
                )}
              </>
            )}
            {question && <div className="taxo-question">You: {question}</div>}
            {answer && (
              <div className="taxo-answer" role="status">
                {answer}
              </div>
            )}
          </div>
          <button
            className="taxo-suggestions-toggle"
            onClick={() => setShowPrompts(!showPrompts)}
            aria-expanded={showPrompts}
          >
            {copy.ask} <span>{showPrompts ? "−" : "+"}</span>
          </button>
          {showPrompts && (
            <div className="taxo-prompt-list">
              {prompts.map((prompt) => (
                <button key={prompt} onClick={() => onPrompt(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          )}
          <form
            className="taxo-compose"
            onSubmit={(event) => {
              event.preventDefault();
              if (!query.trim()) return;
              onPrompt(query);
              setQuery("");
            }}
          >
            <label className="sr-only" htmlFor="taxo-question">
              Ask TaxO a question about this screen
            </label>
            <input
              id="taxo-question"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.placeholder}
              autoComplete="off"
            />
            <button type="submit" aria-label="Send question to TaxO">
              {copy.send}
            </button>
          </form>
        </aside>
      )}
      <button
        className="taxo-trigger"
        onClick={onToggle}
        aria-label={open ? "Close TaxO" : "Open TaxO tax assistant"}
        aria-expanded={open}
      >
        <span className="taxo-orb" aria-hidden="true">
          <i />
          <i />
          <b />
        </span>
        <span>
          <strong>TaxO</strong>
          <small>Tax guide</small>
        </span>
      </button>
    </div>
  );
}
function Tour({
  step,
  onNext,
  onClose,
}: {
  step: number;
  onNext: () => void;
  onClose: () => void;
}) {
  const slide = tourSlides[step];
  return (
    <div className="tour-backdrop" role="presentation">
      <section
        className="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
      >
        <button
          className="tour-close"
          onClick={onClose}
          aria-label="Close walkthrough"
        >
          ×
        </button>
        <div className="tour-progress">
          {tourSlides.map((_, index) => (
            <span className={index <= step ? "active" : ""} key={index} />
          ))}
        </div>
        <div className="tour-slide" key={slide.title}>
          <div className="tour-icon">{slide.icon}</div>
          <div className="step-label">{slide.eyebrow}</div>
          <h2 id="tour-title">{slide.title}</h2>
          <p>{slide.copy}</p>
        </div>
        <div className="tour-actions">
          <button className="tour-skip" onClick={onClose}>
            Skip for now
          </button>
          <button className="button primary" onClick={onNext}>
            {step === tourSlides.length - 1 ? "Start exploring" : "Next"}{" "}
            <span>→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
function Readiness({
  scenario,
  mismatch,
  regime,
  onAssistant,
  onHome,
}: {
  scenario: Scenario;
  mismatch: number;
  regime: TaxRegime;
  onAssistant: (prompt: string) => void;
  onHome: () => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [reviewUpdated, setReviewUpdated] = useState(false);
  const [reviewSource, setReviewSource] = useState<string | null>(null);
  const reviewComplete = reviewUpdated && scenario.status !== "ready";
  const effectiveStatus = reviewComplete ? "ready" : scenario.status;
  const stop = effectiveStatus === "stop";
  const ready = effectiveStatus === "ready";
  const title = reviewComplete
    ? "You’re ready to continue."
    : ready
      ? "You’re ready to move forward."
      : stop
        ? "Don’t file yet."
        : "You’re almost ready.";
  const subtext = reviewComplete
    ? "Your source choice is recorded in this demo. TaxPath has not filed anything for you."
    : ready
      ? "We checked the synthetic information you provided."
      : stop
        ? "We found information that may need attention before you file."
        : "One thing is worth checking first.";
  function reviewIssue() {
    setReviewOpen(true);
    setUpdateOpen(true);
    const targetId = mismatch ? "mismatch-details" : "bank-interest-review";
    window.setTimeout(
      () =>
        document
          .getElementById(targetId)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      0,
    );
  }
  return (
    <section className="page readiness-page">
      <div className={"readiness-hero " + effectiveStatus}>
        <img
          className="readiness-art"
          src={taxCheckIllustration}
          alt=""
          aria-hidden="true"
        />
        <div className="readiness-symbol">{ready ? "✓" : stop ? "!" : "○"}</div>
        <div className="step-label">
          {reviewComplete
            ? "REVIEW COMPLETE"
            : ready
              ? "READY"
              : stop
                ? "DON’T FILE YET"
                : "ALMOST READY"}
        </div>
        <h1>{title}</h1>
        <p>{subtext}</p>
        {!ready && (
          <button className="button dark-button" onClick={reviewIssue}>
            {stop ? "See what I found" : "Review it"} <span>→</span>
          </button>
        )}
      </div>
      <div className="check-section">
        <div>
          <div className="step-label">YOUR TAX CHECK</div>
          <h2>
            {reviewComplete
              ? "Your review is complete"
              : scenario.attention
                ? String(scenario.attention) +
                  " thing" +
                  (scenario.attention > 1 ? "s " : " ") +
                  (scenario.attention > 1 ? "need" : "needs") +
                  " your attention"
                : "Everything you shared has been checked"}
          </h2>
        </div>
        <div className="check-grid">
          <Check label="Income" value="Verified" state="good" />
          <Check
            label="TDS"
            value={
              mismatch ? (reviewUpdated ? "Reviewed" : "Review") : "Checked"
            }
            state={mismatch && !reviewUpdated ? "warn" : "good"}
          />
          <Check
            label="AIS"
            value={
              mismatch ? (reviewUpdated ? "Reviewed" : "Review") : "Checked"
            }
            state={mismatch && !reviewUpdated ? "bad" : "good"}
          />
          <Check label="Deductions" value="Checked" state="good" />
          <Check
            label="Other income"
            value={
              scenario.id === "meera"
                ? reviewUpdated
                  ? "Reviewed"
                  : "Needs review"
                : "Checked"
            }
            state={scenario.id === "meera" && !reviewUpdated ? "warn" : "good"}
          />
          <Check
            label="Regime"
            value={
              regime === "old" ? "Old regime selected" : "New regime selected"
            }
            state="good"
          />
        </div>
      </div>
      {scenario.status === "ready" && (
        <div className="empty-state" role="status">
          <span>✓</span>
          <div>
            <strong>No follow-ups right now</strong>
            <p>
              Everything in this synthetic scenario has been checked. You can
              return here after adding another document.
            </p>
          </div>
        </div>
      )}
      {mismatch > 0 && (
        <article id="mismatch-details" className="mismatch-card" tabIndex={-1}>
          <div className="mismatch-header">
            <span className={"status-dot " + (reviewComplete ? "good" : "bad")}>
              {reviewComplete ? "✓" : "!"}
            </span>
            <div>
              <h2>
                {reviewComplete
                  ? "TDS review is complete."
                  : "Something doesn’t match."}
              </h2>
              <p>
                {reviewComplete
                  ? "The " +
                    reviewSource +
                    " source is recorded for this demo. Confirm any official correction directly with the relevant source before filing."
                  : "These two records show different TDS amounts. Before filing, it’s worth checking which figure is correct."}
              </p>
            </div>
          </div>
          <div className="mismatch-numbers">
            <Data
              label="Form 16 TDS"
              value={money.format(scenario.form16Tds)}
            />
            <Data label="AIS TDS" value={money.format(scenario.aisTds)} />
            <div className="difference">
              <Data label="Difference" value={money.format(mismatch)} />
            </div>
          </div>
          <div className="what-next">
            <strong>What should I do?</strong>
            <ol>
              <li>Review Form 16 and AIS.</li>
              <li>Check employer TDS details.</li>
              <li>Verify or correct the record before you continue.</li>
            </ol>
          </div>
          {reviewOpen && (
            <div className="review-detail">
              <strong>What this means in this demo</strong>
              <p>
                The employer record shows ₹1,42,000 of TDS, while the AIS record
                shows ₹1,32,000. TaxPath cannot decide which source is correct,
                so it pauses the filing journey and asks you to verify it.
              </p>
              {!reviewUpdated && (
                <button
                  className="review-update"
                  onClick={() => setUpdateOpen(!updateOpen)}
                  aria-expanded={updateOpen}
                >
                  Update this record <span>→</span>
                </button>
              )}
              {updateOpen && !reviewUpdated && (
                <div className="review-update-panel">
                  <strong>Which confirmed amount should this demo use?</strong>
                  <p>
                    Choose only after checking the source documents. This
                    updates the demo status, not an official record.
                  </p>
                  <div className="review-options">
                    <button
                      onClick={() => {
                        setReviewSource("Form 16");
                        setReviewUpdated(true);
                      }}
                    >
                      Use Form 16: ₹1,42,000
                    </button>
                    <button
                      onClick={() => {
                        setReviewSource("AIS");
                        setReviewUpdated(true);
                      }}
                    >
                      Use AIS: ₹1,32,000
                    </button>
                  </div>
                </div>
              )}
              {reviewUpdated && (
                <p className="review-confirmation" role="status">
                  ✓ Review recorded using {reviewSource}. The TDS and AIS checks
                  are now marked as reviewed.
                </p>
              )}
            </div>
          )}
        </article>
      )}
      {scenario.id === "meera" && (
        <article
          id="bank-interest-review"
          className="mismatch-card amber-card"
          tabIndex={-1}
        >
          <div className="mismatch-header">
            <span className="status-dot warn">!</span>
            <div>
              <h2>Bank interest is worth a quick review.</h2>
              <p>
                Your synthetic AIS shows interest income that isn’t in the Form
                16 summary.
              </p>
            </div>
          </div>
          {reviewOpen && (
            <div className="review-detail">
              <strong>What to check</strong>
              <p>
                Look for the bank interest certificate or statement, then
                compare it with the ₹12,600 interest item in this demo AIS. Add
                or correct it only after you confirm the source record.
              </p>
              {!reviewUpdated && (
                <button
                  className="review-update"
                  onClick={() => setUpdateOpen(!updateOpen)}
                  aria-expanded={updateOpen}
                >
                  Update this item <span>→</span>
                </button>
              )}
              {updateOpen && !reviewUpdated && (
                <div className="review-update-panel">
                  <strong>Confirm the bank-interest entry</strong>
                  <p>
                    This synthetic demo records the item as reviewed after you
                    confirm it against the bank statement.
                  </p>
                  <button
                    className="review-done"
                    onClick={() => {
                      setReviewSource("bank interest");
                      setReviewUpdated(true);
                    }}
                  >
                    Mark ₹12,600 as reviewed
                  </button>
                </div>
              )}
              {reviewUpdated && (
                <p className="review-confirmation" role="status">
                  ✓ Interest review recorded in this demo.
                </p>
              )}
            </div>
          )}
        </article>
      )}
      <button className="back-home" onClick={onHome}>
        ← Return to demo home
      </button>
    </section>
  );
}
function Check({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: "good" | "warn" | "bad";
}) {
  return (
    <div className="check-item">
      <span className={"status-dot " + state}>
        {state === "good" ? "✓" : "!"}
      </span>
      <div>
        <strong>{label}</strong>
        <small>{value}</small>
      </div>
    </div>
  );
}
export default App;
