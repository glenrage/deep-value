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
