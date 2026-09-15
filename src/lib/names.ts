/**
 * Script-correct synthetic names.
 *
 * A worker from Ganjam reads Odia, not Devanagari. Rendering their name in the
 * wrong script would quietly contradict the entire premise of the system, so
 * names are generated per script rather than transliterated after the fact.
 *
 * Latin and local forms are paired, so a worker's name is internally
 * consistent wherever it is displayed.
 */

export type NamePair = readonly [latin: string, local: string];
export type Script = "deva" | "odia" | "bengali" | "assamese";

export const SCRIPT_BY_LANGUAGE: Record<string, Script> = {
  hi: "deva",
  or: "odia",
  bn: "bengali",
  as: "assamese",
};

export const FIRST_NAMES: Record<Script, { m: NamePair[]; f: NamePair[] }> = {
  deva: {
    m: [
      ["Ramesh", "रमेश"], ["Suresh", "सुरेश"], ["Dinesh", "दिनेश"], ["Mukesh", "मुकेश"],
      ["Rajesh", "राजेश"], ["Santosh", "संतोष"], ["Manoj", "मनोज"], ["Sanjay", "संजय"],
      ["Vijay", "विजय"], ["Ajay", "अजय"], ["Arun", "अरुण"], ["Dilip", "दिलीप"],
      ["Mahesh", "महेश"], ["Naresh", "नरेश"], ["Pankaj", "पंकज"], ["Shyam", "श्याम"],
      ["Umesh", "उमेश"], ["Vikas", "विकास"], ["Sunil", "सुनील"], ["Anil", "अनिल"],
      ["Gopal", "गोपाल"], ["Kishan", "किशन"], ["Vinod", "विनोद"], ["Sushil", "सुशील"],
    ],
    f: [
      ["Sunita", "सुनीता"], ["Anita", "अनीता"], ["Kavita", "कविता"], ["Savita", "सविता"],
      ["Rekha", "रेखा"], ["Meena", "मीना"], ["Geeta", "गीता"], ["Sita", "सीता"],
      ["Radha", "राधा"], ["Laxmi", "लक्ष्मी"], ["Pooja", "पूजा"], ["Shanti", "शांति"],
      ["Urmila", "उर्मिला"], ["Kamla", "कमला"], ["Nirmala", "निर्मला"], ["Parvati", "पार्वती"],
    ],
  },
  odia: {
    m: [
      ["Ramesh", "ରମେଶ"], ["Suresh", "ସୁରେଶ"], ["Dinesh", "ଦିନେଶ"], ["Rajesh", "ରାଜେଶ"],
      ["Santosh", "ସନ୍ତୋଷ"], ["Manoj", "ମନୋଜ"], ["Sanjay", "ସଞ୍ଜୟ"], ["Bijay", "ବିଜୟ"],
      ["Ajay", "ଅଜୟ"], ["Arun", "ଅରୁଣ"], ["Gopal", "ଗୋପାଳ"], ["Sunil", "ସୁନୀଲ"],
      ["Anil", "ଅନିଲ"], ["Kishan", "କିଶନ"], ["Prasant", "ପ୍ରଶାନ୍ତ"], ["Bikash", "ବିକାଶ"],
    ],
    f: [
      ["Sunita", "ସୁନୀତା"], ["Anita", "ଅନିତା"], ["Kabita", "କବିତା"], ["Rekha", "ରେଖା"],
      ["Geeta", "ଗୀତା"], ["Sita", "ସୀତା"], ["Radha", "ରାଧା"], ["Laxmi", "ଲକ୍ଷ୍ମୀ"],
      ["Sabitri", "ସାବିତ୍ରୀ"], ["Basanti", "ବାସନ୍ତୀ"], ["Mamata", "ମମତା"], ["Sasmita", "ଶସ୍ମିତା"],
    ],
  },
  bengali: {
    m: [
      ["Ramesh", "রমেশ"], ["Sunil", "সুনীল"], ["Dilip", "দিলীপ"], ["Bablu", "বাবলু"],
      ["Sanjay", "সঞ্জয়"], ["Gopal", "গোপাল"], ["Anil", "অনিল"], ["Arun", "অরুণ"],
      ["Sujit", "সুজিত"], ["Pradip", "প্রদীপ"], ["Tapan", "তপন"], ["Nitai", "নিতাই"],
    ],
    f: [
      ["Rekha", "রেখা"], ["Anita", "অনিতা"], ["Geeta", "গীতা"], ["Laxmi", "লক্ষ্মী"],
      ["Sita", "সীতা"], ["Mamata", "মমতা"], ["Shefali", "শেফালী"], ["Aparna", "অপর্ণা"],
    ],
  },
  assamese: {
    m: [
      ["Ramesh", "ৰমেশ"], ["Arun", "অৰুণ"], ["Dilip", "দিলীপ"], ["Biren", "বিৰেন"],
      ["Jiten", "জিতেন"], ["Nipen", "নিপেন"], ["Anil", "অনিল"], ["Gopal", "গোপাল"],
    ],
    f: [
      ["Rekha", "ৰেখা"], ["Anita", "অনিতা"], ["Geeta", "গীতা"], ["Mina", "মিনা"],
      ["Jonali", "জোনালী"], ["Nitu", "নীতু"],
    ],
  },
};

/** Surnames, written in the script of the state they belong to. */
export const SURNAMES: Record<string, NamePair[]> = {
  Bihar: [
    ["Yadav", "यादव"], ["Kumar", "कुमार"], ["Paswan", "पासवान"], ["Sahni", "साहनी"],
    ["Mandal", "मंडल"], ["Ram", "राम"], ["Thakur", "ठाकुर"], ["Singh", "सिंह"],
    ["Mahto", "महतो"], ["Rai", "राय"],
  ],
  "Uttar Pradesh": [
    ["Yadav", "यादव"], ["Kumar", "कुमार"], ["Nishad", "निषाद"], ["Verma", "वर्मा"],
    ["Pal", "पाल"], ["Maurya", "मौर्य"], ["Chauhan", "चौहान"], ["Prajapati", "प्रजापति"],
    ["Rajbhar", "राजभर"], ["Singh", "सिंह"],
  ],
  Odisha: [
    ["Behera", "ବେହେରା"], ["Nayak", "ନାୟକ"], ["Sahu", "ସାହୁ"], ["Pradhan", "ପ୍ରଧାନ"],
    ["Jena", "ଜେନା"], ["Barik", "ବାରିକ"], ["Malik", "ମଲିକ"], ["Rout", "ରାଉତ"],
    ["Swain", "ସ୍ୱାଇଁ"], ["Majhi", "ମାଝୀ"],
  ],
  "West Bengal": [
    ["Mondal", "মণ্ডল"], ["Sheikh", "শেখ"], ["Das", "দাস"], ["Roy", "রায়"],
    ["Sarkar", "সরকার"], ["Mahato", "মাহাতো"], ["Ghosh", "ঘোষ"], ["Biswas", "বিশ্বাস"],
    ["Murmu", "মুর্মু"], ["Hembram", "হেমব্রম"],
  ],
  Assam: [
    ["Ali", "আলি"], ["Ahmed", "আহমেদ"], ["Das", "দাস"], ["Nath", "নাথ"],
    ["Bora", "বৰা"], ["Deka", "ডেকা"], ["Boro", "বড়ো"], ["Rabha", "ৰাভা"],
  ],
  Jharkhand: [
    ["Murmu", "मुर्मू"], ["Hembram", "हेम्ब्रम"], ["Soren", "सोरेन"], ["Mahto", "महतो"],
    ["Oraon", "उरांव"], ["Kumar", "कुमार"], ["Munda", "मुंडा"], ["Tudu", "टुडू"],
  ],
  Rajasthan: [
    ["Meena", "मीणा"], ["Damor", "डामोर"], ["Bhil", "भील"], ["Garasiya", "गरासिया"],
    ["Ninama", "निनामा"], ["Katara", "कटारा"], ["Parmar", "परमार"], ["Bamniya", "बामनिया"],
  ],
  "Madhya Pradesh": [
    ["Ahirwar", "अहिरवार"], ["Yadav", "यादव"], ["Rajak", "रजक"], ["Kushwaha", "कुशवाहा"],
    ["Lodhi", "लोधी"], ["Vishwakarma", "विश्वकर्मा"], ["Patel", "पटेल"], ["Gond", "गोंड"],
  ],
  Chhattisgarh: [
    ["Sahu", "साहू"], ["Yadav", "यादव"], ["Nishad", "निषाद"], ["Patel", "पटेल"],
    ["Dhruw", "ध्रुव"], ["Netam", "नेताम"], ["Kashyap", "कश्यप"], ["Baghel", "बघेल"],
  ],
};

/** Builds a name whose Latin and local forms agree, in the correct script. */
export function makeName(
  state: string,
  language: string,
  isFemale: boolean,
  choose: <T>(xs: readonly T[]) => T,
): { latin: string; local: string | null } {
  const script = SCRIPT_BY_LANGUAGE[language] ?? "deva";
  const pool = FIRST_NAMES[script];
  const [firstLatin, firstLocal] = choose(isFemale ? pool.f : pool.m);
  const surnames = SURNAMES[state];
  if (!surnames) return { latin: `${firstLatin} Kumar`, local: null };
  const [surLatin, surLocal] = choose(surnames);
  return {
    latin: `${firstLatin} ${surLatin}`,
    local: `${firstLocal} ${surLocal}`,
  };
}
