<script setup>
import { ref } from "vue";

const results = ref({
  webhook: [],
  polling: [],
  status: "Not started",
});

const url = ref("");
const errorMessage = ref("");
const isPollingRequestActive = ref(false);

const poll = async (topLevelDomain, crawlId) => {
  console.log("Polling started...", topLevelDomain, crawlId);
  while (true) {
    try {
      isPollingRequestActive.value = true;
      const response = await fetch(`http://localhost:3000/api/poll/${topLevelDomain}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crawlId }),
      });
      isPollingRequestActive.value = false;
      const data = await response.json();
      console.log("Poll check:", data);
      results.value = data;

      if (data.status === "completed") {
        console.log("Polling finished:", data);
        results.value = data;
        isPollingRequestActive.value = false;
        break;
      }
    } catch (error) {
      console.error("Polling error, stopping:", error);
      isPollingRequestActive.value = false;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

const startCrawl = async () => {
  if (results.value.status === "scraping") return;
  results.value.status = "making request for crawl ID...";
  errorMessage.value = "";

  const topLevelDomain = url.value.split("/")[2];

  console.log("Starting crawl for:", url.value);
  try {
    const response = await fetch(`http://localhost:3000/api/crawl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://${topLevelDomain}` }),
    });
    if (!response.ok) {
      const data = await response.json();
      console.error("Error starting crawl:", data);
      errorMessage.value = data.error;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Poll API for status
    await poll(topLevelDomain, data.id);
  } catch (error) {
    console.error("Error starting crawl:", error);
  }
};
</script>

<template>
  <div class="container">
    <h2>Firecrawl Speed Test</h2>
    <p>This test will crawl the website and return the results of the webhook vs polling the Firecrawl status API.</p>
    <p>Completed when the status API completes since the webhook does not return crawl.completed (bug?)</p>
    <div class="input-group">
      <input type="url" v-model="url" placeholder="https://example.com" aria-label="Website URL" @keydown.enter="startCrawl" />
      <button @click="startCrawl">
        {{ results.status === "scraping" ? "Crawling..." : "Start Crawl" }}
      </button>
    </div>
    <div class="error-message" v-if="errorMessage">
      {{ errorMessage }}
    </div>

    <div class="status-area">
      <div class="status-label" :data-status="results.status">
        Status: {{ results.status }}
        <span v-if="isPollingRequestActive" class="loading-indicator"></span>
      </div>
    </div>

    <div class="results-area">
      <div class="column">
        <h2>Webhook</h2>
        <div class="results-number">{{ results.webhook.length }}</div>
        <div class="results-label">pages</div>
      </div>
      <div class="column">
        <h2>Polling</h2>
        <div class="results-number">{{ results.polling.length }}</div>
        <div class="results-label">pages</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 500px;
  margin: 0 auto;
  font-family: sans-serif;
}

.container p {
  text-wrap: balance;
  margin-bottom: 2rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.input-group input {
  flex-grow: 1;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.input-group button {
  padding: 0.5rem 1rem;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.input-group button:hover {
  background-color: #0056b3;
}

.results-area {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  width: 100%;
}

.column {
  flex: 1;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.column h2 {
  margin-top: 0;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.results-number {
  font-size: 3rem;
  font-weight: bold;
}

.status-label {
  text-align: left;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ddd;
  background-color: #f9f9f9;
  position: relative;
}

.status-label[data-status="completed"] {
  background-color: #eaffea;
  color: green;
}

.loading-indicator {
  position: absolute;
  top: 15px;
  right: 15px;
  background-color: orange;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
</style>
