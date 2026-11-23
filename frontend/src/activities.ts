import type { LangId } from "./languages";
import type { Localized } from "./examples/types";

/**
 * Activities on the home page: a ready-made program plus a small challenge to try.
 * Each one opens an example from src/examples (by id) — add an activity by adding an
 * object here that points at an existing example.
 */
export interface Activity {
  id: string;
  emoji: string;
  lang: LangId;
  exampleId: string;
  level: 1 | 2 | 3;
  title: Localized;
  challenge: Localized;
}

export const ACTIVITIES: Activity[] = [
  {
    id: "turtle-star",
    emoji: "🐢",
    lang: "python",
    exampleId: "turtle_star",
    level: 1,
    title: { en: "Draw a golden star", te: "బంగారు నక్షత్రం గీయండి", hi: "सुनहरा तारा बनाओ" },
    challenge: {
      en: 'Change "gold" to "skyblue". Can you make the star bigger?',
      te: '"gold" ను "skyblue" గా మార్చండి. నక్షత్రాన్ని పెద్దది చేయగలరా?',
      hi: '"gold" को "skyblue" में बदलो। क्या तुम तारे को बड़ा बना सकते हो?',
    },
  },
  {
    id: "turtle-flower",
    emoji: "🌸",
    lang: "python",
    exampleId: "turtle_flower",
    level: 2,
    title: { en: "Colour flower", te: "రంగుల పువ్వు", hi: "रंगीन फूल" },
    challenge: {
      en: 'Add "pink" to the colours list. How does the flower change?',
      te: 'రంగుల జాబితాలో "pink" చేర్చండి. పువ్వు ఎలా మారుతుంది?',
      hi: 'रंगों की लिस्ट में "pink" जोड़ो। फूल कैसे बदलता है?',
    },
  },
  {
    id: "guess-game",
    emoji: "🎮",
    lang: "python",
    exampleId: "guess",
    level: 2,
    title: { en: "Make a guessing game", te: "ఊహించే ఆట చేయండి", hi: "बूझने वाला खेल बनाओ" },
    challenge: {
      en: "Make it harder: pick a secret number from 1 to 100.",
      te: "కష్టతరం చేయండి: 1 నుండి 100 వరకు రహస్య సంఖ్య ఎంచుకోండి.",
      hi: "इसे मुश्किल बनाओ: 1 से 100 तक गुप्त संख्या चुनो।",
    },
  },
  {
    id: "star-patterns",
    emoji: "⭐",
    lang: "python",
    exampleId: "stars",
    level: 2,
    title: { en: "Star patterns", te: "నక్షత్రాల నమూనాలు", hi: "तारों के पैटर्न" },
    challenge: {
      en: "Make the pyramid 8 rows tall.",
      te: "పిరమిడ్‌ను 8 వరుసల ఎత్తు చేయండి.",
      hi: "पिरामिड को 8 पंक्तियों जितना ऊँचा बनाओ।",
    },
  },
  {
    id: "countdown",
    emoji: "🚀",
    lang: "python",
    exampleId: "countdown",
    level: 2,
    title: { en: "Rocket launch", te: "రాకెట్ ప్రయోగం", hi: "रॉकेट लॉन्च" },
    challenge: {
      en: "Count down from 20, and print 🌍 after lift off.",
      te: "20 నుండి లెక్కించి, ప్రయోగం తర్వాత 🌍 ముద్రించండి.",
      hi: "20 से उलटी गिनती करो, और लॉन्च के बाद 🌍 छापो।",
    },
  },
  {
    id: "times-table",
    emoji: "✖️",
    lang: "c",
    exampleId: "table",
    level: 2,
    title: { en: "Times tables in C", te: "C లో ఎక్కాలు", hi: "C में पहाड़े" },
    challenge: {
      en: "Print the table up to × 20 instead of × 10.",
      te: "× 10 కాకుండా × 20 వరకు ఎక్కం ముద్రించండి.",
      hi: "× 10 की जगह × 20 तक पहाड़ा छापो।",
    },
  },
  {
    id: "robot-grid",
    emoji: "🤖",
    lang: "c",
    exampleId: "robot_path",
    level: 3,
    title: { en: "Drive a robot", te: "రోబోను నడపండి", hi: "रोबोट चलाओ" },
    challenge: {
      en: "Change the moves so the robot reaches the bottom-right corner.",
      te: "రోబో కుడి కింది మూలకు చేరేలా కదలికలను మార్చండి.",
      hi: "चालें बदलो ताकि रोबोट नीचे दाएँ कोने तक पहुँचे।",
    },
  },
  {
    id: "calculator",
    emoji: "🧮",
    lang: "cpp",
    exampleId: "calculator",
    level: 2,
    title: { en: "Build a calculator", te: "కాలిక్యులేటర్ తయారు చేయండి", hi: "कैलकुलेटर बनाओ" },
    challenge: {
      en: "Add a new sign: ^ to multiply a number by itself.",
      te: "కొత్త గుర్తు చేర్చండి: ఒక సంఖ్యను దానితోనే గుణించడానికి ^.",
      hi: "नया चिह्न जोड़ो: किसी संख्या को खुद से गुणा करने के लिए ^।",
    },
  },
];

export function findActivity(id: string | null | undefined): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id);
}
