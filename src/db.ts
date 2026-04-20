import Dexie, { type Table } from 'dexie';
import { type FileEntry } from './types';

export class FileOrganizerDB extends Dexie {
  files!: Table<FileEntry>;

  constructor() {
    super('FileOrganizerDB');
    this.version(1).stores({
      files: '++id, name, type, size, *tags, notes, createdAt, lastModified'
    });
  }
}

export const db = new FileOrganizerDB();
