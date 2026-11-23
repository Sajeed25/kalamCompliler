import type { Example } from "./types";

export const CPP_EXAMPLES: Example[] = [
  // ------------------------------------------------------------ Level 1
  {
    id: "hello",
    level: 1,
    title: { en: "Hello World", te: "హలో వరల్డ్", hi: "हैलो वर्ल्ड", ur: "ہیلو ورلڈ" },
    about: { en: "Your first C++ program.", te: "మీ మొదటి C++ ప్రోగ్రామ్.", hi: "आपका पहला C++ प्रोग्राम।", ur: "آپ کا پہلا C++‎ پروگرام۔" },
    code: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    cout << "I am learning C++ 🚀" << endl;
    return 0;
}
`,
  },
  {
    id: "name_age",
    level: 1,
    input: true,
    title: { en: "My name and age", te: "నా పేరు, వయస్సు", hi: "मेरा नाम और उम्र", ur: "میرا نام اور عمر" },
    about: { en: "Read with cin, print with cout.", te: "cin తో చదవండి, cout తో చూపండి.", hi: "cin से पढ़ो, cout से छापो।", ur: "cin سے پڑھیں، cout سے لکھیں۔" },
    code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    int age;
    cout << "What is your name? ";
    cin >> name;
    cout << "How old are you? ";
    cin >> age;
    cout << "Hello, " << name << "!" << endl;
    cout << "Next year you will be " << age + 1 << " 🎂" << endl;
    return 0;
}
`,
  },
  {
    id: "maths",
    level: 1,
    title: { en: "Maths magic", te: "లెక్కల మ్యాజిక్", hi: "गणित का जादू", ur: "حساب کا جادو" },
    about: { en: "Add, subtract, multiply and divide.", te: "కూడిక, తీసివేత, గుణకారం, భాగహారం.", hi: "जोड़, घटाव, गुणा और भाग।", ur: "جمع، تفریق، ضرب اور تقسیم۔" },
    code: `#include <iostream>
using namespace std;

int main() {
    int a = 12, b = 5;
    cout << "a + b = " << a + b << endl;
    cout << "a - b = " << a - b << endl;
    cout << "a * b = " << a * b << endl;
    cout << "a / b = " << a / b << " (whole number)" << endl;
    cout << "a / b = " << (double)a / b << " (with decimals)" << endl;
    cout << "a % b = " << a % b << " (remainder)" << endl;
    return 0;
}
`,
  },
  {
    id: "sum_two",
    level: 1,
    input: true,
    title: { en: "Add two numbers", te: "రెండు సంఖ్యలు కూడండి", hi: "दो संख्याएँ जोड़ो", ur: "دو نمبر جمع کریں" },
    about: { en: "Type two numbers, get their sum.", te: "రెండు సంఖ్యలు టైప్ చేసి మొత్తం పొందండి.", hi: "दो संख्याएँ लिखो, योग पाओ।", ur: "دو نمبر لکھیں، ان کا مجموعہ پائیں۔" },
    code: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cout << "First number: ";
    cin >> a;
    cout << "Second number: ";
    cin >> b;
    cout << a << " + " << b << " = " << a + b << endl;
    return 0;
}
`,
  },
  {
    id: "repeat_hello",
    level: 1,
    title: { en: "Say it 5 times", te: "5 సార్లు చెప్పు", hi: "5 बार बोलो", ur: "5 بار کہیں" },
    about: { en: "A for loop repeats things.", te: "for లూప్ పనిని మళ్ళీ చేస్తుంది.", hi: "for लूप काम दोहराता है।", ur: "for لوپ کام دہراتا ہے۔" },
    code: `#include <iostream>
using namespace std;

int main() {
    for (int i = 1; i <= 5; i++) {
        cout << i << " I love coding! ⭐" << endl;
    }
    return 0;
}
`,
  },
  // ------------------------------------------------------------ Level 2
  {
    id: "even_odd",
    level: 2,
    input: true,
    title: { en: "Even or odd?", te: "సరి సంఖ్యా? బేసి సంఖ్యా?", hi: "सम या विषम?", ur: "جفت یا طاق؟" },
    about: { en: "Use if/else and %.", te: "if/else మరియు % వాడండి.", hi: "if/else और % का उपयोग।", ur: "if/else اور % استعمال کریں۔" },
    code: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Type a number: ";
    cin >> n;
    if (n % 2 == 0)
        cout << n << " is EVEN" << endl;
    else
        cout << n << " is ODD" << endl;
    return 0;
}
`,
  },
  {
    id: "calculator",
    level: 2,
    input: true,
    title: { en: "Simple calculator", te: "సాధారణ కాలిక్యులేటర్", hi: "सरल कैलकुलेटर", ur: "سادہ کیلکولیٹر" },
    about: { en: "A calculator using switch.", te: "switch తో కాలిక్యులేటర్.", hi: "switch वाला कैलकुलेटर।", ur: "switch والا کیلکولیٹر۔" },
    code: `#include <iostream>
using namespace std;

int main() {
    double a, b;
    char op;
    cout << "First number: ";
    cin >> a;
    cout << "Choose + - * / : ";
    cin >> op;
    cout << "Second number: ";
    cin >> b;

    switch (op) {
        case '+': cout << "Answer: " << a + b << endl; break;
        case '-': cout << "Answer: " << a - b << endl; break;
        case '*': cout << "Answer: " << a * b << endl; break;
        case '/':
            if (b == 0) cout << "Cannot divide by zero!" << endl;
            else cout << "Answer: " << a / b << endl;
            break;
        default: cout << "Unknown sign" << endl;
    }
    return 0;
}
`,
  },
  {
    id: "table",
    level: 2,
    input: true,
    title: { en: "Multiplication table", te: "ఎక్కాల పట్టిక", hi: "पहाड़ा (गुणा तालिका)", ur: "پہاڑا" },
    about: { en: "Print the table of any number.", te: "ఏ సంఖ్య ఎక్కమైనా ముద్రించండి.", hi: "किसी भी संख्या का पहाड़ा छापो।", ur: "کسی بھی نمبر کا پہاڑا لکھیں۔" },
    code: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Which table? ";
    cin >> n;
    for (int i = 1; i <= 10; i++)
        cout << n << " x " << i << " = " << n * i << endl;
    return 0;
}
`,
  },
  {
    id: "temperature",
    level: 2,
    input: true,
    title: { en: "Temperature converter", te: "ఉష్ణోగ్రత మార్పిడి", hi: "तापमान बदलने वाला", ur: "درجۂ حرارت بدلنے والا" },
    about: { en: "Celsius to Fahrenheit.", te: "సెల్సియస్ నుండి ఫారెన్‌హీట్.", hi: "सेल्सियस से फ़ारेनहाइट।", ur: "سیلسیس سے فارن ہائیٹ۔" },
    code: `#include <iostream>
#include <iomanip>
using namespace std;

int main() {
    double c;
    cout << "Temperature in C: ";
    cin >> c;
    double f = c * 9 / 5 + 32;
    cout << fixed << setprecision(1);
    cout << c << " C = " << f << " F" << endl;
    return 0;
}
`,
  },
  {
    id: "stars",
    level: 2,
    title: { en: "Star patterns", te: "నక్షత్రాల నమూనాలు", hi: "तारों के पैटर्न", ur: "ستاروں کے نمونے" },
    about: { en: "Nested loops make shapes.", te: "లూప్ లోపల లూప్‌తో ఆకారాలు.", hi: "लूप के अंदर लूप से आकार।", ur: "لوپ کے اندر لوپ سے شکلیں۔" },
    code: `#include <iostream>
using namespace std;

int main() {
    int rows = 5;
    for (int i = 1; i <= rows; i++) {
        cout << string(rows - i, ' ');
        for (int j = 1; j <= i; j++) cout << "* ";
        cout << endl;
    }
    return 0;
}
`,
  },
  {
    id: "guess",
    level: 2,
    input: true,
    title: { en: "Guess the number game", te: "సంఖ్య ఊహించే ఆట", hi: "संख्या बूझो खेल", ur: "نمبر بوجھو کھیل" },
    about: { en: "Random numbers and a while loop.", te: "యాదృచ్ఛిక సంఖ్యలు, while లూప్.", hi: "रैंडम संख्या और while लूप।", ur: "بے ترتیب نمبر اور while لوپ۔" },
    code: `#include <iostream>
#include <cstdlib>
#include <ctime>
using namespace std;

int main() {
    srand(time(0));
    int secret = rand() % 20 + 1;
    int guess = 0, tries = 0;
    cout << "I am thinking of a number from 1 to 20" << endl;

    while (guess != secret) {
        cout << "Your guess: ";
        cin >> guess;
        tries++;
        if (guess < secret) cout << "Too small" << endl;
        else if (guess > secret) cout << "Too big" << endl;
    }
    cout << "You got it in " << tries << " tries!" << endl;
    return 0;
}
`,
  },
  {
    id: "largest",
    level: 2,
    input: true,
    title: { en: "Largest of three", te: "మూడింటిలో పెద్దది", hi: "तीन में सबसे बड़ा", ur: "تین میں سب سے بڑا" },
    about: { en: "Use the max() function.", te: "max() ఫంక్షన్ వాడండి.", hi: "max() फ़ंक्शन का उपयोग।", ur: "max()‎ فنکشن استعمال کریں۔" },
    code: `#include <iostream>
#include <algorithm>
using namespace std;

int main() {
    int a, b, c;
    cout << "Enter three numbers: ";
    cin >> a >> b >> c;
    cout << "The largest is " << max({a, b, c}) << endl;
    return 0;
}
`,
  },
  // ------------------------------------------------------------ Level 3
  {
    id: "factorial",
    level: 3,
    input: true,
    title: { en: "Factorial with recursion", te: "రికర్షన్‌తో ఫాక్టోరియల్", hi: "रिकर्शन से फ़ैक्टोरियल", ur: "ریکرژن سے فیکٹوریل" },
    about: { en: "A function that calls itself.", te: "తనను తానే పిలిచే ఫంక్షన్.", hi: "ख़ुद को बुलाने वाला फ़ंक्शन।", ur: "خود کو بلانے والا فنکشن۔" },
    code: `#include <iostream>
using namespace std;

long long factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    int n;
    cout << "Enter a number (0-20): ";
    cin >> n;
    if (n < 0 || n > 20) {
        cout << "Please use 0 to 20" << endl;
        return 0;
    }
    cout << n << "! = " << factorial(n) << endl;
    return 0;
}
`,
  },
  {
    id: "prime",
    level: 3,
    input: true,
    title: { en: "Prime number checker", te: "ప్రధాన సంఖ్య పరీక్ష", hi: "अभाज्य संख्या जाँच", ur: "مفرد عدد کی جانچ" },
    about: { en: "A bool function and loops.", te: "bool ఫంక్షన్, లూప్‌లు.", hi: "bool फ़ंक्शन और लूप।", ur: "bool فنکشن اور لوپ۔" },
    code: `#include <iostream>
using namespace std;

bool isPrime(int n) {
    if (n < 2) return false;
    for (int i = 2; i * i <= n; i++)
        if (n % i == 0) return false;
    return true;
}

int main() {
    int n;
    cout << "Enter a number: ";
    cin >> n;
    cout << n << (isPrime(n) ? " is prime" : " is not prime") << endl;

    cout << "Primes up to 50: ";
    for (int i = 2; i <= 50; i++)
        if (isPrime(i)) cout << i << " ";
    cout << endl;
    return 0;
}
`,
  },
  {
    id: "vector_marks",
    level: 3,
    input: true,
    title: { en: "Marks with a vector", te: "vector తో మార్కులు", hi: "vector से अंक", ur: "vector سے نمبر" },
    about: { en: "A growing list of numbers.", te: "పెరుగుతూ ఉండే సంఖ్యల జాబితా.", hi: "बढ़ने वाली संख्याओं की सूची।", ur: "بڑھنے والی نمبروں کی فہرست۔" },
    code: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    vector<string> subjects = {"Maths", "Science", "English"};
    vector<int> marks;

    for (string s : subjects) {
        int m;
        cout << "Marks in " << s << ": ";
        cin >> m;
        marks.push_back(m);
    }

    int total = 0;
    for (int m : marks) total += m;
    double average = (double)total / marks.size();
    cout << "Total: " << total << endl;
    cout << "Average: " << average << endl;
    cout << (average >= 75 ? "Great work! 🌟" : "Keep practising 💪") << endl;
    return 0;
}
`,
  },
  {
    id: "fibonacci",
    level: 3,
    title: { en: "Fibonacci numbers", te: "ఫిబొనాచ్చి సంఖ్యలు", hi: "फ़िबोनाची संख्याएँ", ur: "فبوناچی نمبر" },
    about: { en: "Each number is the sum of the two before it.", te: "ప్రతి సంఖ్య ముందు రెండింటి మొత్తం.", hi: "हर संख्या पिछली दो का योग है।", ur: "ہر نمبر پچھلے دو کا مجموعہ ہے۔" },
    code: `#include <iostream>
using namespace std;

int main() {
    long long a = 0, b = 1;
    for (int i = 0; i < 15; i++) {
        cout << a << " ";
        long long next = a + b;
        a = b;
        b = next;
    }
    cout << endl;
    return 0;
}
`,
  },
  {
    id: "string_fun",
    level: 3,
    input: true,
    title: { en: "Fun with words", te: "పదాలతో ఆట", hi: "शब्दों से खेल", ur: "الفاظ کا کھیل" },
    about: { en: "Count letters and reverse a word.", te: "అక్షరాలు లెక్కించి, పదం తిప్పండి.", hi: "अक्षर गिनो और शब्द उलटो।", ur: "حروف گنیں اور لفظ الٹیں۔" },
    code: `#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    string word;
    cout << "Type a word: ";
    cin >> word;

    string backwards = word;
    reverse(backwards.begin(), backwards.end());

    int vowels = 0;
    for (char ch : word) {
        char c = tolower(ch);
        if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') vowels++;
    }

    cout << "Letters: " << word.length() << endl;
    cout << "Vowels: " << vowels << endl;
    cout << "Backwards: " << backwards << endl;
    if (word == backwards) cout << "It's a palindrome!" << endl;
    return 0;
}
`,
  },
  {
    id: "robot_class",
    level: 3,
    title: { en: "Robot class", te: "రోబో క్లాస్", hi: "रोबोट क्लास", ur: "روبوٹ کلاس" },
    about: { en: "Make your own type with a class.", te: "క్లాస్‌తో మీ సొంత రకం చేయండి.", hi: "क्लास से अपना टाइप बनाओ।", ur: "کلاس سے اپنی قسم بنائیں۔" },
    code: `#include <iostream>
#include <string>
using namespace std;

class Robot {
public:
    string name;
    int x = 0, y = 0;

    Robot(string n) { name = n; }

    void move(char dir, int steps) {
        if (dir == 'N') y += steps;
        if (dir == 'S') y -= steps;
        if (dir == 'E') x += steps;
        if (dir == 'W') x -= steps;
        cout << name << " moved " << dir << " " << steps
             << " -> (" << x << ", " << y << ")" << endl;
    }
};

int main() {
    Robot r("Kalam-Bot");
    r.move('N', 3);
    r.move('E', 2);
    r.move('S', 1);
    return 0;
}
`,
  },
];
