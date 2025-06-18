# Deep Value Sentiment Analysis

## Overview

**Deep Value** is a full-stack application designed to determine a stock's intrinsic value using an AI-enhanced Discounted Cash Flow (DCF) model. It integrates LangChain for dynamic workflows, providing users with detailed stock valuation, AI-driven option chain insights, AI-driven technical analysis and AI-driven news and insider transaction sentiment analysis.

![Image Description](flow.png)

## Key Features

1. **Stock Data Retrieval**

   - Fetches the latest financial data for a given stock ticker.
   - Collects recent insider transaction data to assess insider sentiment.
   - Fetches options chain for analysis
   - **APIs**: Financial Modeling Prep, Yahoo Finance, FinnHub.

2. **Custom DCF Model Service (AI-Enhanced)**

   - Calculates a stock's intrinsic value using a DCF model.
   - Incorporates AI-predicted inputs such as growth rates and profit margins.
   - Provides average, best, and worst-case scenarios with AI-driven explanations.

3. **AI Service (ChatGPT Integration)**

   - Uses OpenAI’s GPT-4 to analyze and provide enhanced insights on DCF results and other stock valuation data.
   - Provides AI-generated recommendations, explanations, and analysis based on the computed stock data.
   - **Tech Stack**: OpenAI’s GPT API integration.

4. **Sentiment Analysis Module**

   - Scrapes news, social media, and earnings call transcripts to assess overall sentiment regarding the stock.
   - Integrates sentiment data to adjust the DCF model's inputs and predict future growth.
   - Analyzes insider sentiment trends based on recent insider transactions.
   - **Tech Stack**: Natural Language Processing (NLP) libraries such as Hugging Face, and web scraping APIs.

5. **Embeddings and Vector Database Integration**

   - Converts news article content for similarity search.
   - Uses embeddings to identify market patterns, trends, and perform semantic searches for deeper insights.
   - **Tech Stack**: Pinecone

6. **Data Storage and Message Queue**

   - Implements a message queue to offload non-critical tasks, such as storing embeddings, to background workers for faster processing and reduced latency.
   - Uses a redis cache if the same ticker symbol is used for efficency
   - **Tech Stack**: Redis/Bull

7. **LangChain Integration**

   - **Dynamic Workflow**: Utilizes LangChain to connect AI models, stock APIs, and backend systems for a cohesive analysis workflow.
   - **Complex Query Management**: Facilitates seamless chaining of multiple API calls and AI model predictions.
   - **Tech Stack**: LangChain.js

   ## LangChain Integration: Enhancing AI Workflows

This application leverages LangChain.js to streamline and enhance interactions with Large Language Models (LLMs) and vector databases. Here's how it's integrated:

1.  **LLM Interaction for Sentiment Analysis & Explanations:**

    - **Prompt Management:** LangChain's `HumanMessagePromptTemplate` and `SystemMessagePromptTemplate` are used in `services/sentimentService.js` (and could be adopted in `services/openaiService.js`) to create structured and reusable prompts for tasks like:
      - Analyzing the sentiment of news articles.
      - Generating AI-driven explanations for DCF results, technical analysis, and options chain data.
    - **Simplified LLM Calls:** `ChatOpenAI` from `@langchain/openai` provides a consistent interface to interact with OpenAI models (like GPT-3.5-turbo), abstracting away some of_the direct API call complexities.

2.  **Document Processing for Embeddings & RAG:**

    - **Text Splitting:** For long documents like earnings call transcripts, `RecursiveCharacterTextSplitter` from LangChain (`services/embeddingService.js`) is used to break down the text into manageable chunks suitable for creating embeddings. This is crucial for staying within the token limits of embedding models.
    - **Vector Store Interaction:** LangChain's `PineconeStore` (from `@langchain/pinecone`) facilitates the process of:
      - Creating embeddings from text documents (news articles, transcript chunks) using models like OpenAI's `text-embedding-ada-002`.
      - Storing these embeddings along with their metadata in the Pinecone vector database.
      - Querying Pinecone for semantically similar documents (as seen in `services/sentimentService.js`'s `querySimliarArticles` and potentially for RAG in `EarningsChatCard`).

3.  **Foundation for Retrieval Augmented Generation (RAG):**

    - The embeddings stored via LangChain are fundamental for RAG. When a user asks a question about an earnings call (in `EarningsChatCard`), the application can:
      1.  Embed the user's query.
      2.  Use LangChain (or direct Pinecone queries informed by LangChain's structuring) to retrieve relevant chunks from the stored earnings transcript embeddings.
      3.  Feed these retrieved chunks, along with the original query, into an LLM to generate a contextually relevant answer.
    - This allows the LLM to answer questions based on specific information within the documents, rather than just its general knowledge.

4.  **Potential for Advanced Agentic Workflows (Future Enhancement):**
    - While not extensively used in the current version for complex API chaining, LangChain's concepts of "Chains," "Tools," and "Agents" provide a powerful framework for future enhancements. For example, an Agent could be developed to:
      - Dynamically decide which financial APIs to call based on a user query.
      - Process the results from multiple APIs.
      - Summarize findings or feed them into another LLM call for a comprehensive report.

By using LangChain, the application benefits from modular components, easier integration with LLMs and vector stores, and a clear path for building more sophisticated AI-powered data analysis features.

## Installation

1. Clone the repository.
2. Ensure you are in the root director:
3. Install dependencies

   ```
   npm install:all
   ```

4. Start the app, preferably in two terminal windows

   ```
   npm run dev:server
   ```

   ```
   npm run dev:client
   ```

   or run to start client and server in a single terminal

   ```
   npm run dev
   ```
