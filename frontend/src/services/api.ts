import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { RFQ, SecureLink } from '@rfq-system/shared';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck() {
    const response = await this.api.get('/health');
    return response.data;
  }

  // Create RFQ
  async createRFQ(rfqData: Partial<RFQ>) {
    const response = await this.api.post('/rfq', rfqData);
    return response.data;
  }

  // Generate secure link for RFQ
  async generateSecureLink(rfqId: string): Promise<SecureLink> {
    const response = await this.api.post(`/rfq/${rfqId}/secure-link`);
    return response.data.data;
  }
}

export const apiService = new ApiService();
export default apiService;
