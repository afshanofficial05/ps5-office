const API_BASE = '/api';

export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('pso_token');
  }
  return null;
};

export const setAuthToken = (token) => {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('pso_token', token);
    } else {
      localStorage.removeItem('pso_token');
    }
  }
};

export async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errData = await res.json();
      errorMessage = errData.detail || errData.message || errorMessage;
    } catch (e) {
      errorMessage = `HTTP error ${res.status}: ${res.statusText}`;
    }
    const error = new Error(errorMessage);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
}

// In-memory cache for high-frequency static datasets (Teams, Leaderboard baselines)
const memoryCache = new Map();

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password, profile_photo) => request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, profile_photo }) }),
  getMe: () => request('/auth/me'),

  // Users & Profiles
  getUsers: (role) => {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    return request(`/users?${params.toString()}`);
  },
  getUserProfile: (userId) => request(`/users/${userId}`),
  updateUser: (userId, data) => request(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  uploadProfilePhoto: (userId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/users/${userId}/photo`, { method: 'POST', body: formData });
  },
  removeProfilePhoto: (userId) => request(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ profile_photo: '' }) }),

  // Matches
  create1v1Match: (teamId, opponentId) => request('/matches/1v1', { method: 'POST', body: JSON.stringify({ team_id: teamId, opponent_id: opponentId }) }),
  create2v2Match: (teamId, teammateId) => request('/matches/2v2', { method: 'POST', body: JSON.stringify({ team_id: teamId, teammate_id: teammateId }) }),
  getMatches: (params = {}) => {
    const q = new URLSearchParams(params);
    return request(`/matches?${q.toString()}`);
  },
  getMatch: (idOrCode) => request(`/matches/${idOrCode}`),
  joinMatch: (matchId, teamId, side) => request(`/matches/${matchId}/join`, { method: 'POST', body: JSON.stringify({ team_id: teamId, side }) }),
  confirmMatch: (matchId) => request(`/matches/${matchId}/confirm`, { method: 'POST' }),
  submitResult: (matchId, data) => request(`/matches/${matchId}/result`, { method: 'POST', body: JSON.stringify(data) }),
  uploadEvidence: (matchId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/matches/${matchId}/evidence`, { method: 'POST', body: formData });
  },
  uploadMatchScreenshot: (file, matchId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (matchId) formData.append('match_id', matchId);
    return request('/matches/upload-screenshot', { method: 'POST', body: formData });
  },
  directSubmitMatch: (data) => request('/matches/direct-submit', { method: 'POST', body: JSON.stringify(data) }),

  // Teams with Smart In-Memory Caching
  getTeams: async (params = {}) => {
    const cacheKey = JSON.stringify(params);
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey);
    }
    const q = new URLSearchParams(params);
    const dataPromise = request(`/teams?${q.toString()}`).then((data) => {
      memoryCache.set(cacheKey, data);
      return data;
    });
    return dataPromise;
  },
  clearTeamCache: () => {
    memoryCache.clear();
  },
  getTeam: (id) => request(`/teams/${id}`),
  createTeam: async (data) => {
    memoryCache.clear();
    return request('/teams', { method: 'POST', body: JSON.stringify(data) });
  },
  updateTeam: async (id, data) => {
    memoryCache.clear();
    return request(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  deleteTeam: async (id) => {
    memoryCache.clear();
    return request(`/teams/${id}`, { method: 'DELETE' });
  },

  // Team Requests
  getTeamRequests: (status) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    return request(`/teams/requests?${params.toString()}`);
  },
  createTeamRequest: (data) => request('/teams/requests', { method: 'POST', body: JSON.stringify(data) }),
  reviewTeamRequest: async (id, data) => {
    memoryCache.clear();
    return request(`/teams/requests/${id}/review`, { method: 'POST', body: JSON.stringify(data) });
  },

  // Leaderboards
  get1v1Leaderboard: () => request('/leaderboard/1v1'),
  get2v2Leaderboard: () => request('/leaderboard/2v2'),
  getTeamLeaderboard: () => request('/leaderboard/teams'),

  // Ratings
  getPlayerRatings: (playerId) => request(`/players/${playerId}/rating`),
  getPlayerRatingHistory: (playerId, mode = '1V1') => request(`/players/${playerId}/rating-history?game_mode=${mode}`),

  // Admin
  getAdminDashboard: () => request('/admin/dashboard'),
  getPendingResults: () => request('/admin/pending-results'),
  approveMatch: (matchId) => request(`/admin/matches/${matchId}/approve`, { method: 'POST' }),
  rejectMatch: (matchId, reason) => request(`/admin/matches/${matchId}/reject`, { method: 'POST', body: JSON.stringify({ approved: false, rejection_reason: reason }) }),
  createManualMatch: (data) => request('/admin/matches/manual', { method: 'POST', body: JSON.stringify(data) }),
  getMatchConfig: () => request('/matches/config'),
  getScreenshotLimit: () => request('/admin/settings/screenshot-limit'),
  updateScreenshotLimit: (limitKb) => request('/admin/settings/screenshot-limit', {
    method: 'POST',
    body: JSON.stringify({ max_screenshot_size_kb: limitKb })
  }),

  // User management
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Super Admin
  getSuperAdminDashboard: () => request('/super-admin/dashboard'),
  getAdmins: () => request('/super-admin/admins'),
  createAdmin: (data) => request('/super-admin/admins', { method: 'POST', body: JSON.stringify(data) }),
  updateAdmin: (id, data) => request(`/super-admin/admins/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getAuditLogs: () => request('/super-admin/audit-logs'),
  getSystemSettings: () => request('/super-admin/settings'),
  updateSystemSettings: (data) => request('/super-admin/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  adjustRating: (data) => request('/super-admin/adjust-rating', { method: 'POST', body: JSON.stringify(data) }),

  // Seasons
  getSeasons: () => request('/seasons'),
  getSeason: (id) => request(`/seasons/${id}`),
  createSeason: (data) => request('/seasons', { method: 'POST', body: JSON.stringify(data) }),
  updateSeason: (id, data) => request(`/seasons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSeason: (id) => request(`/seasons/${id}`, { method: 'DELETE' }),
  calculateSeasonStats: (id) => request(`/seasons/${id}/calculate-stats`, { method: 'POST' }),
  getSeasonResults: (id) => request(`/seasons/${id}/results`),
  manageSeasonResults: (id, data) => request(`/seasons/${id}/results`, { method: 'POST', body: JSON.stringify(data) }),
  getSeasonLeaderboard: (id, mode = '1V1') => request(`/seasons/${id}/leaderboard?game_mode=${mode}`),

  // Reports
  getReportsSummary: () => request('/admin/reports/summary'),
  exportReports: (format = 'json') => request(`/admin/reports/export?format=${format}`),

  // Achievements
  getAchievements: () => request('/achievements'),
  createAchievement: (data) => request('/achievements', { method: 'POST', body: JSON.stringify(data) }),
  updateAchievement: (id, data) => request(`/achievements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAchievement: (id) => request(`/achievements/${id}`, { method: 'DELETE' }),
  assignAchievement: (playerId, achievementId) => request('/achievements/assign', {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, achievement_id: achievementId })
  }),
  revokeAchievement: (playerId, achievementId) => request('/achievements/revoke', {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId, achievement_id: achievementId })
  }),
  getAchievementPlayers: (achievementId) => request(`/achievements/${achievementId}/players`),

  // Bug Reporting & Tracking
  createBugReport: (data) => request('/bugs', { method: 'POST', body: JSON.stringify(data) }),
  getMyBugReports: () => request('/bugs/my'),
  getAllBugReports: (params = {}) => {
    const q = new URLSearchParams(params);
    return request(`/bugs?${q.toString()}`);
  },
  getBugReport: (id) => request(`/bugs/${id}`),
  updateBugReport: (id, data) => request(`/bugs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  uploadBugScreenshot: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/bugs/upload-screenshot', { method: 'POST', body: formData });
  },
};

