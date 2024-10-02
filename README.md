# Deep Value

## Overview

**Deep Value** is a full-stack application designed to determine a stock's intrinsic value using an AI-enhanced Discounted Cash Flow (DCF) model. It integrates LangChain for dynamic workflows, providing users with detailed stock valuation, AI-driven option chain insights, AI-driven technical analysis and AI-driven news and insider transaction sentiment analysis.

## Key Features

1. **User Interface (UI)**

   - Allows users to input stock tickers and financial data such as revenue and growth rates.
   - Displays results of the DCF model, AI-generated explanations, sentiment insights, and visualizations.
   - **Tech Stack**: Developed using React.js/Vue.js and visualized with Chart.js/D3.js for interactive, insightful data displays.

2. **Stock Data Retrieval**

   - Fetches the latest financial data for a given stock ticker.
   - Collects recent insider transaction data to assess insider sentiment.
   - Fetches options chain for analysis
   - **Example APIs**: Alpha Vantage, Yahoo Finance, FinnHub.

3. **Custom DCF Model Service (AI-Enhanced)**

   - Calculates a stock's intrinsic value using a DCF model.
   - Incorporates AI-predicted inputs such as growth rates and profit margins.
   - Provides average, best, and worst-case scenarios with AI-driven explanations.
   - **Tech Stack**: JavaScript-based DCF model implementation with AI enhancements.

4. **AI Service (ChatGPT Integration)**

   - Uses OpenAI’s GPT-3.5 to analyze and provide enhanced insights on DCF results and other stock valuation data.
   - Provides AI-generated recommendations, explanations, and analysis based on the computed stock data.
   - **Tech Stack**: OpenAI’s GPT API integration.

5. **Sentiment Analysis Module**

   - Scrapes news, social media, and earnings call transcripts to assess overall sentiment regarding the stock.
   - Integrates sentiment data to adjust the DCF model's inputs and predict future growth.
   - Analyzes insider sentiment trends based on recent insider transactions.
   - **Tech Stack**: Python, Natural Language Processing (NLP) libraries such as Hugging Face, and web scraping APIs.

6. **Embeddings and Vector Database Integration**

   - Converts textual data, like earnings call transcripts, into vector representations for similarity search.
   - Uses embeddings to identify market patterns, trends, and perform semantic searches for deeper insights.
   - **Tech Stack**: Pinecone/FAISS, Elasticsearch.

7. **Data Storage and Message Queue**

   - Stores user inputs, stock financials, and AI-generated insights for future reference.
   - Implements a message queue to offload non-critical tasks, such as storing embeddings, to background workers for faster processing and reduced latency.
   - **Tech Stack**: PostgreSQL/MongoDB for structured data, AWS S3 for unstructured datasets, Redis/Bull for message queuing.

8. **Visualization Component**

   - Visualizes DCF model outputs, AI explanations, insider transactions, and stock performance.
   - **Tech Stack**: Chart.js/D3.js to create interactive and user-friendly charts and graphs.

9. **LangChain Integration**
   - **Dynamic Workflow**: Utilizes LangChain to connect AI models, stock APIs, and backend systems for a cohesive analysis workflow.
   - **Complex Query Management**: Facilitates seamless chaining of multiple API calls and AI model predictions.
   - **Automated Agents**: Generates autonomous agents for tasks such as analyzing sentiment and providing stock recommendations.
   - **Embeddings Search**: Performs semantic searches across financial reports and other textual data.
   - **Tech Stack**: LangChain.js and LangChain Python for workflow automation.

## Technologies Used

- **Frontend**: React.js, Chart.js/D3.js
- **Backend**: Node.js, Express,
- **APIs**: Alpha Vantage, Yahoo Finance, FinnHub
- **AI Services**: OpenAI GPT-3.5, LangChain.js
- **Data Storage and Queue**: PostgreSQL, Redis/Bull
- **NLP & Sentiment Analysis**: Python, Hugging Face
- **Embeddings & Vector Database**: Pinecone, FAISS, Elasticsearch
- **Server Sent Events**: Speeds up main analysis query by sending reponses as they become available

## Installation

1. Clone the repository.
2. Install dependencies:

   ```
   npm install
   ```

   ```
   npm run dev
   ```

3. In a separate terminal run to start local redis-server
   ```
   redis-server
   ```
