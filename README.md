# Firecrawl Speed Test

Simple front and backend to compare the speed between a Firecrawl webhook vs polling the crawl job API. In my experience, the webhook is much faster.

- [Webhook documentation](https://docs.firecrawl.dev/features/crawl#crawl-webhook) - Keep in-mind the `crawl.completed` does not fire
- [Scrape status documentation](https://docs.firecrawl.dev/features/crawl#check-crawl-job) - Keep in-mind that the crawl job payload does
