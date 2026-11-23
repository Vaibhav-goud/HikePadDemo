import { BackendLoginResponse, TeamsData, SalesRecord, SystemUpdate, User } from '@/types';
import { dummySalesRecords, dummyUsers, dummyDrives } from '@/data/dummyData';

export const API_BASE_URL = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE_URL) || import.meta.env.VITE_API_BASE_URL || '';

class ApiService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    };

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Get the response body as text first to handle non-JSON errors
      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        // If not JSON, use the text or a generic message
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${responseText || response.statusText}`);
        }
        data = { message: responseText };
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error: any) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async login(username: string, password: string): Promise<BackendLoginResponse> {
    return this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ userId: username, password }),
    });
  }

  async getMasterData(): Promise<SalesRecord[]> {
    try {
      const data = await this.request('/api/data');
      return Array.isArray(data) && data.length > 0 ? data : dummySalesRecords;
    } catch {
      return dummySalesRecords;
    }
  }

  async getKRAReports(branch?: string): Promise<any[]> {
    const url = branch ? `/api/kra-reports?branch=${branch}` : '/api/kra-reports';
    return this.request(url);
  }

  async updateUserStatus(name: string, branch: string, inactive?: boolean, isCurrentTeamMember?: boolean, teamName?: string): Promise<any> {
    const body: any = { branch };
    if (inactive !== undefined) body.inactive = inactive;
    if (isCurrentTeamMember !== undefined) body.isCurrentTeamMember = isCurrentTeamMember;
    if (teamName !== undefined) body.teamName = teamName;
    return this.request(`/api/users/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async updateUser(name: string, branch: string, updates: Partial<{ name: string; email?: string; role: string; branch: string; inactive: boolean; password?: string, assignedAtls?: string[] }>): Promise<any> {
    const { branch: newBranch, ...otherUpdates } = updates;
    const body = {
      ...otherUpdates,
      branch, // Current branch for finding the user
      ...(newBranch && newBranch !== branch ? { newBranch } : {})
    };
    return this.request(`/api/users/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async updateAssignedAtls(teamLeaderName: string, branch: string, assignedAtls: string[]): Promise<any> {
    return this.request(`/api/users/${encodeURIComponent(teamLeaderName)}`, {
      method: 'PUT',
      body: JSON.stringify({ branch, assignedAtls }),
    });
  }

  async deleteUser(name: string, branch: string): Promise<any> {
    return this.request(`/api/users/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      body: JSON.stringify({ branch }),
    });
  }

  async updateUserRole(name: string, branch: string, newRole: string): Promise<any> {
    return this.request('/api/user/role', {
      method: 'PUT',
      body: JSON.stringify({ name, branch, newRole }),
    });
  }

  async updateBdeTeam(bdeName: string, newTeamLeader: string, month: string, branch: string): Promise<any> {
    return this.request('/api/bde-team', {
      method: 'PUT',
      body: JSON.stringify({ bdeName, newTeamLeader, month, branch }),
    });
  }

  async getTeams(): Promise<TeamsData> {
    return this.request('/api/teams');
  }

  async getBdeNames(): Promise<string[]> {
    return this.request('/api/bde-names');
  }

  async getUsers(): Promise<User[]> {
    try {
      const users = await this.request('/api/users');
      return Array.isArray(users) && users.length > 0 ? users : dummyUsers;
    } catch {
      return dummyUsers;
    }
  }

  async uploadExcel(formData: FormData): Promise<any> {
    const url = `${API_BASE_URL}/api/upload-excel`;
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('Excel upload failed:', error);
      throw error;
    }
  }

  async getDrives(): Promise<any[]> {
    try {
      const drives = await this.request(`/api/drives?cacheBust=${new Date().getTime()}`);
      return Array.isArray(drives) && drives.length > 0 ? drives : dummyDrives;
    } catch {
      return dummyDrives;
    }
  }

  async createDrive(name: string, startMonth: string, startYear: number, endMonth: string, endYear: number): Promise<any> {
    return this.request('/api/drives', {
      method: 'POST',
      body: JSON.stringify({ name, startMonth, startYear, endMonth, endYear }),
    });
  }

  async updateTeamName(teamLeader: string, teamName: string, branch: string): Promise<any> {
    return this.request('/api/team-name', {
      method: 'PUT',
      body: JSON.stringify({ teamLeader, teamName, branch }),
    });
  }

  async createUser(name: string, email: string, password: string, role: string, branch: string, createdByAdmin: boolean = false, isNewJoinee?: boolean, selectedTeam?: string): Promise<any> {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, branch, createdByAdmin, isNewJoinee, selectedTeam }),
    });
  }

  async getRoles(): Promise<string[]> {
    return this.request('/api/roles');
  }

  async sendAccessEmail(userIds: string[]): Promise<any> {
    return this.request('/api/send-access-email', {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  }

  async validatePasswordToken(token: string): Promise<any> {
    return this.request(`/api/set-password/${token}`);
  }

  async setPassword(token: string, password: string): Promise<any> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword: password }),
    });
  }
  async sendBulkEmail(subject: string, message: string, updateName?: string): Promise<any> {
    return this.request('/api/admin/send-bulk-email', {
      method: 'POST',
      body: JSON.stringify({ subject, message, updateName }),
    });
  }

  async getLatestUpdate(): Promise<{ update: SystemUpdate | null }> {
    return this.request('/api/latest-update');
  }

  async getDetails(params: { page?: number; limit?: number; startDate?: string; endDate?: string; status?: string; sort?: string; collection?: string }): Promise<any> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value.toString());
      }
    });
    return this.request(`/api/details?${query.toString()}`);
  }

  async getDetailMonths(): Promise<{ collections: string[] }> {
    return this.request('/api/details/months');
  }

  async getDetailStats(collection?: string): Promise<{ pieData: any[]; treemapData: any[] }> {
    const url = collection ? `/api/details/stats?collection=${collection}` : '/api/details/stats';
    return this.request(url);
  }

  async getRecordDetail(id: string, collection: string): Promise<any> {
    return this.request(`/api/details/record?id=${id}&collection=${collection}`);
  }

  async syncDetails(): Promise<any> {
    return this.request('/api/details/sync', {
      method: 'POST',
    });
  }

  async getAdmissions(params: { branch?: string; admissionStatus?: string; bdeName?: string; bdeNameNormalized?: string; startDate?: string; endDate?: string }): Promise<any[]> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    return this.request(`/api/admissions?${query.toString()}`);
  }

  async getAdmissionStatuses(): Promise<string[]> {
    return this.request('/api/admissions/statuses');
  }

  async getAdmissionsBdeStats(params: { branch?: string; admissionStatus?: string; startDate?: string; endDate?: string; universityName?: string; fy?: string } = {}): Promise<any[]> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    return this.request(`/api/admissions/stats/bde?${query.toString()}`);
  }

  async getAdmissionsTeamStats(params: { branch?: string; admissionStatus?: string; startDate?: string; endDate?: string; universityName?: string; fy?: string } = {}): Promise<any[]> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    return this.request(`/api/admissions/stats/team?${query.toString()}`);
  }

  async getAdmissionsUniversityStats(params: { branch?: string; admissionStatus?: string; startDate?: string; endDate?: string; universityName?: string; fy?: string } = {}): Promise<any[]> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    return this.request(`/api/admissions/stats/university?${query.toString()}`);
  }

  async getAdmissionsFinancialStats(params: { branch?: string; admissionStatus?: string; startDate?: string; endDate?: string; universityName?: string } = {}): Promise<{ feeType: any[], paymentMode: any[] }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value);
    });
    return this.request(`/api/admissions/stats/financial?${query.toString()}`);
  }

  async getSourceLeaders(branch?: string): Promise<any[]> {
    const url = branch ? `/api/admissions/stats/source-leaders?branch=${branch}` : '/api/admissions/stats/source-leaders';
    return this.request(url);
  }

  async getMarchMadnessStats(): Promise<any[]> {
    return this.request('/api/march-madness/stats');
  }

  async getMarchMadnessTrios(): Promise<any[]> {
    return this.request('/api/march-madness/teams'); // Keeping path the same for now to avoid breaking backend
  }

  async saveMarchMadnessTrio(trio: { trioName: string, members: string[], branch: string }): Promise<any> {
    return this.request('/api/march-madness/teams', {
      method: 'POST',
      body: JSON.stringify({
        teamName: trio.trioName, // Backend still expects teamName
        members: trio.members,
        branch: trio.branch
      }),
    });
  }

  async deleteMarchMadnessTrio(trioName: string): Promise<any> {
    return this.request(`/api/march-madness/teams/${encodeURIComponent(trioName)}`, {
      method: 'DELETE',
    });
  }

  async getMarchMadnessImages(): Promise<any[]> {
    return this.request('/api/march-madness/images');
  }

  async uploadCompetitionImages(files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/admin/march-madness/images`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        // Note: Do not set Content-Type header when sending FormData, the browser will handle it
      },
      body: formData,
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned non-JSON response (${response.status}): ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) throw new Error(data.error || 'Failed to upload images');
    return data;
  }

  async getUserImages(): Promise<any[]> {
    return this.request('/api/user-images');
  }

  async uploadUserImages(files: FileList | File[], name?: string): Promise<any> {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('images', file);
    });
    if (name) {
      formData.append('name', name);
    }

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/admin/user-images`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Server returned non-JSON response (${response.status}): ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) throw new Error(data.error || 'Failed to upload user images');
    return data;
  }

  async updateUserImageName(id: string, name: string): Promise<any> {
    return this.request(`/api/admin/user-images/${id}/name`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteUserImage(id: string): Promise<any> {
    return this.request(`/api/admin/user-images/${id}`, {
      method: 'DELETE',
    });
  }

}

export const api = new ApiService();
