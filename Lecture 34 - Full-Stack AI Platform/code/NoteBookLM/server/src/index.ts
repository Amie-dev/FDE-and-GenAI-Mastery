import express from "express";
import cors from "cors"
import "dotenv/config";
import { auth } from "./lib/auth.js";
import {toNodeHandler} from "better-auth/node"
import { registerRoutes } from "./routes/index.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";

const app = express();
const PORT = process.env.PORT || 8080;
const clientUrl=process.env.CLIENT_URL || 'http://localhost:3000'
app.use(
  cors({
    origin:[clientUrl,"*"],
    credentials:true
  })
)

app.all('/api/auth/{*any}', toNodeHandler(auth));
app.use(express.json())
app.get("/", (req, res) => {
  res.send("Hello world");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    message: "Server is up an running",
    statusCode: 200,
    status:"ok"
  });
});


registerRoutes(app)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`server is running at 8080`);
});
