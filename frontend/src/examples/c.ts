import type { Example } from "./types";

export const C_EXAMPLES: Example[] = [
  // ------------------------------------------------------------ Level 1
  {
    id: "hello",
    level: 1,
    title: { en: "Hello World", te: "హలో వరల్డ్", hi: "हैलो वर्ल्ड", ur: "ہیلو ورلڈ" },
    about: { en: "Your first C program.", te: "మీ మొదటి C ప్రోగ్రామ్.", hi: "आपका पहला C प्रोग्राम।", ur: "آپ کا پہلا C پروگرام۔" },
    code: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    printf("I am learning C 🔧\\n");
    return 0;
}
`,
  },
  {
    id: "name_age",
    level: 1,
    input: true,
    title: { en: "My name and age", te: "నా పేరు, వయస్సు", hi: "मेरा नाम और उम्र", ur: "میرا نام اور عمر" },
    about: { en: "Read your name and age with scanf.", te: "scanf తో పేరు, వయస్సు చదవండి.", hi: "scanf से नाम और उम्र पढ़ो।", ur: "scanf سے نام اور عمر پڑھیں۔" },
    code: `#include <stdio.h>

int main() {
    char name[50];
    int age;

    printf("What is your name? ");
    scanf("%49s", name);
    printf("How old are you? ");
    scanf("%d", &age);   /* & means "put the answer in age" */

    printf("Hello, %s!\\n", name);
    printf("Next year you will be %d 🎂\\n", age + 1);
    return 0;
}
`,
  },
  {
    id: "maths",
    level: 1,
    title: { en: "Maths magic", te: "లెక్కల మ్యాజిక్", hi: "गणित का जादू", ur: "حساب کا جادو" },
    about: { en: "Add, subtract, multiply and divide.", te: "కూడిక, తీసివేత, గుణకారం, భాగహారం.", hi: "जोड़, घटाव, गुणा और भाग।", ur: "جمع، تفریق، ضرب اور تقسیم۔" },
    code: `#include <stdio.h>

int main() {
    int a = 12, b = 5;
    printf("a + b = %d\\n", a + b);
    printf("a - b = %d\\n", a - b);
    printf("a * b = %d\\n", a * b);
    printf("a / b = %d  (whole number)\\n", a / b);
    printf("a / b = %.2f (with decimals)\\n", (float)a / b);
    printf("a %% b = %d  (remainder)\\n", a % b);
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
    code: `#include <stdio.h>

int main() {
    int a, b;
    printf("First number: ");
    scanf("%d", &a);
    printf("Second number: ");
    scanf("%d", &b);
    printf("%d + %d = %d\\n", a, b, a + b);
    return 0;
}
`,
  },
  {
    id: "repeat_hello",
    level: 1,
    title: { en: "Say it 5 times", te: "5 సార్లు చెప్పు", hi: "5 बार बोलो", ur: "5 بار کہیں" },
    about: { en: "A for loop repeats things.", te: "for లూప్ పనిని మళ్ళీ చేస్తుంది.", hi: "for लूप काम दोहराता है।", ur: "for لوپ کام دہراتا ہے۔" },
    code: `#include <stdio.h>

int main() {
    for (int i = 1; i <= 5; i++) {
        printf("%d I love coding! ⭐\\n", i);
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
    code: `#include <stdio.h>

int main() {
    int n;
    printf("Type a number: ");
    scanf("%d", &n);

    if (n % 2 == 0) {
        printf("%d is EVEN\\n", n);
    } else {
        printf("%d is ODD\\n", n);
    }
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
    code: `#include <stdio.h>

int main() {
    double a, b;
    char op;

    printf("First number: ");
    scanf("%lf", &a);
    printf("Choose + - * / : ");
    scanf(" %c", &op);
    printf("Second number: ");
    scanf("%lf", &b);

    switch (op) {
        case '+': printf("Answer: %g\\n", a + b); break;
        case '-': printf("Answer: %g\\n", a - b); break;
        case '*': printf("Answer: %g\\n", a * b); break;
        case '/':
            if (b == 0) printf("Cannot divide by zero!\\n");
            else printf("Answer: %g\\n", a / b);
            break;
        default: printf("Unknown sign\\n");
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
    code: `#include <stdio.h>

int main() {
    int n;
    printf("Which table? ");
    scanf("%d", &n);
    for (int i = 1; i <= 10; i++) {
        printf("%d x %d = %d\\n", n, i, n * i);
    }
    return 0;
}
`,
  },
  {
    id: "temperature",
    level: 2,
    input: true,
    title: { en: "Temperature converter", te: "ఉష్ణోగ్రత మార్పిడి", hi: "तापमान बदलने वाला", ur: "درجۂ حرارت بدلنے والا" },
    about: { en: "Celsius to Fahrenheit with float.", te: "float తో సెల్సియస్ నుండి ఫారెన్‌హీట్.", hi: "float से सेल्सियस को फ़ारेनहाइट।", ur: "float سے سیلسیس کو فارن ہائیٹ میں۔" },
    code: `#include <stdio.h>

int main() {
    float c;
    printf("Temperature in C: ");
    scanf("%f", &c);
    float f = c * 9 / 5 + 32;
    printf("%.1f C = %.1f F\\n", c, f);
    return 0;
}
`,
  },
  {
    id: "stars",
    level: 2,
    title: { en: "Star patterns", te: "నక్షత్రాల నమూనాలు", hi: "तारों के पैटर्न", ur: "ستاروں کے نمونے" },
    about: { en: "Nested loops make shapes.", te: "లూప్ లోపల లూప్‌తో ఆకారాలు.", hi: "लूप के अंदर लूप से आकार।", ur: "لوپ کے اندر لوپ سے شکلیں۔" },
    code: `#include <stdio.h>

int main() {
    int rows = 5;
    for (int i = 1; i <= rows; i++) {
        for (int s = 0; s < rows - i; s++) printf(" ");
        for (int j = 1; j <= i; j++) printf("* ");
        printf("\\n");
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
    code: `#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int main() {
    srand(time(NULL));
    int secret = rand() % 20 + 1;
    int guess = 0, tries = 0;
    printf("I am thinking of a number from 1 to 20\\n");

    while (guess != secret) {
        printf("Your guess: ");
        scanf("%d", &guess);
        tries++;
        if (guess < secret) printf("Too small\\n");
        else if (guess > secret) printf("Too big\\n");
    }
    printf("You got it in %d tries!\\n", tries);
    return 0;
}
`,
  },
  {
    id: "largest",
    level: 2,
    input: true,
    title: { en: "Largest of three", te: "మూడింటిలో పెద్దది", hi: "तीन में सबसे बड़ा", ur: "تین میں سب سے بڑا" },
    about: { en: "Compare numbers with && and if.", te: "&& మరియు if తో పోల్చండి.", hi: "&& और if से तुलना करो।", ur: "&& اور if سے نمبروں کا مقابلہ۔" },
    code: `#include <stdio.h>

int main() {
    int a, b, c;
    printf("Enter three numbers: ");
    scanf("%d %d %d", &a, &b, &c);

    int big = a;
    if (b > big) big = b;
    if (c > big) big = c;
    printf("The largest is %d\\n", big);
    return 0;
}
`,
  },
  // ------------------------------------------------------------ Level 3
  {
    id: "factorial",
    level: 3,
    input: true,
    title: { en: "Factorial with a function", te: "ఫంక్షన్‌తో ఫాక్టోరియల్", hi: "फ़ंक्शन से फ़ैक्टोरियल", ur: "فنکشن سے فیکٹوریل" },
    about: { en: "Write your own function.", te: "మీ సొంత ఫంక్షన్ రాయండి.", hi: "अपना फ़ंक्शन लिखो।", ur: "اپنا فنکشن لکھیں۔" },
    code: `#include <stdio.h>

long long factorial(int n) {
    long long result = 1;
    for (int i = 2; i <= n; i++) result *= i;
    return result;
}

int main() {
    int n;
    printf("Enter a number (0-20): ");
    scanf("%d", &n);
    if (n < 0 || n > 20) {
        printf("Please use 0 to 20\\n");
        return 0;
    }
    printf("%d! = %lld\\n", n, factorial(n));
    return 0;
}
`,
  },
  {
    id: "prime",
    level: 3,
    input: true,
    title: { en: "Prime number checker", te: "ప్రధాన సంఖ్య పరీక్ష", hi: "अभाज्य संख्या जाँच", ur: "مفرد عدد کی جانچ" },
    about: { en: "Loops and a true/false function.", te: "లూప్‌లు, నిజం/అబద్ధం ఫంక్షన్.", hi: "लूप और सही/गलत फ़ंक्शन।", ur: "لوپ اور صحیح/غلط فنکشن۔" },
    code: `#include <stdio.h>

int is_prime(int n) {
    if (n < 2) return 0;
    for (int i = 2; i * i <= n; i++)
        if (n % i == 0) return 0;
    return 1;
}

int main() {
    int n;
    printf("Enter a number: ");
    scanf("%d", &n);
    if (is_prime(n)) printf("%d is prime\\n", n);
    else printf("%d is not prime\\n", n);

    printf("Primes up to 50: ");
    for (int i = 2; i <= 50; i++)
        if (is_prime(i)) printf("%d ", i);
    printf("\\n");
    return 0;
}
`,
  },
  {
    id: "fibonacci",
    level: 3,
    title: { en: "Fibonacci numbers", te: "ఫిబొనాచ్చి సంఖ్యలు", hi: "फ़िबोनाची संख्याएँ", ur: "فبوناچی نمبر" },
    about: { en: "Each number is the sum of the two before it.", te: "ప్రతి సంఖ్య ముందు రెండింటి మొత్తం.", hi: "हर संख्या पिछली दो का योग है।", ur: "ہر نمبر پچھلے دو کا مجموعہ ہے۔" },
    code: `#include <stdio.h>

int main() {
    long a = 0, b = 1;
    for (int i = 0; i < 15; i++) {
        printf("%ld ", a);
        long next = a + b;
        a = b;
        b = next;
    }
    printf("\\n");
    return 0;
}
`,
  },
  {
    id: "array_stats",
    level: 3,
    title: { en: "Array: average and max", te: "అర్రే: సగటు, గరిష్ఠం", hi: "ऐरे: औसत और अधिकतम", ur: "ارے: اوسط اور سب سے بڑا" },
    about: { en: "Store many numbers in an array.", te: "అర్రేలో చాలా సంఖ్యలు ఉంచండి.", hi: "ऐरे में कई संख्याएँ रखो।", ur: "ارے میں بہت سے نمبر رکھیں۔" },
    code: `#include <stdio.h>

int main() {
    int marks[] = {78, 92, 65, 88, 95};
    int count = sizeof(marks) / sizeof(marks[0]);
    int total = 0, max = marks[0];

    for (int i = 0; i < count; i++) {
        total += marks[i];
        if (marks[i] > max) max = marks[i];
    }
    printf("Total: %d\\n", total);
    printf("Average: %.1f\\n", (float)total / count);
    printf("Highest: %d\\n", max);
    return 0;
}
`,
  },
  {
    id: "reverse",
    level: 3,
    input: true,
    title: { en: "Reverse a number", te: "సంఖ్యను తిప్పండి", hi: "संख्या उलटो", ur: "نمبر الٹیں" },
    about: { en: "Use % and / to take digits apart.", te: "% మరియు / తో అంకెలను వేరు చేయండి.", hi: "% और / से अंक अलग करो।", ur: "% اور / سے ہندسے الگ کریں۔" },
    code: `#include <stdio.h>

int main() {
    int n, reversed = 0;
    printf("Enter a number: ");
    scanf("%d", &n);
    int original = n;
    while (n > 0) {
        reversed = reversed * 10 + n % 10;
        n = n / 10;
    }
    printf("Reverse of %d is %d\\n", original, reversed);
    if (original == reversed) printf("It's a palindrome!\\n");
    return 0;
}
`,
  },
  {
    id: "robot_path",
    level: 3,
    title: { en: "Robot on a grid", te: "గ్రిడ్‌పై రోబో", hi: "ग्रिड पर रोबोट", ur: "جال پر روبوٹ" },
    about: { en: "Move a robot with commands (a 2D array).", te: "ఆదేశాలతో రోబోను కదపండి (2D అర్రే).", hi: "आदेशों से रोबोट चलाओ (2D ऐरे)।", ur: "حکموں سے روبوٹ چلائیں (2D ارے)۔" },
    code: `#include <stdio.h>

int main() {
    char grid[5][5];
    for (int r = 0; r < 5; r++)
        for (int c = 0; c < 5; c++) grid[r][c] = '.';

    int r = 0, c = 0;
    grid[r][c] = 'R';
    char moves[] = "RRDDDRL";   /* R=right L=left D=down U=up */

    for (int i = 0; moves[i] != '\\0'; i++) {
        if (moves[i] == 'R' && c < 4) c++;
        if (moves[i] == 'L' && c > 0) c--;
        if (moves[i] == 'D' && r < 4) r++;
        if (moves[i] == 'U' && r > 0) r--;
        grid[r][c] = '*';
    }
    grid[r][c] = 'R';

    for (int i = 0; i < 5; i++) {
        for (int j = 0; j < 5; j++) printf("%c ", grid[i][j]);
        printf("\\n");
    }
    return 0;
}
`,
  },
];
