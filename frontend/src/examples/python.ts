import type { Example } from "./types";

export const PYTHON_EXAMPLES: Example[] = [
  // ------------------------------------------------------------ Level 1
  {
    id: "hello",
    level: 1,
    title: { en: "Hello World", te: "హలో వరల్డ్", hi: "हैलो वर्ल्ड" },
    about: { en: "Make the computer say hello!", te: "కంప్యూటర్‌తో హలో చెప్పించండి!", hi: "कंप्यूटर से हैलो बुलवाओ!" },
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
    title: { en: "My name and age", te: "నా పేరు, వయస్సు", hi: "मेरा नाम और उम्र" },
    about: { en: "The computer asks your name and age.", te: "కంప్యూటర్ మీ పేరు, వయస్సు అడుగుతుంది.", hi: "कंप्यूटर आपका नाम और उम्र पूछेगा।" },
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
    title: { en: "Maths magic", te: "లెక్కల మ్యాజిక్", hi: "गणित का जादू" },
    about: { en: "Add, subtract, multiply and divide.", te: "కూడిక, తీసివేత, గుణకారం, భాగహారం.", hi: "जोड़, घटाव, गुणा और भाग।" },
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
    title: { en: "Turtle draws a square", te: "తాబేలు చతురస్రం గీస్తుంది", hi: "कछुआ वर्ग बनाता है" },
    about: { en: "Move a turtle to draw a square.", te: "తాబేలును కదిపి చతురస్రం గీయండి.", hi: "कछुए को चलाकर वर्ग बनाओ।" },
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
    title: { en: "Say it 5 times", te: "5 సార్లు చెప్పు", hi: "5 बार बोलो" },
    about: { en: "A loop repeats things for you.", te: "లూప్ పనిని మళ్ళీ మళ్ళీ చేస్తుంది.", hi: "लूप काम को बार-बार करता है।" },
    code: `# A for loop repeats the lines inside it.
for i in range(1, 6):
    print(i, "I love coding! ⭐")
`,
  },
  {
    id: "turtle_star",
    level: 1,
    turtle: true,
    title: { en: "Turtle star", te: "తాబేలు నక్షత్రం", hi: "कछुए का तारा" },
    about: { en: "Draw a golden star with a loop.", te: "లూప్‌తో బంగారు నక్షత్రం గీయండి.", hi: "लूप से सुनहरा तारा बनाओ।" },
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
    title: { en: "Even or odd?", te: "సరి సంఖ్యా? బేసి సంఖ్యా?", hi: "सम या विषम?" },
    about: { en: "Check if a number is even or odd.", te: "సంఖ్య సరి లేదా బేసి అని చూడండి.", hi: "देखो संख्या सम है या विषम।" },
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
    title: { en: "Simple calculator", te: "సాధారణ కాలిక్యులేటర్", hi: "सरल कैलकुलेटर" },
    about: { en: "Choose + - * / and get the answer.", te: "+ - * / ఎంచుకుని జవాబు పొందండి.", hi: "+ - * / चुनो और जवाब पाओ।" },
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
    title: { en: "Multiplication table", te: "ఎక్కాల పట్టిక", hi: "पहाड़ा (गुणा तालिका)" },
    about: { en: "Print the table of any number.", te: "ఏ సంఖ్య ఎక్కమైనా ముద్రించండి.", hi: "किसी भी संख्या का पहाड़ा छापो।" },
    code: `n = int(input("Which table? "))

for i in range(1, 11):
    print(n, "x", i, "=", n * i)
`,
  },
  {
    id: "temperature",
    level: 2,
    input: true,
    title: { en: "Temperature converter", te: "ఉష్ణోగ్రత మార్పిడి", hi: "तापमान बदलने वाला" },
    about: { en: "Change Celsius into Fahrenheit.", te: "సెల్సియస్‌ను ఫారెన్‌హీట్‌గా మార్చండి.", hi: "सेल्सियस को फ़ारेनहाइट में बदलो।" },
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
    title: { en: "Guess the number game", te: "సంఖ్య ఊహించే ఆట", hi: "संख्या बूझो खेल" },
    about: { en: "The computer thinks of a number. Can you guess it?", te: "కంప్యూటర్ ఒక సంఖ్య అనుకుంటుంది. మీరు ఊహించగలరా?", hi: "कंप्यूटर एक संख्या सोचता है। क्या आप बूझ सकते हो?" },
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
    title: { en: "Star patterns", te: "నక్షత్రాల నమూనాలు", hi: "तारों के पैटर्न" },
    about: { en: "Make triangles with stars.", te: "నక్షత్రాలతో త్రిభుజాలు చేయండి.", hi: "तारों से त्रिभुज बनाओ।" },
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
    title: { en: "Turtle flower", te: "తాబేలు పువ్వు", hi: "कछुए का फूल" },
    about: { en: "Draw circles in a ring to make a flower.", te: "వృత్తాలను గుండ్రంగా గీసి పువ్వు చేయండి.", hi: "गोले घुमाकर फूल बनाओ।" },
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
    title: { en: "Rocket countdown", te: "రాకెట్ కౌంట్‌డౌన్", hi: "रॉकेट उलटी गिनती" },
    about: { en: "Count down and launch a rocket!", te: "లెక్కించి రాకెట్ ప్రయోగించండి!", hi: "गिनती गिनो और रॉकेट छोड़ो!" },
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
    title: { en: "FizzBuzz", te: "ఫిజ్‌బజ్", hi: "फ़िज़बज़" },
    about: { en: "A classic puzzle with % and if/elif.", te: "% మరియు if/elif తో ప్రసిద్ధ పజిల్.", hi: "% और if/elif वाली मशहूर पहेली।" },
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
    input: true,
    title: { en: "Prime number checker", te: "ప్రధాన సంఖ్య పరీక్ష", hi: "अभाज्य संख्या जाँच" },
    about: { en: "Use a function to test prime numbers.", te: "ఫంక్షన్‌తో ప్రధాన సంఖ్యలను పరీక్షించండి.", hi: "फ़ंक्शन से अभाज्य संख्या जाँचो।" },
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
    title: { en: "Fibonacci numbers", te: "ఫిబొనాచ్చి సంఖ్యలు", hi: "फ़िबोनाची संख्याएँ" },
    about: { en: "Each number is the sum of the two before it.", te: "ప్రతి సంఖ్య ముందు రెండింటి మొత్తం.", hi: "हर संख्या पिछली दो का योग है।" },
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
    input: true,
    title: { en: "Marks and grades", te: "మార్కులు, గ్రేడ్‌లు", hi: "अंक और ग्रेड" },
    about: { en: "Lists: total, average and grade.", te: "జాబితాలు: మొత్తం, సగటు, గ్రేడ్.", hi: "लिस्ट: कुल, औसत और ग्रेड।" },
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
    title: { en: "Rock, paper, scissors", te: "రాయి, కాగితం, కత్తెర", hi: "पत्थर, कागज़, कैंची" },
    about: { en: "Play against the computer.", te: "కంప్యూటర్‌తో ఆడండి.", hi: "कंप्यूटर के साथ खेलो।" },
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
    title: { en: "Rainbow spiral", te: "ఇంద్రధనుస్సు సర్పిలం", hi: "इंद्रधनुष सर्पिल" },
    about: { en: "Colours, loops and maths make art.", te: "రంగులు, లూప్‌లు, గణితంతో కళ.", hi: "रंग, लूप और गणित से कला।" },
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
];
