import { promises as fs } from 'fs';
import path from 'path';

export class SaveCache<T> {
  private filePath: string;

  constructor(fileName: string) {
    this.filePath = path.resolve(__dirname, fileName);
  }

  async saveToFile(data: T): Promise<void> {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`✅ Results saved at ${this.filePath}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('❌ Error saving results:', error.message);
      } else {
        console.error('❌ Error saving results:', String(error));
      }
    }
  }

  async loadFromFile(defaultValue: T): Promise<T> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch {
      return defaultValue; // retorna um valor padrão se não existir
    }
  }
}
