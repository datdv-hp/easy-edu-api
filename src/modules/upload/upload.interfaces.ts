export interface IFileInfo {
  key?: string;
  size?: number;
  lastModified?: Date;
  eTag?: string;
  contentType?: string;
  prefix?: string;
  name?: string;
}
