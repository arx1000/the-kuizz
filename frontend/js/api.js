class Api {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('quizToken');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('quizToken', token);
    } else {
      localStorage.removeItem('quizToken');
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.errors?.[0]?.msg || 'Request failed');
    }

    return data;
  }

  async register(username, email, password) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(data.token);
    return data;
  }

  async createGuest(username) {
    const data = await this.request('/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
    this.setToken(data.token);
    return data;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async createQuiz(quizData) {
    return this.request('/quiz', {
      method: 'POST',
      body: JSON.stringify(quizData)
    });
  }

  async getQuizzes(search = '', limit = 20, offset = 0) {
    return this.request(`/quiz?search=${encodeURIComponent(search)}&limit=${limit}&offset=${offset}`);
  }

  async getMyQuizzes() {
    return this.request('/quiz/my');
  }

  async getQuiz(id) {
    return this.request(`/quiz/${id}`);
  }

  async updateQuiz(id, quizData) {
    return this.request(`/quiz/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quizData)
    });
  }

  async deleteQuiz(id) {
    return this.request(`/quiz/${id}`, {
      method: 'DELETE'
    });
  }
}

const api = new Api(API_BASE);
