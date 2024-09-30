const { pineconeQueue } = require('./services/pineconeService');

pineconeQueue.process(async (job) => {
  const { embedding, metadata } = job.data;

  try {
    // Assuming `initPinecone` and the other functions are imported or in scope
    await initPinecone();

    const index = pc.Index(indexName);

    const flatEmbedding = Array.isArray(embedding)
      ? reduceEmbeddingToMatchIndex(embedding, 768)
      : reduceEmbeddingToMatchIndex(Array.from(embedding.data), 768);

    const sentimentString = JSON.stringify(metadata.sentiment);
    const sanitizedId = sanitizeId(metadata.title);

    const existingEmbedding = await index.fetch([sanitizedId]);

    if (
      existingEmbedding &&
      Object.keys(existingEmbedding.records).length > 0
    ) {
      console.log(
        `Embedding for ${metadata.title} already exists in Pinecone. Skipping insertion.`
      );
      return;
    }

    await index.upsert([
      {
        id: sanitizedId,
        values: flatEmbedding,
        metadata: {
          title: metadata.title,
          source: metadata.source,
          author: metadata.author,
          sentiment: sentimentString,
        },
      },
    ]);

    console.log(`Stored embedding for article: ${metadata.title}`);
  } catch (error) {
    console.error('Error storing embedding in Pinecone:', error);
    throw error;
  }
});

console.log('Worker started and listening for jobs...');
