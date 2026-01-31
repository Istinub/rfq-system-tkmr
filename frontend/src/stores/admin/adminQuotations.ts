import { defineStore } from 'pinia';
import { getQuotation, getQuotations, regenerateQuotationPdf, updateQuotation } from '../../services/admin/adminApi';
import type { AdminQuotationDetails, AdminQuotationSummary, AdminQuotationUpdateRequest } from '../../services/admin/types';

export const useAdminQuotationsStore = defineStore('adminQuotations', {
  state: () => ({
    quotations: [] as AdminQuotationSummary[],
    currentQuotation: null as AdminQuotationDetails | null,
    listLoading: false,
    detailLoading: false,
    error: '' as string,
  }),
  actions: {
    async fetchQuotations() {
      this.listLoading = true;
      this.error = '';
      try {
        this.quotations = await getQuotations();
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load quotations.';
      } finally {
        this.listLoading = false;
      }
    },
    async fetchQuotation(id: string) {
      this.detailLoading = true;
      this.error = '';
      try {
        this.currentQuotation = await getQuotation(id);
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load quotation.';
        this.currentQuotation = null;
      } finally {
        this.detailLoading = false;
      }
    },
    async saveQuotation(id: string, payload: AdminQuotationUpdateRequest) {
      this.detailLoading = true;
      this.error = '';
      try {
        this.currentQuotation = await updateQuotation(id, payload);
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to update quotation.';
      } finally {
        this.detailLoading = false;
      }
    },
    async regeneratePdf(id: string) {
      this.detailLoading = true;
      this.error = '';
      try {
        this.currentQuotation = await regenerateQuotationPdf(id);
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to regenerate PDF.';
      } finally {
        this.detailLoading = false;
      }
    },
  },
});
