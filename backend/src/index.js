import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import locationRoutes from "./routes/locations.routes.js";
import weatherRoutes from "./routes/weather.routes.js";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

app.get("/", (req, res) => {
  res.json({
    message: "Cloudburst Prediction API is running",
    status: "success",
  });
});
app.use("/api/locations", locationRoutes);
app.use("/api/weather", weatherRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
