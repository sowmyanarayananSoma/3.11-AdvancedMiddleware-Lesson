import express from "express";
import notesRoute from "./routes/notes.js"

const app = express();

//1. Add a global middleware

app.get("/hello", (req, res) => {
  res.json({ message: "Hello" });
});

//2. Throw an error using new Error

//3. Throw an error with route-specific middleware function

app.use("/notes",notesRoute);

//4. Route not found middleware function

//5. Error middleware function

app.listen(3000, () => console.log("Server running on http://localhost:3000"));