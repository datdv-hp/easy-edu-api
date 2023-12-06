import { IFilterBase } from '@/common/interfaces';

interface IDocumentFileData {
  link: string;
  mimeType: MimeType;
  name: string;
}

export interface ILectureData {
  name: string;
  referenceLinks?: string[];
  files?: IDocumentFileData[];
}

export interface ISyllabusCreateFormData {
  name: string;
  image?: string;
  lectures?: ILectureData[];
}

export interface ISyllabusUpdateFormData {
  name?: string;
  image?: string;
}

export interface ILectureCreateFormData {
  syllabusId: string;
  note: string;
  lectures: ILectureData[];
}

export interface ILectureUpdateFormData {
  note: string;
  lectures: (ILectureData & { lectureId: string })[];
}

export type ISyllabusFilter = IFilterBase;
