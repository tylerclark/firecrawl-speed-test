import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";

const filePath = "server.json";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// If there is no server.json file, create one
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, JSON.stringify({}), "utf-8");
}

function readStore() {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeStore(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function getTopLevelDomain(url) {
  const urlObj = new URL(url);
  const hostnameParts = urlObj.hostname.split(".");
  return hostnameParts.slice(-2).join(".");
}

app.post("/api/crawl", async (req, res) => {
  console.log("--------------------------------");
  console.log(`Incoming: /api/crawl`);
  const { url } = req.body;

  if (!process.env.SERVER_URL) return res.status(500).json({ error: "SERVER_URL is not set in .env file" });
  if (!process.env.FIRECRAWL_API_KEY) return res.status(500).json({ error: "FIRECRAWL_API_KEY is not set in .env file" });

  // Get TLD
  const topLevelDomain = getTopLevelDomain(url);
  console.log("Top Level Domain:", topLevelDomain);

  // Set webhook URL
  const webhookUrl = `${process.env.SERVER_URL}/api/webhook/${topLevelDomain}`;

  // Clear store for TLD
  try {
    const store = readStore();
    store[topLevelDomain] = [];
    writeStore(store);
  } catch (error) {
    console.error("Error clearing store", error);
    return res.status(500).json({ error: "Error clearing store" });
  }

  console.log("Crawl Requested URL", url);
  console.log("Webhook URL", webhookUrl);

  const response = await fetch(`https://api.firecrawl.dev/v1/crawl`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      webhook: webhookUrl,
      allowExternalLinks: false,
      limit: 49,
      scrapeOptions: {
        excludeTags: ["img", "iframe", "input", "button", "script", "style", "noscript", "svg"],
      },
    }),
  });
  const data = await response.json();
  if (data.success) {
    console.log("Crawl", data);

    res.json({ id: data.id });
  } else {
    if (data.error.includes("Invalid token")) {
      console.error("Invalid token. Please add FIRECRAWL_API_KEY to .env file");
      res.status(401).json({ error: "Unauthorized" });
    } else {
      console.error("Error", data.error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

app.post("/api/webhook/:topLevelDomain", (req, res) => {
  console.log("--------------------------------");
  console.log(`Incoming: /api/webhook/${req.params.topLevelDomain}`);
  console.log(req.body.type);
  const topLevelDomain = req.params.topLevelDomain;

  if (req.body.type === "crawl.page") {
    const url = req.body.data[0].metadata.url;
    console.log("url", url);
    const store = readStore();
    store[topLevelDomain] = store[topLevelDomain] || [];
    store[topLevelDomain].push(url);
    writeStore(store);
  }
  res.json({ message: "Webhook received" });
});

app.post("/api/poll/:topLevelDomain", async (req, res) => {
  const { crawlId } = req.body;
  const topLevelDomain = req.params.topLevelDomain;

  // Check server.json (from webhook)
  const store = readStore();
  const webhookUrls = store[topLevelDomain] || [];

  // Check firecrawl status url
  const firecrawlStatusUrl = `https://api.firecrawl.dev/v1/crawl/${crawlId}`;
  const firecrawlStatusResponse = await fetch(firecrawlStatusUrl, {
    headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}` },
  });
  const firecrawlStatusData = await firecrawlStatusResponse.json();
  const pollingUrls = firecrawlStatusData.data.map((page) => page.metadata.url);

  const returnObj = {
    status: firecrawlStatusData.status,
    webhook: webhookUrls,
    polling: pollingUrls,
  };

  res.json(returnObj);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
