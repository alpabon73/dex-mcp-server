// test-create-note.ts
import { DexAPIClient } from './src/index.ts';

async function main() {
  const client = new DexAPIClient();
  try {
    const result = await client.createNote(
      '4e87699a-71f4-4dad-9c11-9623c21eb017',
      'Good morning!!',
      '2025-06-03T09:00:00Z',
      'text_messaging'
    );
    console.log('Note created:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error creating note:', err);
  }
}

main();
