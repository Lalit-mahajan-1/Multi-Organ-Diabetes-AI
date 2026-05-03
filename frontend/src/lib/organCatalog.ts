export interface OrganPageData {
  slug: string;
  path: string;
  title: string;
  subtitle: string;
  badge: string;
  accent: string;
  summary: string;
  overview: string;
  keyPoints: string[];
  commonChecks: string[];
  selfCare: string[];
  urgentSigns: string[];
  doctorQuestions: string[];
}

export const organCatalog: OrganPageData[] = [
  {
    slug: "heart",
    path: "/organs/heart",
    title: "Heart",
    subtitle: "Cardiovascular risk",
    badge: "CV",
    accent: "#ef4444",
    summary: "Tracks blood pressure, cholesterol, ECG patterns, and circulation strain.",
    overview:
      "The cardiovascular system is one of the most important diabetes complication pathways. Elevated blood sugar can damage vessels over time, increasing the chance of hypertension, coronary disease, and poor circulation.",
    keyPoints: [
      "Blood pressure trends",
      "Cholesterol and triglycerides",
      "ECG / rhythm changes",
    ],
    commonChecks: [
      "Blood pressure at each visit",
      "Lipid profile every 3 to 6 months",
      "ECG if chest discomfort or palpitations appear",
    ],
    selfCare: [
      "Stay active most days of the week",
      "Reduce sodium and processed foods",
      "Take medicines exactly as prescribed",
    ],
    urgentSigns: [
      "Chest pain or pressure",
      "Shortness of breath at rest",
      "Sudden sweating, nausea, or fainting",
    ],
    doctorQuestions: [
      "What is my target blood pressure?",
      "Do I need lipid-lowering treatment?",
      "Should I get a cardiology review?",
    ],
  },
  {
    slug: "kidneys",
    path: "/organs/kidneys",
    title: "Kidneys",
    subtitle: "Nephropathy monitoring",
    badge: "KD",
    accent: "#2563eb",
    summary: "Focuses on filtration, albumin leakage, creatinine, and early nephropathy signals.",
    overview:
      "Diabetes can injure the kidney filters long before symptoms appear. Small changes in urine albumin, creatinine, or filtration rate often show up early and deserve regular follow-up.",
    keyPoints: [
      "eGFR and creatinine",
      "Urine albumin-to-creatinine ratio",
      "Blood pressure and hydration status",
    ],
    commonChecks: [
      "Urine albumin once or twice a year",
      "Serum creatinine and eGFR at routine visits",
      "Blood pressure review at every appointment",
    ],
    selfCare: [
      "Keep hydration steady unless told otherwise",
      "Avoid overusing painkillers",
      "Control glucose and blood pressure tightly",
    ],
    urgentSigns: [
      "Swelling in legs or around the eyes",
      "Foamy urine or reduced urination",
      "Sudden rise in blood pressure",
    ],
    doctorQuestions: [
      "How often should I check kidney labs?",
      "Do I need urine albumin testing?",
      "Are any medicines protecting my kidneys?",
    ],
  },
  {
    slug: "liver",
    path: "/organs/liver",
    title: "Liver",
    subtitle: "Fatty liver / metabolism",
    badge: "LV",
    accent: "#d97706",
    summary: "Looks for fatty liver risk, enzyme changes, and metabolic strain linked to insulin resistance.",
    overview:
      "The liver can accumulate fat in people with insulin resistance, which may progress quietly. Liver enzyme changes and imaging findings help identify risk early.",
    keyPoints: [
      "ALT / AST enzyme trends",
      "Fatty liver risk markers",
      "Triglyceride and weight changes",
    ],
    commonChecks: [
      "Liver enzymes in routine blood work",
      "Ultrasound if fatty liver is suspected",
      "Medication review if enzymes stay abnormal",
    ],
    selfCare: [
      "Limit sugary drinks and excess alcohol",
      "Work toward gradual weight reduction if needed",
      "Build a consistent activity routine",
    ],
    urgentSigns: [
      "Yellowing of the eyes or skin",
      "Right upper abdominal pain",
      "Persistent nausea or vomiting",
    ],
    doctorQuestions: [
      "Do my liver tests need follow-up?",
      "Could this be fatty liver disease?",
      "Should I review my medications?",
    ],
  },
  {
    slug: "pancreas",
    path: "/organs/pancreas",
    title: "Pancreas",
    subtitle: "Insulin and glucose control",
    badge: "PN",
    accent: "#7c3aed",
    summary: "Shows how well the body is producing insulin and how stable glucose control appears.",
    overview:
      "The pancreas is central to glucose regulation. In diabetes, pancreatic function and insulin demand can shift over time, so this organ view focuses on glycemic stability and treatment response.",
    keyPoints: [
      "HbA1c and fasting glucose",
      "Medication response",
      "Signs of insulin deficiency or resistance",
    ],
    commonChecks: [
      "HbA1c every 3 months when adjusting therapy",
      "Fasting and post-meal glucose logs",
      "Medication review if targets are not met",
    ],
    selfCare: [
      "Track glucose consistently",
      "Take medication at the same time each day",
      "Pair carbohydrates with protein and fiber",
    ],
    urgentSigns: [
      "Very high sugars that do not come down",
      "Confusion, vomiting, or dehydration",
      "Repeated low blood sugar episodes",
    ],
    doctorQuestions: [
      "Are my glucose targets realistic?",
      "Should my treatment plan change?",
      "Do I need help with glucose monitoring?",
    ],
  },
  {
    slug: "brain",
    path: "/organs/brain",
    title: "Brain",
    subtitle: "Neuropathy and stroke risk",
    badge: "BR",
    accent: "#0f766e",
    summary: "Highlights nerve symptoms, balance issues, and cerebrovascular risk signals.",
    overview:
      "Diabetes can affect nerves and blood vessels that supply the brain and the nervous system. This page focuses on numbness, balance changes, and stroke warning signs.",
    keyPoints: [
      "Numbness or tingling patterns",
      "Balance, dizziness, or weakness",
      "Stroke risk factors",
    ],
    commonChecks: [
      "Foot sensation and neuropathy screening",
      "Blood pressure and cholesterol control",
      "Prompt stroke evaluation if symptoms appear",
    ],
    selfCare: [
      "Report numbness or weakness early",
      "Stay hydrated and sleep regularly",
      "Keep up with vascular risk management",
    ],
    urgentSigns: [
      "Face drooping or arm weakness",
      "Speech difficulty",
      "Sudden severe headache or confusion",
    ],
    doctorQuestions: [
      "Are my symptoms neuropathy or something else?",
      "Do I need a stroke risk review?",
      "Should I be screened for nerve damage?",
    ],
  },
  {
    slug: "feet",
    path: "/organs/feet",
    title: "Feet",
    subtitle: "Diabetic foot / ulcers",
    badge: "FT",
    accent: "#ea580c",
    summary: "Covers circulation, pressure points, skin integrity, and ulcer risk.",
    overview:
      "Feet can show diabetic complications early through dryness, numbness, pressure damage, or ulcers. Regular inspection helps prevent infections and loss of mobility.",
    keyPoints: [
      "Skin breakdown or redness",
      "Sensation and circulation checks",
      "Pressure points and shoe fit",
    ],
    commonChecks: [
      "Daily self-checks for cuts or redness",
      "Foot exam at routine visits",
      "Sensation testing when neuropathy is suspected",
    ],
    selfCare: [
      "Inspect feet every day",
      "Wear well-fitting shoes and socks",
      "Keep skin clean and moisturized, not between toes",
    ],
    urgentSigns: [
      "Open sores or ulcers",
      "Spreading redness or swelling",
      "Black, blue, or cold toes",
    ],
    doctorQuestions: [
      "Do I need a foot protection plan?",
      "Are my shoes appropriate for my risk level?",
      "How often should my feet be examined?",
    ],
  },
  {
    slug: "skin",
    path: "/organs/skin",
    title: "Skin",
    subtitle: "Wounds, infections, and healing",
    badge: "SK",
    accent: "#db2777",
    summary: "Looks at healing speed, dryness, infection risk, and wound care.",
    overview:
      "High glucose can make skin infections and slow-healing wounds more likely. This card helps patients notice changes early, especially if there are cuts, itching, or recurring rashes.",
    keyPoints: [
      "Slow healing wounds",
      "Dry, cracked, or itchy skin",
      "Recurrent infections",
    ],
    commonChecks: [
      "Look for non-healing wounds or rashes",
      "Check skin after minor injuries",
      "Review glucose control if healing is slow",
    ],
    selfCare: [
      "Keep skin clean and dry",
      "Treat small cuts promptly",
      "Moisturize dry areas and avoid harsh soaps",
    ],
    urgentSigns: [
      "Rapidly spreading redness",
      "Pus, fever, or worsening pain",
      "Any wound that does not improve",
    ],
    doctorQuestions: [
      "Could this be a skin infection?",
      "Does my glucose control affect healing?",
      "Should I see dermatology or wound care?",
    ],
  },
  {
    slug: "eyes",
    path: "/organs/eyes",
    title: "Eyes",
    subtitle: "Cataract / glaucoma risk",
    badge: "EY",
    accent: "#0891b2",
    summary: "Covers cataract risk, glaucoma pressure changes, and vision symptoms outside retina screening.",
    overview:
      "Besides retina checks, diabetes can also affect the lens and eye pressure. Cataract and glaucoma concerns may show up as blurred vision, halos, or gradual vision loss.",
    keyPoints: [
      "Lens opacity or cataract risk",
      "Eye pressure / glaucoma concerns",
      "Blurred or fluctuating vision",
    ],
    commonChecks: [
      "Regular dilated eye exams",
      "Eye pressure checks when advised",
      "Vision screening if changes appear",
    ],
    selfCare: [
      "Do not ignore new vision changes",
      "Use prescribed eye drops consistently",
      "Book eye follow-up even if symptoms are mild",
    ],
    urgentSigns: [
      "Sudden vision loss",
      "Severe eye pain or halos",
      "New flashes, floaters, or curtain-like shadow",
    ],
    doctorQuestions: [
      "Do I need an ophthalmology review?",
      "Should my eye pressure be checked?",
      "Could my symptoms be cataract or glaucoma?",
    ],
  },
  {
    slug: "tongue",
    path: "/tongue",
    title: "Tongue",
    subtitle: "Oral tongue analysis",
    badge: "TG",
    accent: "#b91c1c",
    summary: "Upload a tongue image to generate a diabetic-risk prediction and Grad-CAM attention map.",
    overview:
      "This tongue analyzer uses your trained ResNet50 model with CLAHE preprocessing and Grad-CAM overlays to highlight the regions that influenced the prediction most.",
    keyPoints: [
      "Diabetic vs non-diabetic prediction",
      "CLAHE-normalized input",
      "Grad-CAM attention overlay",
    ],
    commonChecks: [
      "Tongue color and coating",
      "Moisture and surface texture",
      "Attention regions from Grad-CAM",
    ],
    selfCare: [
      "Use a clear, well-lit tongue photo",
      "Keep the camera steady and centered",
      "Retake the image if lighting is poor",
    ],
    urgentSigns: [
      "Sudden painful swelling",
      "Bleeding or ulcer that does not heal",
      "Rapidly worsening coating or discoloration",
    ],
    doctorQuestions: [
      "What does the heatmap mean?",
      "Does this look more diabetic or non-diabetic?",
      "Should I repeat the tongue image later?",
    ],
  },
];

export function getOrganBySlug(slug: string) {
  return organCatalog.find((organ) => organ.slug === slug);
}
