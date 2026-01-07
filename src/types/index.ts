// Tipos de datos para el sistema de gestión de casos y pruebas

export type UserRole = 'Administrador' | 'Postventa' | 'Consulta';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Application {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface Status {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_final: boolean;
  display_order: number;
  created_at: string;
  deleted_at: string | null;
}

export interface CaseType {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface TestType {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface Case {
  id: string;
  title: string;
  description: string | null;
  application_id: string | null;
  category_id: string | null;
  case_type_id: string | null;
  status_id: string;
  responsible_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relaciones pobladas
  application?: Application;
  category?: Category;
  case_type?: CaseType;
  status?: Status;
  responsible?: Profile;
  creator?: Profile;
}

export interface Test {
  id: string;
  title: string;
  description: string | null;
  application_id: string | null;
  category_id: string | null;
  test_type_id: string | null;
  status_id: string;
  responsible_id: string | null;
  case_id: string | null; // Relación opcional con caso
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relaciones pobladas
  application?: Application;
  category?: Category;
  test_type?: TestType;
  status?: Status;
  responsible?: Profile;
  case?: Case;
  creator?: Profile;
}

export interface CaseProgress {
  id: string;
  case_id: string;
  description: string;
  committee_notes: string | null;
  created_by: string | null;
  created_at: string;
  creator?: Profile;
  attachments?: CaseAttachment[];
}

export interface TestProgress {
  id: string;
  test_id: string;
  description: string;
  committee_notes: string | null;
  created_by: string | null;
  created_at: string;
  creator?: Profile;
  attachments?: TestAttachment[];
}

export interface CaseAttachment {
  id: string;
  case_id: string | null;
  progress_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  uploader?: Profile;
}

export interface TestAttachment {
  id: string;
  test_id: string | null;
  progress_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  uploader?: Profile;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_record: Record<string, any> | null;
  new_record: Record<string, any> | null;
  changed_by: string | null;
  changed_at: string;
  changer?: Profile;
}

// Solutions Module Types
export interface Solution {
  id: string;
  case_id: string;
  title: string;
  description: string;
  findings: string | null;
  steps_to_reproduce: string | null;
  steps_to_resolve: string;
  final_result: string | null;
  observations: string | null;
  spl_app_url: string | null;
  additional_app_url: string | null;
  necessary_app: string | null;
  necessary_firmware: string | null;
  tests_performed: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Populated relations
  case?: Case;
  creator?: Profile;
  attachments?: SolutionAttachment[];
  tests?: Test[];
}

export interface SolutionAttachment {
  id: string;
  solution_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  uploaded_by: string | null;
  created_at: string;
  uploader?: Profile;
}

// Tipos para formularios
export interface CaseFormData {
  title: string;
  description: string;
  application_id: string;
  category_id: string;
  case_type_id: string;
  status_id: string;
  responsible_id: string;
}

export interface TestFormData {
  title: string;
  description: string;
  application_id: string;
  category_id: string;
  test_type_id: string;
  status_id: string;
  responsible_id: string;
  case_id?: string | null;
}

export interface ProgressFormData {
  description: string;
  committee_notes?: string;
  files?: File[];
}

export interface SolutionFormData {
  case_id: string;
  title: string;
  description: string;
  findings: string;
  steps_to_reproduce: string;
  steps_to_resolve: string;
  final_result: string;
  observations: string;
  spl_app_url: string;
  additional_app_url: string;
  necessary_app: string;
  necessary_firmware: string;
  tests_performed: boolean;
  selected_tests: string[]; // IDs of selected tests
}

// Tipos para filtros
export interface CaseFilters {
  status_id?: string;
  application_id?: string;
  responsible_id?: string;
  category_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface TestFilters {
  status_id?: string;
  application_id?: string;
  responsible_id?: string;
  category_id?: string;
  case_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface SolutionFilters {
  application_id?: string;
  case_type_id?: string;
  status_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}
