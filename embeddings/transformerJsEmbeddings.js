
import { pipeline, env } from '@xenova/transformers';


// Skip initial check for local models, since we are not loading any local models.
env.allowLocalModels = false;

// Due to a bug in onnxruntime-web, we must disable multithreading for now.
// See https://github.com/microsoft/onnxruntime/issues/14445 for more information.
env.backends.onnx.wasm.numThreads = 1;


class PipelineSingleton {

    static task = "feature-extraction"// 'text-classification';
    static model = "Supabase/gte-small"// 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline("feature-extraction", "Supabase/gte-small", { progress_callback }); // pipeline(this.task, this.model, { progress_callback });
        }

        return this.instance;
    }
}

export const embed = async (text) => {
    // const pipe = await pipeline("feature-extraction", "Supabase/gte-small");
    let model = await PipelineSingleton.getInstance((data) => { // singleton
        // You can track the progress of the pipeline creation here.
        // e.g., you can send `data` back to the UI to indicate a progress bar
        // console.log('progress', data)
    });
    

    console.log('text', text)

    const embeddings = await 
        
        model(text, {
            pooling: "mean",
            normalize: true,
        })

  
    console.log('embeddings', embeddings)
    return embeddings //result;
};
