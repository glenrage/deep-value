# Deep Value Sentiment Analysis

## Overview

**Deep Value** is a full-stack application designed to determine a stock's intrinsic value using an AI-enhanced Discounted Cash Flow (DCF) model. It integrates LangChain for dynamic workflows, providing users with detailed stock valuation, AI-driven option chain insights, AI-driven technical analysis, AI-driven news sentiment analysis, and an autonomous agent for quick stock snapshots.

![Image Description](flow.png)

## Key Features

1.  **Stock Data Retrieval**

    - Fetches latest financial data, insider transactions, and options chains.
    - **APIs**: Financial Modeling Prep, Yahoo Finance, FinnHub (or other provider for insider data).

2.  **Custom DCF Model Service (AI-Enhanced Explanations)**

    - Calculates intrinsic value using a DCF model with data-derived inputs.
    - Provides average, best, and worst-case scenarios with AI-driven explanations of the results.

3.  **AI Services (OpenAI Integration)**

    - Utilizes OpenAI's GPT models (e.g., GPT-3.5-turbo) for analysis and insights.
    - Generates explanations for DCF, technical analysis, options chains, and synthesizes agent responses.

4.  **Sentiment Analysis Module**

    - Analyzes sentiment of financial news articles using LLMs.
    - Scrapes earnings call transcripts for an AI-powered Q&A feature.
    - _(Note: Social media scraping and direct sentiment adjustment of DCF inputs are potential future enhancements.)_

5.  **Embeddings and Vector Database Integration (Pinecone)**

    - Converts news articles and earnings transcripts into vector embeddings using OpenAI models.
    - Stores embeddings in Pinecone for semantic search and Retrieval Augmented Generation (RAG).

6.  **Data Storage and Message Queue (Redis/BullMQ)**

    - Offloads embedding storage to background workers via BullMQ and Redis, enhancing API responsiveness.
    - _(Note: General API response caching with Redis is a potential future enhancement.)_

7.  **LangChain Integration & Autonomous Agent**
    - Leverages LangChain.js for LLM interaction, prompt management, document processing, vector store operations, and agent creation.
    - Features an **Autonomous "Quick Stock Snapshot" Agent** that can understand user requests, utilize multiple tools to fetch real-time data (price, news sentiment, technical analysis), and synthesize a concise summary.

## LangChain Integration: Enhancing AI Workflows

This application leverages LangChain.js to streamline and enhance interactions with Large Language Models (LLMs), vector databases, and to build autonomous agents. Here's how it's integrated:

1.  **LLM Interaction for Sentiment Analysis & Explanations:**

    - **Prompt Management:** LangChain's `ChatPromptTemplate` and `MessagesPlaceholder` construct dynamic and structured prompts for tasks like analyzing news sentiment or generating explanations for financial data.
    - **Simplified LLM Calls:** `ChatOpenAI` from `@langchain/openai` provides a consistent interface to interact with OpenAI models.

2.  **Document Processing for Embeddings & RAG:**

    - **Text Splitting:** `RecursiveCharacterTextSplitter` breaks down earnings call transcripts into manageable chunks for embedding.
    - **Vector Store Interaction:** LangChain's `PineconeStore` (or direct Pinecone SDK usage facilitated by LangChain concepts) manages the creation of embeddings from text (news, transcripts) and their storage in Pinecone. This also powers querying for semantically similar documents.

3.  **Foundation for Retrieval Augmented Generation (RAG):**

    - The stored embeddings are fundamental for the RAG feature in the `EarningsChatCard`. User queries are embedded, relevant transcript chunks are retrieved from Pinecone, and both are passed to an LLM for context-aware answers.

4.  **Autonomous Agent for "Quick Stock Snapshot":**
    - **Agent Creation:** The application uses LangChain's `createOpenAIFunctionsAgent` and `AgentExecutor` to build an autonomous agent.
    - **Tools:** The agent is equipped with custom tools (built using `DynamicTool`) that wrap existing backend services to:
      - Fetch current stock prices.
      - Get summaries of recent news sentiment.
      - Retrieve key technical analysis signals.
    - **Decision Making:** The LLM, guided by a system prompt, analyzes the user's request for a stock snapshot. It then autonomously decides which tool(s) to call and in what sequence to gather the necessary information.
    - **Information Synthesis:** After executing the tools, the agent receives their outputs (observations) and uses the LLM to synthesize these diverse data points into a single, coherent, and concise summary for the user.
    - This demonstrates an end-to-end agentic workflow where the AI can orchestrate multiple data retrieval tasks and reason over the results.

By using LangChain, the app benefits from modular components, easier integration with LLMs and vector stores, a clear path for building more sophisticated AI-powered features, and the ability to create autonomous agents that can interact with defined tools.

## Security Considerations: Basic Prompt Injection Defense

While robust prompt injection defense is an ongoing challenge in AI security, this application implements basic measures for the "Quick Stock Snapshot" agent:

1.  **Input Sanitization:** User queries to the agent are passed through a `sanitizeInput` function which:
    - Checks for common keywords and phrases often used in prompt injection attempts (e.g., "ignore previous instructions," "reveal your system prompt").
    - Enforces a maximum length for user input to prevent overly long or complex injection payloads.
2.  **System Prompt Reinforcement:** The system prompt for the agent explicitly instructs it to:
    - Stick to its designated task (providing stock snapshots).
    - Not follow user instructions that try to override its core directives or ask it to roleplay.
    - Politely refuse off-topic requests.

These measures provide a foundational layer of defense, though it's acknowledged that sophisticated attacks may still be possible. In a production environment with sensitive operations, more advanced detection models, output validation, and human oversight would be considered.

## Installation

1.  Clone the repository.
2.  Ensure you are in the root directory. (It's generally better to specify installing dependencies in `server` and `client` directories separately).
    - Navigate to the `server` directory: `cd server`
    - Install server dependencies: `npm install`
    - Navigate to the `client` directory: `cd ../client`
    - Install client dependencies: `npm install`
    - (Or, if `npm install:all` is a script in your root `package.json` that does this, keep it).
3.  Set up your `.env` file in the `server` directory with necessary API keys (OpenAI, Pinecone, market data provider).
4.  Start the application:
    - In one terminal (from the root or `server` directory): `npm run dev:server` (or your command to start the backend with Nodemon)
    - In another terminal (from the `client` directory): `npm start` (or your command to start the React client)
    - Alternatively, if your root `npm run dev` script handles both: `npm run dev` (from the root directory)

---
