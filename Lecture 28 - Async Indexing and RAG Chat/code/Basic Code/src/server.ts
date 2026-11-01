import { createApp } from "./app";

const { app, port } = createApp();
app.listen(port, () => {
  console.log(`Lecture 28 basic server running on http://localhost:${port}`);
});