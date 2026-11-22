"""Kalam turtle: a small browser version of Python's `turtle` module.

It keeps the same function names students learn in class (forward, left,
circle, color, begin_fill, ...). Instead of opening a window it sends simple
drawing operations to the web page, which animates them on a canvas.
"""
import json as _json
import math as _math

import kalam_bridge as _bridge

__all__ = []  # filled at the bottom

_COLOR_MODE = [1.0]
_next_id = [0]
_screen = [None]
_default = [None]


class Terminator(Exception):
    pass


class TurtleGraphicsError(Exception):
    pass


def _emit(op):
    _bridge.turtle(_json.dumps(op, separators=(",", ":")))


def _r(v):
    return round(float(v), 2)


def _color_to_css(args):
    """Accept 'red', '#ff0000', (255, 0, 0), (1.0, 0, 0) or r, g, b."""
    if len(args) == 1:
        args = args[0]
        if isinstance(args, str):
            return args.strip()
    if isinstance(args, (tuple, list)) and len(args) == 3:
        r, g, b = args
        if _COLOR_MODE[0] == 1.0:
            if not all(0 <= float(x) <= 1.0 for x in (r, g, b)):
                raise TurtleGraphicsError(
                    "bad color sequence: %r (use numbers from 0 to 1, or call colormode(255))" % (tuple(args),)
                )
            r, g, b = (round(float(x) * 255) for x in (r, g, b))
        else:
            if not all(0 <= float(x) <= 255 for x in (r, g, b)):
                raise TurtleGraphicsError("bad color sequence: %r" % (tuple(args),))
        return "rgb(%d,%d,%d)" % (int(r), int(g), int(b))
    raise TurtleGraphicsError("bad color arguments: %r" % (args,))


class Screen:
    """There is one shared screen, like in standard turtle."""

    def __new__(cls):
        if _screen[0] is None:
            s = object.__new__(cls)
            s._bg = "white"
            _screen[0] = s
        return _screen[0]

    def bgcolor(self, *args):
        if not args:
            return self._bg
        self._bg = _color_to_css(args)
        _emit({"o": "bg", "c": self._bg})

    def colormode(self, cmode=None):
        if cmode is None:
            return 255 if _COLOR_MODE[0] == 255 else 1.0
        if cmode not in (1, 1.0, 255):
            raise TurtleGraphicsError("colormode must be 1.0 or 255")
        _COLOR_MODE[0] = 255 if cmode == 255 else 1.0

    # Window/event functions are accepted so classroom programs still run.
    def title(self, *a, **k):
        pass

    def setup(self, *a, **k):
        pass

    def screensize(self, *a, **k):
        pass

    def tracer(self, *a, **k):
        pass

    def update(self):
        pass

    def delay(self, *a, **k):
        pass

    def mode(self, m=None):
        return "standard"

    def listen(self, *a, **k):
        pass

    def onkey(self, *a, **k):
        pass

    onkeypress = onkey
    onkeyrelease = onkey

    def onclick(self, *a, **k):
        pass

    onscreenclick = onclick

    def ontimer(self, *a, **k):
        pass

    def done(self):
        pass

    mainloop = done
    exitonclick = done
    bye = done

    def clear(self):
        for t in list(_all_turtles):
            t.clear()

    clearscreen = clear

    def reset(self):
        for t in list(_all_turtles):
            t.reset()

    resetscreen = reset

    def turtles(self):
        return list(_all_turtles)

    def window_width(self):
        return 600

    def window_height(self):
        return 600

    def getcanvas(self):
        return None


_all_turtles = []


class Turtle:
    def __init__(self, shape="classic", visible=True):
        Screen()
        _next_id[0] += 1
        self._id = _next_id[0]
        self._shape = shape
        self._x = 0.0
        self._y = 0.0
        self._heading = 0.0
        self._pendown = True
        self._pencolor = "black"
        self._fillcolor = "black"
        self._width = 1.0
        self._speed = 3
        self._visible = visible
        self._filling = False
        self._fill_points = []
        self._fill_lines = []
        _all_turtles.append(self)
        self._look()
        if not visible:
            _emit({"o": "vis", "t": self._id, "v": False})

    # ---- internal helpers ----
    def _look(self):
        _emit({"o": "look", "t": self._id, "pc": self._pencolor, "fc": self._fillcolor, "sh": self._shape})

    def _goto(self, x, y):
        x, y = float(x), float(y)
        if self._pendown:
            op = {"o": "line", "t": self._id, "a": [_r(self._x), _r(self._y), _r(x), _r(y)],
                  "c": self._pencolor, "w": self._width}
            if self._filling:
                self._fill_lines.append(op)
            _emit(op)
        else:
            _emit({"o": "move", "t": self._id, "a": [_r(x), _r(y)]})
        self._x, self._y = x, y
        if self._filling:
            self._fill_points.append([_r(x), _r(y)])

    def _set_heading(self, h):
        self._heading = float(h) % 360.0
        _emit({"o": "turn", "t": self._id, "h": _r(self._heading)})

    # ---- movement ----
    def forward(self, distance):
        rad = _math.radians(self._heading)
        d = float(distance)
        self._goto(self._x + d * _math.cos(rad), self._y + d * _math.sin(rad))

    fd = forward

    def backward(self, distance):
        self.forward(-float(distance))

    back = bk = backward

    def left(self, angle):
        self._set_heading(self._heading + float(angle))

    lt = left

    def right(self, angle):
        self._set_heading(self._heading - float(angle))

    rt = right

    def goto(self, x, y=None):
        if y is None:
            x, y = x
        self._goto(x, y)

    setpos = setposition = goto

    def setx(self, x):
        self._goto(x, self._y)

    def sety(self, y):
        self._goto(self._x, y)

    def setheading(self, to_angle):
        self._set_heading(to_angle)

    seth = setheading

    def home(self):
        self._goto(0, 0)
        self._set_heading(0)

    def circle(self, radius, extent=None, steps=None):
        radius = float(radius)
        if extent is None:
            extent = 360.0
        extent = float(extent)
        if steps is None:
            frac = abs(extent) / 360.0
            steps = 1 + int(min(11 + abs(radius) / 6.0, 59.0) * frac)
        w = extent / steps
        w2 = 0.5 * w
        length = 2.0 * radius * _math.sin(_math.radians(w2))
        if radius < 0:
            length, w, w2 = -length, -w, -w2
        self.left(w2)
        for _ in range(steps):
            self.forward(length)
            self.left(w)
        self.left(-w2)

    def dot(self, size=None, *color):
        if size is None:
            size = max(self._width + 4, self._width * 2)
        c = _color_to_css(color) if color else self._pencolor
        _emit({"o": "dot", "t": self._id, "a": [_r(self._x), _r(self._y)], "r": float(size), "c": c})

    def stamp(self):
        _emit({"o": "stamp", "t": self._id})
        return 0

    def write(self, arg, move=False, align="left", font=("Arial", 8, "normal")):
        size = 8
        try:
            size = int(font[1])
        except Exception:
            pass
        _emit({"o": "text", "t": self._id, "a": [_r(self._x), _r(self._y)], "x": str(arg),
               "c": self._pencolor, "f": size, "al": str(align)})

    # ---- state ----
    def position(self):
        return (round(self._x, 6), round(self._y, 6))

    pos = position

    def xcor(self):
        return self._x

    def ycor(self):
        return self._y

    def heading(self):
        return self._heading

    def distance(self, x, y=None):
        if y is None:
            if isinstance(x, Turtle):
                x, y = x.pos()
            else:
                x, y = x
        return _math.hypot(float(x) - self._x, float(y) - self._y)

    def towards(self, x, y=None):
        if y is None:
            if isinstance(x, Turtle):
                x, y = x.pos()
            else:
                x, y = x
        return _math.degrees(_math.atan2(float(y) - self._y, float(x) - self._x)) % 360.0

    # ---- pen ----
    def penup(self):
        self._pendown = False

    pu = up = penup

    def pendown(self):
        self._pendown = True

    pd = down = pendown

    def isdown(self):
        return self._pendown

    def pensize(self, width=None):
        if width is None:
            return self._width
        self._width = max(float(width), 0.1)

    width = pensize

    def speed(self, speed=None):
        if speed is None:
            return self._speed
        names = {"fastest": 0, "fast": 10, "normal": 6, "slow": 3, "slowest": 1}
        if isinstance(speed, str):
            speed = names.get(speed, 3)
        speed = int(round(float(speed)))
        if not 0.5 < speed < 10.5:
            speed = 0
        self._speed = speed
        _emit({"o": "speed", "t": self._id, "v": speed})

    def pencolor(self, *args):
        if not args:
            return self._pencolor
        self._pencolor = _color_to_css(args)
        self._look()

    def fillcolor(self, *args):
        if not args:
            return self._fillcolor
        self._fillcolor = _color_to_css(args)
        self._look()

    def color(self, *args):
        if not args:
            return (self._pencolor, self._fillcolor)
        if len(args) == 2 and not all(isinstance(a, (int, float)) for a in args):
            self._pencolor = _color_to_css((args[0],))
            self._fillcolor = _color_to_css((args[1],))
        else:
            self._pencolor = self._fillcolor = _color_to_css(args)
        self._look()

    def begin_fill(self):
        self._filling = True
        self._fill_points = [[_r(self._x), _r(self._y)]]
        self._fill_lines = []

    def end_fill(self):
        if self._filling and len(self._fill_points) > 2:
            _emit({"o": "fill", "t": self._id, "p": self._fill_points, "c": self._fillcolor,
                   "s": self._fill_lines})
        self._filling = False
        self._fill_points = []
        self._fill_lines = []

    def filling(self):
        return self._filling

    def hideturtle(self):
        self._visible = False
        _emit({"o": "vis", "t": self._id, "v": False})

    ht = hideturtle

    def showturtle(self):
        self._visible = True
        _emit({"o": "vis", "t": self._id, "v": True})

    st = showturtle

    def isvisible(self):
        return self._visible

    def shape(self, name=None):
        if name is None:
            return self._shape
        self._shape = str(name)
        self._look()

    def shapesize(self, *a, **k):
        pass

    turtlesize = shapesize

    def clear(self):
        _emit({"o": "clear", "t": self._id})

    def reset(self):
        self.clear()
        self._pendown = False
        self.home()
        self._pendown = True
        self._pencolor = self._fillcolor = "black"
        self._width = 1.0
        self._look()

    def getscreen(self):
        return Screen()

    def degrees(self, fullcircle=360.0):
        pass

    def hideturtle_all(self):
        pass


Pen = RawTurtle = RawPen = Turtle


def _get_default():
    if _default[0] is None:
        _default[0] = Turtle()
    return _default[0]


def _reset_all():
    """Called by Kalam before each run so every run starts with a fresh screen."""
    _all_turtles.clear()
    _next_id[0] = 0
    _screen[0] = None
    _default[0] = None
    _COLOR_MODE[0] = 1.0


def _make_turtle_func(name):
    def f(*args, **kwargs):
        return getattr(_get_default(), name)(*args, **kwargs)

    f.__name__ = name
    return f


def _make_screen_func(name):
    def f(*args, **kwargs):
        return getattr(Screen(), name)(*args, **kwargs)

    f.__name__ = name
    return f


_TURTLE_FUNCS = [
    "forward", "fd", "backward", "back", "bk", "left", "lt", "right", "rt", "goto", "setpos",
    "setposition", "setx", "sety", "setheading", "seth", "home", "circle", "dot", "stamp", "write",
    "position", "pos", "xcor", "ycor", "heading", "distance", "towards", "penup", "pu", "up",
    "pendown", "pd", "down", "isdown", "pensize", "width", "speed", "pencolor", "fillcolor", "color",
    "begin_fill", "end_fill", "filling", "hideturtle", "ht", "showturtle", "st", "isvisible", "shape",
    "shapesize", "turtlesize", "clear", "reset", "degrees",
]
_SCREEN_FUNCS = [
    "bgcolor", "colormode", "title", "setup", "screensize", "tracer", "update", "delay", "mode",
    "listen", "onkey", "onkeypress", "onkeyrelease", "onclick", "onscreenclick", "ontimer", "done",
    "mainloop", "exitonclick", "bye", "clearscreen", "resetscreen", "turtles", "window_width",
    "window_height",
]

for _n in _TURTLE_FUNCS:
    globals()[_n] = _make_turtle_func(_n)
for _n in _SCREEN_FUNCS:
    if _n not in globals() or _n in ("clear", "reset"):
        globals()[_n] = _make_screen_func(_n)

__all__ = _TURTLE_FUNCS + _SCREEN_FUNCS + ["Turtle", "Pen", "RawTurtle", "Screen", "Terminator",
                                          "TurtleGraphicsError"]
