/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FileEntry {
  id?: number;
  name: string;
  type: string;
  size: number;
  data: Blob;
  tags: string[];
  notes: string;
  createdAt: number;
  lastModified: number;
  aiMetadata?: {
    description: string;
    keywords: string[];
    extractedText: string;
  };
}
