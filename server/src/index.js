import "dotenv/config";
import { createApp, connectDb } from "./app.js";

const PORT = process.env.PORT || 4000;
const app = createApp();

connectDb()
  .then(() => {
    app.listen(PORT, () => console.log(`✓ API on http://127.0.0.1:${PORT}`));
  })
  .catch((e) => {
    console.error("✗ MongoDB connection failed:", e.message);
    process.exit(1);
  });
