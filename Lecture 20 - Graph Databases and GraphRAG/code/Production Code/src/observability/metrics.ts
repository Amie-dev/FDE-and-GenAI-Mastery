import { Counter, Histogram, Gauge } from "prom-client";

// Metrics for GraphRAG pipeline
export const ragRequestsTotal = new Counter({
  name: "rag_requests_total",
  help: "Total GraphRAG requests processed",
  labelNames: ["status"],
});

export const ragLatencyHistogram = new Histogram({
  name: "rag_latency_ms",
  help: "GraphRAG request latency in milliseconds",
  labelNames: ["phase"],
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
});

export const vectorSearchHits = new Gauge({
  name: "vector_search_hits",
  help: "Number of vector search hits for the last request",
});

export const graphExpansionNodes = new Gauge({
  name: "graph_expansion_nodes",
  help: "Number of graph nodes expanded in last request",
});

export const activeSessions = new Gauge({
  name: "active_sessions",
  help: "Number of active agent sessions",
});

export function collectDefaultMetrics(): void {
  require("prom-client").collectDefaultMetrics();
}