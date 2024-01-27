import {embed} from './transformerJsEmbeddings.js'


export default async function processText(textArray, source="unknown") {
    const chunks = await Promise.all(textArray.map(async (text) => {
        const embedding = await embed(text);
        return {
            embedding: embedding,
            content: text,
            fileSource: source,
        };
    }));
    return chunks;
}