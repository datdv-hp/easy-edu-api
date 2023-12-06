import { IFilterBase } from '@/common/interfaces';

interface IDocumentSubjectData {
  name: string;
  link: string;
}

export interface ISubjectCreateFormData {
  name: string;
  subjectCode: string;
  description?: string;
  documents?: IDocumentSubjectData[];
}

export interface ISubjectUpdateFormData {
  name?: string;
  subjectCode?: string;
  description?: string;
  documents?: IDocumentSubjectData[];
}

export interface ISubjectDropDownData {
  id: string;
  name: string;
}

export interface ISubjectFilter extends IFilterBase {
  courseId?: string;
  classroomId?: string;
}
