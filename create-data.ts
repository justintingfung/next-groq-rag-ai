import { TextLoader } from "langchain/document_loaders/fs/text";
import { createResource } from "@/lib/actions/resources";


const textLoader = new TextLoader('./input.txt');
const textDoc = await textLoader.load();

console.log('start')

await createResource({ content: textDoc[0].pageContent })

console.log('end')
