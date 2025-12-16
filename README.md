# Back-End Development — Lesson 11 Prep (Error Handling + Debugging)

> **Instructor goal:** help learners move from “happy path” coding to **defensive, production-ready thinking** using Express error middleware and practical debugging.

---

## Learning Objectives

By the end of this lesson, learners will be able to:

* Explain how error handling works in Express
* Trigger Express’s **default error handler** correctly
* Build **custom centralized error-handling middleware**
* Identify and debug common Node.js / Express errors

---

## Teaching Method

Use **Pencils Down / Pencils Up**:

* **Pencils down:** students watch and focus on understanding
* **Pencils up:** you repeat the same steps while learners code along

---

# Recap — Middleware Refresher

## Key reminders (Pencils Down)

* Middleware sits **between** request and response.
* Normal middleware signature:

  ```js
  (req, res, next)
  ```
* Error middleware signature (special!):

  ```js
  (err, req, res, next)
  ```
* **Order matters** in Express. Middleware is evaluated top-to-bottom.

## Warm-up coding snippet (Pencils Up)

Create a tiny app that shows middleware ordering:

```js
import express from "express";

const app = express();

app.use((req, res, next) => {
  console.log("[1] Global middleware hit");
  next();
});

app.get("/hello", (req, res) => {
  res.json({ message: "Hello" });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
```

Ask learners:

* What prints when you hit `/hello`?
* What prints when you hit `/not-a-route`?

---

# Section 1 — Default Error Middleware

## Step 1: Introduce error flow (Pencils Down)

Errors aren’t “special” — they’re just another flow.

A route can:

* return a response
* **throw** an error
* call **next(error)**

Express will catch errors and pass them to its built-in default error handler.

---

## Step 2: Trigger the default error handler (Sync error)

### Pencils Down: Show the behavior

```js
import express from "express";

const app = express();

app.get("/crash", (req, res) => {
  throw new Error("Something broke!");
});

app.listen(3000, () => console.log("Server running"));
```

**What learners see:**

* A stack trace in the terminal
* An error response in the browser

### Pencils Up: Learners implement + observe

Tasks:

1. Hit `/crash`
2. Describe what appears in terminal and browser
3. Explain why showing stack traces publicly is risky

---

## Step 3: Trigger the default error handler (Using next(err))

### Pencils Down: Demonstrate `next(err)`

```js
import express from "express";

const app = express();

app.get("/not-found", (req, res, next) => {
  const err = new Error("Resource not found");
  err.status = 404;
  next(err);
});

app.listen(3000, () => console.log("Server running"));
```

### Pencils Up: Learners customize

Have learners modify:

* Error message
* status code

Then hit `/not-found` and compare output to `/crash`.

---

# Section 2 — Custom Error-Handling Middleware

## Why custom error middleware? (Pencils Down)

* Prevent leaking stack traces
* Return consistent JSON (better for front-end clients)
* Central place to handle errors

---

## Step 1: Create a “fake” mini notes API to practice with

### Pencils Down: Starter app structure

```js
import express from "express";

const app = express();
app.use(express.json());

// Fake data store
const notes = [
  { id: "1", title: "Grocery", body: "Buy milk" },
  { id: "2", title: "Workout", body: "Leg day" },
];

app.get("/notes", (req, res) => {
  res.json(notes);
});

app.get("/notes/:id", (req, res, next) => {
  const note = notes.find(n => n.id === req.params.id);

  if (!note) {
    const err = new Error("Note not found");
    err.status = 404;
    return next(err);
  }

  res.json(note);
});

app.listen(3000, () => console.log("Server running"));
```

### Pencils Up: Learners extend

Ask learners to add:

* a new note into the array
* verify `/notes` returns the new note

---

## Step 2: Add a centralized custom error middleware

### Pencils Down: Explain the 4 parameters

Error middleware must be:

```js
(err, req, res, next)
```

### Pencils Down: Add middleware at the very end

```js
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;

  res.status(statusCode).json({
    error: {
      message: err.message,
      status: statusCode,
    },
  });
});
```

### Pencils Up: Learners test it

1. Hit `/notes/999` (should get 404 JSON)
2. Hit `/notes/1` (should get note)

---

## Step 3: Add a “catch-all” 404 route + error middleware

### Pencils Down: Why?

If a route doesn’t exist, you want **your own** JSON response, not Express’s default.

### Add catch-all 404 (place this AFTER routes, BEFORE error middleware)

```js
app.use((req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.url}`);
  err.status = 404;
  next(err);
});
```

### Pencils Up: Learners verify

Hit `/does-not-exist` and confirm:

* response is JSON
* status is 404

---

## Step 4: (Skip for now)

> ❌ **Instructor note:** We are **not teaching reusable error classes** in this lesson.
>
> Reason: learners have not yet learned `class`, constructors, or inheritance.
>
> We will keep error creation **simple and explicit** using `new Error()` and `err.status` so the focus stays on **middleware flow**, not JavaScript OOP.

---

## Step 4: Async Errors

### Scenario: "Fetching notes from a database" (Pencils Down)

Explain this clearly:

> In the real world, data does **not** come from arrays.
> It comes from **databases, APIs, or files** — all of which are **async**.

We’ll **simulate** a database call using a Promise and `setTimeout`.

---

### Step 1: Fake async function (acts like a DB call)

```js
function getNoteFromDB(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const notes = [
        { id: "1", title: "Grocery", body: "Buy milk" },
        { id: "2", title: "Workout", body: "Leg day" },
      ];

      const note = notes.find(n => n.id === id);

      if (!note) {
        reject(new Error("Note not found in database"));
      } else {
        resolve(note);
      }
    }, 1000);
  });
}
```

Explain:

* `setTimeout` = network / database delay
* `resolve` = success
* `reject` = failure

---

### Step 2: ❌ Incorrect async route (common beginner mistake)

```js
app.get("/async-notes/:id", async (req, res) => {
  const note = await getNoteFromDB(req.params.id);
  res.json(note);
});
```

**What happens when note does not exist?**

* Server crashes
* Error middleware is NOT called

Explain:

> Async errors do NOT magically go to error middleware.

---

### Step 3: ✅ Correct async route using try/catch + next (Pencils Down)

```js
app.get("/async-notes/:id", async (req, res, next) => {
  try {
    const note = await getNoteFromDB(req.params.id);
    res.json(note);
  } catch (err) {
    err.status = 404;
    next(err);
  }
});
```

Explain slowly:

* `try` → happy path
* `catch` → error path
* `next(err)` → hands control to error middleware

---

### Step 4: Pencils Up — Learner Tasks

Ask learners to:

1. Change the delay time
2. Change the error message
3. Test both valid and invalid IDs

Guiding question:

> "Where does the error go now — and why?"

---

# Section 3 — Debugging in Node.js

## Debugging mindset (Pencils Down)

* Don’t panic at stack traces.
* Find the **first meaningful line** in the error message.
* Reproduce the bug consistently.
* Fix one thing at a time.

---

## Common Node/Express errors + coding demos

### 1) “Cannot read properties of undefined”

**Cause:** you assumed a value exists.

**Demo:**

```js
app.get("/profile", (req, res) => {
  const user = null;
  res.json({ name: user.name }); // 💥
});
```

**Fix:**

```js
app.get("/profile", (req, res, next) => {
  const user = null;
  if (!user) return next(new AppError("User not found", 404));
  res.json({ name: user.name });
});
```

---

### 2) “ERR_HEADERS_SENT” (sent response twice)

**Cause:** you tried to respond two times.

**Demo:**

```js
app.get("/double", (req, res) => {
  res.json({ ok: true });
  res.send("Done"); // 💥
});
```

**Fix:** return early:

```js
app.get("/double", (req, res) => {
  return res.json({ ok: true });
});
```

---

### 3) “Port already in use”

**Cause:** server is already running.

**Demo explanation:**

* You started the server twice
* Another app uses that port

**Fix options:**

* Stop previous server (Ctrl+C)
* Change port:

  ```js
  const PORT = 3001;
  app.listen(PORT);
  ```

---

### 4) 404 Not Found (route mismatch)

**Cause:** route path or HTTP method is wrong.

**Demo:**

```js
app.post("/notes", (req, res) => {
  res.json({ created: true });
});
```

If learner hits it in browser, they do GET by default → 404.

**Fix:** use Postman/Thunder Client or fetch:

```js
fetch("/notes", { method: "POST" });
```

---

### 5) 500 Internal Server Error

**Cause:** code crashed.

**Demo:**

```js
app.get("/boom", (req, res) => {
  JSON.parse("not json");
  res.json({ ok: true });
});
```

**Fix:** wrap risky operations:

```js
app.get("/boom", (req, res, next) => {
  try {
    JSON.parse("not json");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
```

---

## Debugging tools (Mention + quick demos)

### `console.log` tracing

```js
app.get("/trace", (req, res) => {
  console.log("Step 1");
  console.log("Params:", req.params);
  res.json({ ok: true });
});
```

### Nodemon (if installed)

* Auto-restarts server on file save
* Helps faster test/fix loop

---

# Wrap-up: The Core Mental Model

### Key takeaway

> “Errors are signals — middleware is how we listen and respond consistently.”

### Exit challenge

Learners must:

1. Create a route that throws an error
2. Ensure it returns a clean JSON error (no HTML)
3. Ensure unknown routes return JSON 404

---

## Optional extension (if class is strong)

* Add a validation middleware for POST `/notes`
* Return a 400 error if title/body missing

Example:

```js
app.post("/notes", (req, res, next) => {
  const { title, body } = req.body;
  if (!title || !body) return next(new AppError("title and body required", 400));

  const newNote = { id: String(notes.length + 1), title, body };
  notes.push(newNote);
  res.status(201).json(newNote);
});
```
