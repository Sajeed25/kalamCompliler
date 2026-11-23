import type { Example } from "./types";

export const PYTHON_EXAMPLES: Example[] = [
  // ------------------------------------------------------------ Level 1
  {
    id: "hello",
    level: 1,
    title: { en: "Hello World", te: "హలో వరల్డ్", hi: "हैलो वर्ल्ड", ur: "ہیلو ورلڈ" },
    about: { en: "Make the computer say hello!", te: "కంప్యూటర్‌తో హలో చెప్పించండి!", hi: "कंप्यूटर से हैलो बुलवाओ!", ur: "کمپیوٹر سے ہیلو کہلوائیں!" },
    code: `# My first program!
# print() shows words on the screen.
print("Hello, World!")
print("I am learning Python 🐍")
`,
  },
  {
    id: "name_age",
    level: 1,
    input: true,
    title: { en: "My name and age", te: "నా పేరు, వయస్సు", hi: "मेरा नाम और उम्र", ur: "میرا نام اور عمر" },
    about: { en: "The computer asks your name and age.", te: "కంప్యూటర్ మీ పేరు, వయస్సు అడుగుతుంది.", hi: "कंप्यूटर आपका नाम और उम्र पूछेगा।", ur: "کمپیوٹر آپ کا نام اور عمر پوچھتا ہے۔" },
    code: `# input() waits for you to type something.
name = input("What is your name? ")
age = int(input("How old are you? "))

print("Hello,", name, "!")
print("Next year you will be", age + 1, "years old 🎂")
`,
  },
  {
    id: "maths",
    level: 1,
    title: { en: "Maths magic", te: "లెక్కల మ్యాజిక్", hi: "गणित का जादू", ur: "حساب کا جادو" },
    about: { en: "Add, subtract, multiply and divide.", te: "కూడిక, తీసివేత, గుణకారం, భాగహారం.", hi: "जोड़, घटाव, गुणा और भाग।", ur: "جمع، تفریق، ضرب اور تقسیم۔" },
    code: `a = 12
b = 4
print("a + b =", a + b)
print("a - b =", a - b)
print("a × b =", a * b)
print("a ÷ b =", a / b)
`,
  },
  {
    id: "turtle_square",
    level: 1,
    turtle: true,
    title: { en: "Turtle draws a square", te: "తాబేలు చతురస్రం గీస్తుంది", hi: "कछुआ वर्ग बनाता है", ur: "کچھوا مربع بناتا ہے" },
    about: { en: "Move a turtle to draw a square.", te: "తాబేలును కదిపి చతురస్రం గీయండి.", hi: "कछुए को चलाकर वर्ग बनाओ।", ur: "کچھوے کو چلا کر مربع بنائیں۔" },
    code: `import turtle

t = turtle.Turtle()
t.color("blue")
t.pensize(4)

t.forward(150)
t.left(90)
t.forward(150)
t.left(90)
t.forward(150)
t.left(90)
t.forward(150)
`,
  },
  {
    id: "repeat_hello",
    level: 1,
    title: { en: "Say it 5 times", te: "5 సార్లు చెప్పు", hi: "5 बार बोलो", ur: "5 بار کہیں" },
    about: { en: "A loop repeats things for you.", te: "లూప్ పనిని మళ్ళీ మళ్ళీ చేస్తుంది.", hi: "लूप काम को बार-बार करता है।", ur: "لوپ آپ کے لیے کام دہراتا ہے۔" },
    code: `# A for loop repeats the lines inside it.
for i in range(1, 6):
    print(i, "I love coding! ⭐")
`,
  },
  {
    id: "turtle_star",
    level: 1,
    turtle: true,
    title: { en: "Turtle star", te: "తాబేలు నక్షత్రం", hi: "कछुए का तारा", ur: "کچھوے کا ستارہ" },
    about: { en: "Draw a golden star with a loop.", te: "లూప్‌తో బంగారు నక్షత్రం గీయండి.", hi: "लूप से सुनहरा तारा बनाओ।", ur: "لوپ سے سنہرا ستارہ بنائیں۔" },
    code: `import turtle

t = turtle.Turtle()
t.color("orange", "gold")
t.pensize(3)

t.begin_fill()
for i in range(5):
    t.forward(200)
    t.right(144)
t.end_fill()
`,
  },
  // ------------------------------------------------------------ Level 2
  {
    id: "even_odd",
    level: 2,
    input: true,
    title: { en: "Even or odd?", te: "సరి సంఖ్యా? బేసి సంఖ్యా?", hi: "सम या विषम?", ur: "جفت یا طاق؟" },
    about: { en: "Check if a number is even or odd.", te: "సంఖ్య సరి లేదా బేసి అని చూడండి.", hi: "देखो संख्या सम है या विषम।", ur: "دیکھیں نمبر جفت ہے یا طاق۔" },
    code: `number = int(input("Type a number: "))

# % gives the remainder after dividing
if number % 2 == 0:
    print(number, "is EVEN ✅")
else:
    print(number, "is ODD 🟠")
`,
  },
  {
    id: "calculator",
    level: 2,
    input: true,
    title: { en: "Simple calculator", te: "సాధారణ కాలిక్యులేటర్", hi: "सरल कैलकुलेटर", ur: "سادہ کیلکولیٹر" },
    about: { en: "Choose + - * / and get the answer.", te: "+ - * / ఎంచుకుని జవాబు పొందండి.", hi: "+ - * / चुनो और जवाब पाओ।", ur: "+ - * / چنیں اور جواب پائیں۔" },
    code: `a = float(input("First number: "))
op = input("Choose + - * or / : ")
b = float(input("Second number: "))

if op == "+":
    print("Answer:", a + b)
elif op == "-":
    print("Answer:", a - b)
elif op == "*":
    print("Answer:", a * b)
elif op == "/":
    if b == 0:
        print("Oops! We cannot divide by zero 🙅")
    else:
        print("Answer:", a / b)
else:
    print("I don't know that sign 🤔")
`,
  },
  {
    id: "table",
    level: 2,
    input: true,
    title: { en: "Multiplication table", te: "ఎక్కాల పట్టిక", hi: "पहाड़ा (गुणा तालिका)", ur: "پہاڑا" },
    about: { en: "Print the table of any number.", te: "ఏ సంఖ్య ఎక్కమైనా ముద్రించండి.", hi: "किसी भी संख्या का पहाड़ा छापो।", ur: "کسی بھی نمبر کا پہاڑا لکھیں۔" },
    code: `n = int(input("Which table? "))

for i in range(1, 11):
    print(n, "x", i, "=", n * i)
`,
  },
  {
    id: "temperature",
    level: 2,
    input: true,
    title: { en: "Temperature converter", te: "ఉష్ణోగ్రత మార్పిడి", hi: "तापमान बदलने वाला", ur: "درجۂ حرارت بدلنے والا" },
    about: { en: "Change Celsius into Fahrenheit.", te: "సెల్సియస్‌ను ఫారెన్‌హీట్‌గా మార్చండి.", hi: "सेल्सियस को फ़ारेनहाइट में बदलो।", ur: "سیلسیس کو فارن ہائیٹ میں بدلیں۔" },
    code: `celsius = float(input("Temperature in °C: "))
fahrenheit = celsius * 9 / 5 + 32
print(celsius, "°C is", round(fahrenheit, 1), "°F")

if celsius >= 35:
    print("It's very hot! Drink water 💧")
elif celsius <= 15:
    print("Brrr, it's cold! 🧣")
`,
  },
  {
    id: "guess",
    level: 2,
    input: true,
    title: { en: "Guess the number game", te: "సంఖ్య ఊహించే ఆట", hi: "संख्या बूझो खेल", ur: "نمبر بوجھو کھیل" },
    about: { en: "The computer thinks of a number. Can you guess it?", te: "కంప్యూటర్ ఒక సంఖ్య అనుకుంటుంది. మీరు ఊహించగలరా?", hi: "कंप्यूटर एक संख्या सोचता है। क्या आप बूझ सकते हो?", ur: "کمپیوٹر ایک نمبر سوچتا ہے۔ کیا آپ بوجھ سکتے ہیں؟" },
    code: `import random

secret = random.randint(1, 20)
tries = 0
print("I am thinking of a number from 1 to 20 🤫")

while True:
    guess = int(input("Your guess: "))
    tries = tries + 1
    if guess < secret:
        print("Too small ⬆️")
    elif guess > secret:
        print("Too big ⬇️")
    else:
        print("🎉 You got it in", tries, "tries!")
        break
`,
  },
  {
    id: "stars",
    level: 2,
    title: { en: "Star patterns", te: "నక్షత్రాల నమూనాలు", hi: "तारों के पैटर्न", ur: "ستاروں کے نمونے" },
    about: { en: "Make triangles with stars.", te: "నక్షత్రాలతో త్రిభుజాలు చేయండి.", hi: "तारों से त्रिभुज बनाओ।", ur: "ستاروں سے مثلث بنائیں۔" },
    code: `rows = 5

print("Triangle:")
for i in range(1, rows + 1):
    print("* " * i)

print()
print("Pyramid:")
for i in range(1, rows + 1):
    print(" " * (rows - i) + "* " * i)
`,
  },
  {
    id: "turtle_flower",
    level: 2,
    turtle: true,
    title: { en: "Turtle flower", te: "తాబేలు పువ్వు", hi: "कछुए का फूल", ur: "کچھوے کا پھول" },
    about: { en: "Draw circles in a ring to make a flower.", te: "వృత్తాలను గుండ్రంగా గీసి పువ్వు చేయండి.", hi: "गोले घुमाकर फूल बनाओ।", ur: "گول دائرے گھما کر پھول بنائیں۔" },
    code: `import turtle

t = turtle.Turtle()
t.speed(0)
colors = ["red", "orange", "gold", "green", "blue", "purple"]

for i in range(36):
    t.color(colors[i % 6])
    t.circle(80)
    t.left(10)

t.hideturtle()
`,
  },
  {
    id: "countdown",
    level: 2,
    title: { en: "Rocket countdown", te: "రాకెట్ కౌంట్‌డౌన్", hi: "रॉकेट उलटी गिनती", ur: "راکٹ کی الٹی گنتی" },
    about: { en: "Count down and launch a rocket!", te: "లెక్కించి రాకెట్ ప్రయోగించండి!", hi: "गिनती गिनो और रॉकेट छोड़ो!", ur: "الٹی گنتی گنیں اور راکٹ چھوڑیں!" },
    code: `import time

for n in range(10, 0, -1):
    print(n)
    time.sleep(0.5)   # wait half a second

print("🚀 Lift off!")
`,
  },
  // ------------------------------------------------------------ Level 3
  {
    id: "fizzbuzz",
    level: 3,
    cbse: { cls: 11, chapter: "flow" },
    title: { en: "FizzBuzz", te: "ఫిజ్‌బజ్", hi: "फ़िज़बज़", ur: "فِز بَز" },
    about: { en: "A classic puzzle with % and if/elif.", te: "% మరియు if/elif తో ప్రసిద్ధ పజిల్.", hi: "% और if/elif वाली मशहूर पहेली।", ur: "% اور if/elif والی مشہور پہیلی۔" },
    code: `for n in range(1, 31):
    if n % 15 == 0:
        print("FizzBuzz")
    elif n % 3 == 0:
        print("Fizz")
    elif n % 5 == 0:
        print("Buzz")
    else:
        print(n)
`,
  },
  {
    id: "prime",
    level: 3,
    cbse: { cls: 11, chapter: "flow" },
    input: true,
    title: { en: "Prime number checker", te: "ప్రధాన సంఖ్య పరీక్ష", hi: "अभाज्य संख्या जाँच", ur: "مفرد عدد کی جانچ" },
    about: { en: "Use a function to test prime numbers.", te: "ఫంక్షన్‌తో ప్రధాన సంఖ్యలను పరీక్షించండి.", hi: "फ़ंक्शन से अभाज्य संख्या जाँचो।", ur: "فنکشن سے مفرد عدد جانچیں۔" },
    code: `def is_prime(n):
    if n < 2:
        return False
    i = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i += 1
    return True

n = int(input("Enter a number: "))
if is_prime(n):
    print(n, "is a prime number ✨")
else:
    print(n, "is not prime")

print("Primes up to 50:", [x for x in range(51) if is_prime(x)])
`,
  },
  {
    id: "fibonacci",
    level: 3,
    cbse: { cls: 11, chapter: "flow" },
    title: { en: "Fibonacci numbers", te: "ఫిబొనాచ్చి సంఖ్యలు", hi: "फ़िबोनाची संख्याएँ", ur: "فبوناچی نمبر" },
    about: { en: "Each number is the sum of the two before it.", te: "ప్రతి సంఖ్య ముందు రెండింటి మొత్తం.", hi: "हर संख्या पिछली दो का योग है।", ur: "ہر نمبر پچھلے دو کا مجموعہ ہے۔" },
    code: `a, b = 0, 1
for i in range(15):
    print(a, end=" ")
    a, b = b, a + b
print()
`,
  },
  {
    id: "marks",
    level: 3,
    cbse: { cls: 11, chapter: "lists" },
    input: true,
    title: { en: "Marks and grades", te: "మార్కులు, గ్రేడ్‌లు", hi: "अंक और ग्रेड", ur: "نمبر اور گریڈ" },
    about: { en: "Lists: total, average and grade.", te: "జాబితాలు: మొత్తం, సగటు, గ్రేడ్.", hi: "लिस्ट: कुल, औसत और ग्रेड।", ur: "فہرستیں: کُل، اوسط اور گریڈ۔" },
    code: `subjects = ["Maths", "Science", "English"]
marks = []

for s in subjects:
    m = int(input("Marks in " + s + ": "))
    marks.append(m)

total = sum(marks)
average = total / len(marks)
print("Total:", total)
print(f"Average: {average:.1f}")

if average >= 90:
    print("Grade A+ 🏆")
elif average >= 75:
    print("Grade A 🌟")
elif average >= 60:
    print("Grade B 👍")
else:
    print("Grade C — keep practising 💪")
`,
  },
  {
    id: "rps",
    level: 3,
    input: true,
    title: { en: "Rock, paper, scissors", te: "రాయి, కాగితం, కత్తెర", hi: "पत्थर, कागज़, कैंची", ur: "پتھر، کاغذ، قینچی" },
    about: { en: "Play against the computer.", te: "కంప్యూటర్‌తో ఆడండి.", hi: "कंप्यूटर के साथ खेलो।", ur: "کمپیوٹر کے ساتھ کھیلیں۔" },
    code: `import random

choices = ["rock", "paper", "scissors"]
beats = {"rock": "scissors", "paper": "rock", "scissors": "paper"}

me = input("rock, paper or scissors? ").strip().lower()
computer = random.choice(choices)
print("Computer chose", computer)

if me not in choices:
    print("That's not a choice 🤔")
elif me == computer:
    print("It's a draw 🤝")
elif beats[me] == computer:
    print("You win! 🎉")
else:
    print("Computer wins 🤖")
`,
  },
  {
    id: "turtle_spiral",
    level: 3,
    turtle: true,
    title: { en: "Rainbow spiral", te: "ఇంద్రధనుస్సు సర్పిలం", hi: "इंद्रधनुष सर्पिल", ur: "قوسِ قزح چکر" },
    about: { en: "Colours, loops and maths make art.", te: "రంగులు, లూప్‌లు, గణితంతో కళ.", hi: "रंग, लूप और गणित से कला।", ur: "رنگ، لوپ اور حساب سے فن۔" },
    code: `import turtle

screen = turtle.Screen()
screen.bgcolor("black")
t = turtle.Turtle()
t.speed(0)
t.pensize(2)
colors = ["red", "orange", "yellow", "green", "cyan", "violet"]

for i in range(120):
    t.pencolor(colors[i % 6])
    t.forward(i * 2.5)
    t.left(59)

t.hideturtle()
`,
  },
  // ------------------------------------------------------------ CBSE Computer Science (083), Classes 11–12
  {
    id: "cbse_welcome",
    level: 3,
    input: true,
    cbse: { cls: 11, chapter: "basics" },
    title: { en: "Welcome message", te: "స్వాగత సందేశం", hi: "स्वागत संदेश", ur: "خوش آمدید پیغام" },
    about: { en: "Read a message with input() and display it.", te: "input() తో సందేశం చదివి చూపించండి.", hi: "input() से संदेश पढ़ो और दिखाओ।", ur: "input()‎ سے پیغام پڑھیں اور دکھائیں۔" },
    code: `# CBSE Class 11 – Python basics
# Input a welcome message and display it.
message = input("Type a welcome message: ")
name = input("Your name: ")

print("-" * 30)
print(message)
print("Nice to meet you,", name)
print("Length of the message:", len(message), "characters")
print("-" * 30)
`,
  },
  {
    id: "cbse_largest",
    level: 3,
    input: true,
    cbse: { cls: 11, chapter: "flow" },
    title: { en: "Largest and smallest of three", te: "మూడింటిలో పెద్దది, చిన్నది", hi: "तीन में सबसे बड़ा और छोटा", ur: "تین میں سب سے بڑا اور چھوٹا" },
    about: { en: "Compare three numbers with if, elif and else.", te: "if, elif, else తో మూడు సంఖ్యలు పోల్చండి.", hi: "if, elif और else से तीन संख्याओं की तुलना।", ur: "if، elif اور else سے تین نمبروں کا مقابلہ۔" },
    code: `# CBSE Class 11 – Flow of control
# Input three numbers and display the largest and the smallest.
a = float(input("First number: "))
b = float(input("Second number: "))
c = float(input("Third number: "))

if a >= b and a >= c:
    largest = a
elif b >= a and b >= c:
    largest = b
else:
    largest = c

if a <= b and a <= c:
    smallest = a
elif b <= a and b <= c:
    smallest = b
else:
    smallest = c

print("Largest :", largest)
print("Smallest:", smallest)
`,
  },
  {
    id: "cbse_patterns",
    level: 3,
    cbse: { cls: 11, chapter: "flow" },
    title: { en: "Number and letter patterns", te: "సంఖ్యలు, అక్షరాల నమూనాలు", hi: "संख्या और अक्षर पैटर्न", ur: "نمبر اور حروف کے نمونے" },
    about: { en: "Nested for loops draw three patterns.", te: "లూప్ లోపల లూప్‌తో మూడు నమూనాలు.", hi: "नेस्टेड for लूप से तीन पैटर्न।", ur: "لوپ کے اندر لوپ سے تین نمونے۔" },
    code: `# CBSE Class 11 – Flow of control (nested loops)
rows = 5

print("Pattern 1")
for i in range(1, rows + 1):
    print("*" * i)

print("\\nPattern 2")
for i in range(1, rows + 1):
    for j in range(1, i + 1):
        print(j, end=" ")
    print()

print("\\nPattern 3")
for i in range(rows):
    for j in range(i + 1):
        print(chr(65 + j), end=" ")   # 65 is the code of "A"
    print()
`,
  },
  {
    id: "cbse_series",
    level: 3,
    input: true,
    cbse: { cls: 11, chapter: "flow" },
    title: { en: "Sum of a series", te: "శ్రేణి మొత్తం", hi: "श्रेणी का योग", ur: "سلسلے کا مجموعہ" },
    about: { en: "1 + x + x² + … + xⁿ and 1 − x + x² − … with loops.", te: "లూప్‌లతో 1 + x + x² + … + xⁿ, 1 − x + x² − ….", hi: "लूप से 1 + x + x² + … + xⁿ और 1 − x + x² − …", ur: "لوپ سے 1 + x + x² + … + xⁿ اور 1 − x + x² − …" },
    code: `# CBSE Class 11 – Flow of control
# Find the sum of the series:
#   S1 = 1 + x + x^2 + x^3 + ... + x^n
#   S2 = 1 - x + x^2 - x^3 + ... x^n
x = int(input("Enter x: "))
n = int(input("Enter n: "))

s1 = 0
s2 = 0
for i in range(n + 1):
    s1 = s1 + x ** i
    s2 = s2 + (-1) ** i * x ** i

print("1 + x + x^2 + ... + x^n =", s1)
print("1 - x + x^2 - ... x^n   =", s2)
`,
  },
  {
    id: "cbse_number_types",
    level: 3,
    input: true,
    cbse: { cls: 11, chapter: "flow" },
    title: { en: "Perfect, Armstrong and palindrome numbers", te: "పర్ఫెక్ట్, ఆర్మ్‌స్ట్రాంగ్, పాలిండ్రోమ్ సంఖ్యలు", hi: "पूर्ण, आर्मस्ट्रांग और पैलिंड्रोम संख्या", ur: "کامل، آرم اسٹرانگ اور پیلنڈروم نمبر" },
    about: { en: "Test a number in three ways using while loops.", te: "while లూప్‌లతో సంఖ్యను మూడు విధాలుగా పరీక్షించండి.", hi: "while लूप से संख्या को तीन तरह जाँचो।", ur: "while لوپ سے نمبر کو تین طرح جانچیں۔" },
    code: `# CBSE Class 11 – Flow of control
# Is the number a perfect number, an Armstrong number, a palindrome?
n = int(input("Enter a number: "))

# Perfect: the sum of its factors (except itself) equals the number, e.g. 6 = 1 + 2 + 3
total = 0
for i in range(1, n):
    if n % i == 0:
        total += i
print(n, "is a perfect number" if total == n and n > 0 else "is not a perfect number")

# Armstrong: sum of each digit raised to the number of digits, e.g. 153 = 1^3 + 5^3 + 3^3
digits = len(str(n))
temp, total = n, 0
while temp > 0:
    total += (temp % 10) ** digits
    temp //= 10
print(n, "is an Armstrong number" if total == n else "is not an Armstrong number")

# Palindrome: reads the same backwards, e.g. 121
temp, reverse = n, 0
while temp > 0:
    reverse = reverse * 10 + temp % 10
    temp //= 10
print(n, "is a palindrome" if reverse == n else "is not a palindrome")
`,
  },
  {
    id: "cbse_gcd_lcm",
    level: 3,
    input: true,
    cbse: { cls: 11, chapter: "flow" },
    title: { en: "GCD and LCM", te: "గ.సా.భా, క.సా.గు", hi: "म.स.प. और ल.स.प.", ur: "عادِ اعظم اور ذو اضعافِ اقل" },
    about: { en: "Euclid's method with a while loop.", te: "while లూప్‌తో యూక్లిడ్ పద్ధతి.", hi: "while लूप से यूक्लिड विधि।", ur: "while لوپ سے اقلیدس کا طریقہ۔" },
    code: `# CBSE Class 11 – Flow of control
# Compute the GCD (HCF) and LCM of two numbers.
a = int(input("First number: "))
b = int(input("Second number: "))

x, y = a, b
while y != 0:          # Euclid's method
    x, y = y, x % y
gcd = x
lcm = a * b // gcd

print("GCD of", a, "and", b, "=", gcd)
print("LCM of", a, "and", b, "=", lcm)
`,
  },
  {
    id: "cbse_string_count",
    level: 3,
    input: true,
    cbse: { cls: 11, chapter: "strings" },
    title: { en: "Count vowels, consonants and cases", te: "అచ్చులు, హల్లులు, పెద్ద/చిన్న అక్షరాల లెక్క", hi: "स्वर, व्यंजन और बड़े/छोटे अक्षर गिनो", ur: "حروفِ علت، حروفِ صحیح اور بڑے/چھوٹے حروف گنیں" },
    about: { en: "Loop through a string and count its letters.", te: "స్ట్రింగ్‌లో అక్షరాలను లెక్కించండి.", hi: "स्ट्रिंग के अक्षर गिनो।", ur: "اسٹرنگ کے حروف گنیں۔" },
    code: `# CBSE Class 11 – Strings
# Count vowels, consonants, uppercase and lowercase letters in a string.
text = input("Enter a line: ")

vowels = consonants = upper = lower = 0
for ch in text:
    if ch.isalpha():
        if ch.lower() in "aeiou":
            vowels += 1
        else:
            consonants += 1
        if ch.isupper():
            upper += 1
        else:
            lower += 1

print("Vowels    :", vowels)
print("Consonants:", consonants)
print("Uppercase :", upper)
print("Lowercase :", lower)
`,
  },
  {
    id: "cbse_string_palindrome",
    level: 3,
    input: true,
    cbse: { cls: 11, chapter: "strings" },
    title: { en: "Palindrome string and case change", te: "పాలిండ్రోమ్ స్ట్రింగ్, అక్షర మార్పు", hi: "पैलिंड्रोम स्ट्रिंग और अक्षर बदलना", ur: "پیلنڈروم اسٹرنگ اور حروف کی تبدیلی" },
    about: { en: "Slicing [::-1] and string methods.", te: "స్లైసింగ్ [::-1], స్ట్రింగ్ మెథడ్‌లు.", hi: "स्लाइसिंग [::-1] और स्ट्रिंग मेथड।", ur: "سلائسنگ [::-1] اور اسٹرنگ میتھڈ۔" },
    code: `# CBSE Class 11 – Strings
# Is the string a palindrome? Then convert the case of its characters.
word = input("Enter a word: ")

if word.lower() == word.lower()[::-1]:
    print(word, "is a palindrome")
else:
    print(word, "is not a palindrome")

print("UPPER :", word.upper())
print("lower :", word.lower())
print("Swap  :", word.swapcase())
print("Title :", word.title())
`,
  },
  {
    id: "cbse_list_minmax",
    level: 3,
    input: true,
    cbse: { cls: 11, chapter: "lists" },
    title: { en: "Largest and smallest in a list", te: "జాబితాలో పెద్దది, చిన్నది", hi: "लिस्ट में सबसे बड़ा और छोटा", ur: "فہرست میں سب سے بڑا اور چھوٹا" },
    about: { en: "Build a list with append(), then find max and min.", te: "append() తో జాబితా చేసి max, min కనుగొనండి.", hi: "append() से लिस्ट बनाओ, फिर max और min।", ur: "append()‎ سے فہرست بنائیں، پھر max اور min۔" },
    code: `# CBSE Class 11 – Lists
# Find the largest and smallest numbers in a list (with and without built-ins).
n = int(input("How many numbers? "))
numbers = []
for i in range(n):
    numbers.append(int(input("Number " + str(i + 1) + ": ")))

largest = smallest = numbers[0]
for x in numbers:
    if x > largest:
        largest = x
    if x < smallest:
        smallest = x

print("List    :", numbers)
print("Largest :", largest, "| using max():", max(numbers))
print("Smallest:", smallest, "| using min():", min(numbers))
print("Sorted  :", sorted(numbers))
`,
  },
  {
    id: "cbse_list_swap",
    level: 3,
    cbse: { cls: 11, chapter: "lists" },
    title: { en: "Swap elements at even and odd positions", te: "సరి, బేసి స్థానాల మార్పిడి", hi: "सम और विषम स्थानों के तत्व बदलो", ur: "جفت اور طاق جگہوں کے عناصر بدلیں" },
    about: { en: "Use list indexes to swap neighbours.", te: "ఇండెక్స్‌లతో పక్కపక్క అంశాలను మార్చండి.", hi: "इंडेक्स से पड़ोसी तत्व बदलो।", ur: "انڈیکس سے ساتھ والے عناصر بدلیں۔" },
    code: `# CBSE Class 11 – Lists
# Swap elements at even positions with elements at odd positions.
nums = [10, 20, 30, 40, 50, 60, 70]
print("Before:", nums)

for i in range(0, len(nums) - 1, 2):
    nums[i], nums[i + 1] = nums[i + 1], nums[i]

print("After :", nums)
`,
  },
  {
    id: "cbse_search",
    level: 3,
    input: true,
    cbse: { cls: 11, chapter: "tuples" },
    title: { en: "Search in a list and a tuple", te: "జాబితా, టపుల్‌లో వెతకడం", hi: "लिस्ट और टपल में खोज", ur: "فہرست اور ٹپل میں تلاش" },
    about: { en: "Linear search, then the in operator and index().", te: "లీనియర్ సెర్చ్, తర్వాత in, index().", hi: "लीनियर सर्च, फिर in और index()।", ur: "لینیئر سرچ، پھر in اور index()‎۔" },
    code: `# CBSE Class 11 – Lists and tuples
# Search for a number in a list (linear search) and in a tuple.
marks_list = [56, 78, 42, 91, 67]
marks_tuple = (56, 78, 42, 91, 67)
key = int(input("Number to search: "))

position = -1
for i in range(len(marks_list)):      # linear search
    if marks_list[i] == key:
        position = i
        break

if position != -1:
    print("Found in the list at index", position)
else:
    print("Not found in the list")

if key in marks_tuple:
    print("Found in the tuple at index", marks_tuple.index(key))
else:
    print("Not found in the tuple")
print("A tuple cannot be changed; its length is", len(marks_tuple))
`,
  },
  {
    id: "cbse_dict_students",
    level: 3,
    input: true,
    cbse: { cls: 11, chapter: "dictionaries" },
    title: { en: "Students who scored above 75", te: "75 కంటే ఎక్కువ మార్కులు వచ్చిన విద్యార్థులు", hi: "75 से अधिक अंक वाले विद्यार्थी", ur: "75 سے زیادہ نمبر لینے والے طلبہ" },
    about: { en: "A dictionary of roll numbers, names and marks.", te: "రోల్ నంబర్, పేరు, మార్కుల డిక్షనరీ.", hi: "रोल नंबर, नाम और अंकों की डिक्शनरी।", ur: "رول نمبر، نام اور نمبروں کی ڈکشنری۔" },
    code: `# CBSE Class 11 – Dictionaries
# Store roll number, name and marks of students; show names with marks above 75.
n = int(input("How many students? "))
result = {}
for i in range(n):
    roll = int(input("Roll number: "))
    name = input("Name: ")
    marks = float(input("Marks: "))
    result[roll] = {"name": name, "marks": marks}

print("\\nAll students:", result)
print("Students with marks above 75:")
for roll, data in result.items():
    if data["marks"] > 75:
        print(" ", roll, data["name"], data["marks"])
`,
  },
  {
    id: "cbse_char_count",
    level: 3,
    input: true,
    cbse: { cls: 11, chapter: "dictionaries" },
    title: { en: "Count each character", te: "ప్రతి అక్షరాన్ని లెక్కించండి", hi: "हर अक्षर गिनो", ur: "ہر حرف گنیں" },
    about: { en: "A dictionary counts how often each character appears.", te: "ప్రతి అక్షరం ఎన్నిసార్లు వచ్చిందో డిక్షనరీ లెక్కిస్తుంది.", hi: "डिक्शनरी गिनती है कि हर अक्षर कितनी बार आया।", ur: "ڈکشنری گنتی ہے کہ ہر حرف کتنی بار آیا۔" },
    code: `# CBSE Class 11 – Dictionaries
# Count the number of times each character appears in a string.
text = input("Enter a string: ")

count = {}
for ch in text:
    count[ch] = count.get(ch, 0) + 1

for ch, times in sorted(count.items()):
    print(repr(ch), "->", times)
print("Most common:", max(count, key=count.get))
`,
  },
  {
    id: "cbse_modules",
    level: 3,
    cbse: { cls: 11, chapter: "modules" },
    title: { en: "math, random and statistics modules", te: "math, random, statistics మాడ్యూల్స్", hi: "math, random और statistics मॉड्यूल", ur: "math، random اور statistics ماڈیول" },
    about: { en: "Use ready-made functions from Python's modules.", te: "Python మాడ్యూల్స్ నుండి సిద్ధమైన ఫంక్షన్లు వాడండి.", hi: "Python मॉड्यूल के बने-बनाए फ़ंक्शन इस्तेमाल करो।", ur: "Python ماڈیول کے بنے بنائے فنکشن استعمال کریں۔" },
    code: `# CBSE Class 11 – Modules: math, random, statistics
import math
import random
import statistics

r = 7
print("Area of a circle of radius", r, "=", round(math.pi * r ** 2, 2))
print("Square root of 144 =", math.sqrt(144))
print("2 to the power 10  =", math.pow(2, 10))
print("ceil(4.2) =", math.ceil(4.2), " floor(4.8) =", math.floor(4.8))

print("Random number 1-6 :", random.randint(1, 6))
print("Random choice     :", random.choice(["red", "green", "blue"]))

marks = [56, 78, 78, 91, 67, 85]
print("Marks :", marks)
print("Mean  :", round(statistics.mean(marks), 2))
print("Median:", statistics.median(marks))
print("Mode  :", statistics.mode(marks))
`,
  },
  {
    id: "cbse_functions",
    level: 3,
    input: true,
    cbse: { cls: 12, chapter: "functions" },
    title: { en: "Functions: arguments and return values", te: "ఫంక్షన్లు: ఆర్గ్యుమెంట్‌లు, రిటర్న్ విలువలు", hi: "फ़ंक्शन: आर्ग्युमेंट और रिटर्न मान", ur: "فنکشن: آرگومنٹ اور واپسی کی قیمتیں" },
    about: { en: "Default and keyword arguments, returning two values.", te: "డిఫాల్ట్, కీవర్డ్ ఆర్గ్యుమెంట్‌లు, రెండు విలువలు తిరిగి ఇవ్వడం.", hi: "डिफ़ॉल्ट और कीवर्ड आर्ग्युमेंट, दो मान लौटाना।", ur: "ڈیفالٹ اور کی ورڈ آرگومنٹ، دو قیمتیں واپس کرنا۔" },
    code: `# CBSE Class 12 – Functions
def rectangle(length, breadth=1):
    """Returns area and perimeter (two values)."""
    area = length * breadth
    perimeter = 2 * (length + breadth)
    return area, perimeter

def greet(name, message="Good morning"):
    print(message + ",", name + "!")

l = float(input("Length : "))
b = float(input("Breadth: "))
a, p = rectangle(l, b)                # positional arguments
print("Area =", a, " Perimeter =", p)
print("rectangle(4) uses the default breadth 1:", rectangle(4))

greet("Asha")                          # default message
greet(message="Well done", name="Ravi")   # keyword arguments

count = 0                              # global variable
def increase():
    global count
    count += 1
increase(); increase()
print("count after two calls =", count)
`,
  },
  {
    id: "cbse_exceptions",
    level: 3,
    input: true,
    cbse: { cls: 12, chapter: "exceptions" },
    title: { en: "Exception handling: try and except", te: "ఎక్సెప్షన్ హ్యాండ్లింగ్: try, except", hi: "एक्सेप्शन हैंडलिंग: try और except", ur: "ایکسیپشن ہینڈلنگ: try اور except" },
    about: { en: "Catch wrong input and division by zero.", te: "తప్పు ఇన్‌పుట్, సున్నాతో భాగహారాన్ని పట్టుకోండి.", hi: "गलत इनपुट और शून्य से भाग को पकड़ो।", ur: "غلط اِن پُٹ اور صفر سے تقسیم کو پکڑیں۔" },
    code: `# CBSE Class 12 – Exception handling
try:
    a = int(input("Enter a number: "))
    b = int(input("Divide it by: "))
    result = a / b
except ValueError:
    print("Please type whole numbers only.")
except ZeroDivisionError:
    print("You cannot divide by zero!")
else:
    print("Answer:", result)       # runs only when there was no error
finally:
    print("Thank you for using the divider.")   # always runs
`,
  },
  {
    id: "cbse_text_file",
    level: 3,
    cbse: { cls: 12, chapter: "files" },
    title: { en: "Text file: write, read and count", te: "టెక్స్ట్ ఫైల్: రాయడం, చదవడం, లెక్కించడం", hi: "टेक्स्ट फ़ाइल: लिखना, पढ़ना और गिनना", ur: "ٹیکسٹ فائل: لکھنا، پڑھنا اور گننا" },
    about: { en: "open(), write(), readlines() and counting words.", te: "open(), write(), readlines(), పదాల లెక్క.", hi: "open(), write(), readlines() और शब्द गिनना।", ur: "open()‎، write()‎، readlines()‎ اور الفاظ گننا۔" },
    code: `# CBSE Class 12 – File handling (text files)
# The file is saved in this browser's memory for this run.
with open("story.txt", "w") as f:
    f.write("The robot learned to code.\\n")
    f.write("It wrote a program in Python.\\n")
    f.write("Then the robot taught its friends.\\n")

with open("story.txt", "r") as f:
    lines = f.readlines()

print("Number of lines:", len(lines))
words = 0
the_count = 0
for line in lines:
    print(line.rstrip())
    for w in line.split():
        words += 1
        if w.lower() == "the":
            the_count += 1
print("Words:", words)
print('Times "the" appears:', the_count)
print("Lines starting with T:", sum(1 for line in lines if line.startswith("T")))
`,
  },
  {
    id: "cbse_csv_file",
    level: 3,
    input: true,
    cbse: { cls: 12, chapter: "files" },
    title: { en: "CSV file: user ids and passwords", te: "CSV ఫైల్: యూజర్ ఐడీలు, పాస్‌వర్డ్‌లు", hi: "CSV फ़ाइल: यूज़र आईडी और पासवर्ड", ur: "CSV فائل: یوزر آئی ڈی اور پاس ورڈ" },
    about: { en: "Write rows with csv.writer, then search with csv.reader.", te: "csv.writer తో వరుసలు రాసి, csv.reader తో వెతకండి.", hi: "csv.writer से पंक्तियाँ लिखो, csv.reader से खोजो।", ur: "csv.writer سے قطاریں لکھیں، csv.reader سے تلاش کریں۔" },
    code: `# CBSE Class 12 – File handling (CSV files)
import csv

users = [["asha01", "sun123"], ["ravi07", "moon456"], ["sana12", "star789"]]
with open("users.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["userid", "password"])
    writer.writerows(users)
print("Saved", len(users), "users to users.csv")

wanted = input("User id to search: ")
with open("users.csv", "r") as f:
    reader = csv.reader(f)
    next(reader)                      # skip the heading row
    for row in reader:
        if row[0] == wanted:
            print("Password for", wanted, "is", row[1])
            break
    else:
        print("User id not found")
`,
  },
  {
    id: "cbse_binary_file",
    level: 3,
    input: true,
    cbse: { cls: 12, chapter: "files" },
    title: { en: "Binary file with pickle", te: "pickle తో బైనరీ ఫైల్", hi: "pickle से बाइनरी फ़ाइल", ur: "pickle سے بائنری فائل" },
    about: { en: "Store student records with pickle.dump and search them.", te: "pickle.dump తో రికార్డులు దాచి వెతకండి.", hi: "pickle.dump से रिकॉर्ड रखो और खोजो।", ur: "pickle.dump سے ریکارڈ رکھیں اور تلاش کریں۔" },
    code: `# CBSE Class 12 – File handling (binary files)
import pickle

students = [{"roll": 1, "name": "Asha"}, {"roll": 2, "name": "Ravi"}, {"roll": 3, "name": "Sana"}]
with open("students.dat", "wb") as f:
    for s in students:
        pickle.dump(s, f)

roll = int(input("Roll number to search: "))
found = False
with open("students.dat", "rb") as f:
    try:
        while True:
            record = pickle.load(f)
            if record["roll"] == roll:
                print("Found:", record["name"])
                found = True
    except EOFError:                  # reached the end of the file
        pass
if not found:
    print("No student with roll number", roll)
`,
  },
  {
    id: "cbse_stack",
    level: 3,
    input: true,
    cbse: { cls: 12, chapter: "stack" },
    title: { en: "Stack using a list", te: "జాబితాతో స్టాక్", hi: "लिस्ट से स्टैक", ur: "فہرست سے اسٹیک" },
    about: { en: "Push, pop and peek with a menu.", te: "మెనూతో push, pop, peek.", hi: "मेनू से push, pop और peek।", ur: "مینو سے push، pop اور peek۔" },
    code: `# CBSE Class 12 – Data structure: Stack (Last In, First Out)
stack = []

def push(item):
    stack.append(item)

def pop():
    if not stack:
        return "Stack is empty (underflow)"
    return stack.pop()

def peek():
    return stack[-1] if stack else "Stack is empty"

while True:
    print("\\n1 Push  2 Pop  3 Peek  4 Display  5 Exit")
    choice = input("Your choice: ")
    if choice == "1":
        push(int(input("Number to push: ")))
    elif choice == "2":
        print("Popped:", pop())
    elif choice == "3":
        print("Top:", peek())
    elif choice == "4":
        print("Stack (top first):", stack[::-1])
    elif choice == "5":
        print("Bye!")
        break
    else:
        print("Please choose 1 to 5")
`,
  },
  {
    id: "cbse_dice",
    level: 3,
    input: true,
    cbse: { cls: 12, chapter: "modules" },
    title: { en: "Dice simulator", te: "పాచిక అనుకరణ", hi: "पासा सिम्युलेटर", ur: "پانسہ سمیلیٹر" },
    about: { en: "random.randint(1, 6) rolls a dice.", te: "random.randint(1, 6) పాచిక వేస్తుంది.", hi: "random.randint(1, 6) पासा फेंकता है।", ur: "random.randint(1, 6)‎ پانسہ پھینکتا ہے۔" },
    code: `# CBSE Class 12 – Random number generator that simulates a dice
import random

rolls = 0
while True:
    value = random.randint(1, 6)
    rolls += 1
    print("🎲 You rolled", value)
    if input("Roll again? (y/n): ").strip().lower() != "y":
        break
print("You rolled the dice", rolls, "times. Bye!")
`,
  },
];
