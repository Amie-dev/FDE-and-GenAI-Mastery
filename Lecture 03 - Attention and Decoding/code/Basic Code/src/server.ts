import { createApp } from "./app";
import { config } from "./config/config";

const app = createApp();

app.listen(config.port, () => {
  console.log(`Lecture 03 - Attention and Decoding (basic code) listening on http://localhost:${config.port}/api`);
  console.log(`default shape: ${config.defaultShape} · decoding: T=${config.temperature} top-p=${config.topP} seed=${config.seed}`);
  console.log(
    `shapes: ${config.shapes
      .map((shape) => `${shape.id} (d_model ${shape.dModel}, h ${shape.nHeads}, d_head ${config.dHead(shape)})`)
      .join(" · ")}`,
  );
});
