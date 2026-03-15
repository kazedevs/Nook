export interface FileItem {
  path: string;
  name: string;
  size: number;
  is_directory: boolean;
  file_type?: string;
  modified?: string;
  children?: FileItem[];
}

export interface ScanResult {
  root_path: string;
  total_size: number;
  file_count: number;
  directory_count: number;
  largest_files: FileItem[];
  file_types: FileTypeStat[];
  tree?: FileItem;
}

export interface FileTypeStat {
  extension: string;
  total_size: number;
  count: number;
  percentage: number;
}

export interface SystemInfo {
  total_disk_space: number;
  available_disk_space: number;
  used_disk_space: number;
  os_name: string;
  os_version: string;
}

export interface LicenseInfo {
  key: string;
  activated_at: string;
  email?: string;
}

export interface ScanRequest {
  path: string;
  max_depth?: number;
}

export interface DeleteRequest {
  path: string;
}
