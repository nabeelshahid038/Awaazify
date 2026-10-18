import {
  AdminModelPayload,
  CoverGeneratePayload,
  LocalPaymentPayload,
  VoiceTrainPayload,
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.DEV
    ? 'http://localhost:8000'
    : '';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const awaazifyApi = {
  /**
   * Upload file to Supabase Storage Bucket
   */
  async uploadFileToStorage(
    bucket: 'raw-uploads' | 'payment-screenshots' | 'final-songs' | 'rvc-models',
    file: File | Blob,
    filePath: string
  ): Promise<string> {
    if (!isSupabaseConfigured) {
      console.warn(`[Supabase Storage] Supabase not fully configured. Using mock storage URL for ${filePath}`);
      return `${API_BASE_URL}/temp_audio/${filePath}`;
    }

    try {
      const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
        upsert: true,
      });

      if (error) {
        console.error(`[Supabase Storage] Upload error to ${bucket}:`, error);
        return `${API_BASE_URL}/temp_audio/${filePath}`;
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error(`[Supabase Storage] Exception during upload:`, err);
      return `${API_BASE_URL}/temp_audio/${filePath}`;
    }
  },

  /**
   * POST /api/v1/covers/generate
   */
  async generateSongCover(
    payload: CoverGeneratePayload,
    onProgressStage?: (stage: 1 | 2 | 3, percent: number) => void
  ): Promise<{ jobId: string; status: 'completed'; audioUrl: string }> {
    console.info(`[API] POST ${API_BASE_URL}/api/v1/covers/generate`, payload);

    // Visual Stage 1 (0% - 35%): Separating music from singing voice
    onProgressStage?.(1, 15);
    await delay(300);
    onProgressStage?.(1, 35);

    try {
      // Visual Stage 2 (35% - 80%): Changing singing voice via RVC
      onProgressStage?.(2, 55);

      const response = await fetch(`${API_BASE_URL}/api/v1/covers/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Visual Stage 3 (80% - 100%): Mixing music back together
      onProgressStage?.(3, 88);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      onProgressStage?.(3, 100);

      // Format audio URL
      let finalAudioUrl = data.outputAudioUrl;
      if (finalAudioUrl && !finalAudioUrl.startsWith('http') && !finalAudioUrl.startsWith('/')) {
        finalAudioUrl = `${API_BASE_URL}/${finalAudioUrl}`;
      }

      return {
        jobId: data.jobId,
        status: 'completed',
        audioUrl: finalAudioUrl || `/songs/${payload.voiceModelId}_cover.mp3`,
      };
    } catch (err: any) {
      console.error(`[API] FastAPI cover generation error:`, err);
      throw new Error(err.message || 'Failed to generate song cover. Please check the backend connection.');
    }
  },

  /**
   * POST /api/v1/voices/train
   */
  async trainCustomVoice(
    payload: VoiceTrainPayload
  ): Promise<{ trainingJobId: string; estimatedMinutes: number }> {
    console.info(`[API] POST ${API_BASE_URL}/api/v1/voices/train`, payload);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/voices/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Training error: ${response.status}`);
      }

      const data = await response.json();
      return {
        trainingJobId: data.trainingJobId,
        estimatedMinutes: data.estimatedMinutes || 5,
      };
    } catch (err: any) {
      console.warn(`[API] Voice training call fallback: ${err.message}`);
      return {
        trainingJobId: `voice_${Date.now().toString(36)}`,
        estimatedMinutes: 5,
      };
    }
  },

  /**
   * POST /api/v1/payments/local-verify
   */
  async submitLocalPayment(
    payload: LocalPaymentPayload
  ): Promise<{ paymentId: string; status: 'Pending' }> {
    console.info(`[API] POST ${API_BASE_URL}/api/v1/payments/local-verify`, payload);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/payments/local-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Payment error: ${response.status}`);
      }

      const data = await response.json();
      return {
        paymentId: data.paymentId,
        status: 'Pending',
      };
    } catch (err: any) {
      console.warn(`[API] Local payment call fallback: ${err.message}`);
      return {
        paymentId: `pay_${Date.now().toString(36)}`,
        status: 'Pending',
      };
    }
  },

  /**
   * POST /api/v1/admin/models
   */
  async createAdminVoiceModel(
    payload: AdminModelPayload
  ): Promise<{ modelId: string; createdAt: string }> {
    console.info(`[API] POST ${API_BASE_URL}/api/v1/admin/models`, payload);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Model creation error: ${response.status}`);
      }

      const data = await response.json();
      return {
        modelId: data.modelId,
        createdAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn(`[API] Admin model creation fallback: ${err.message}`);
      return {
        modelId: `vm_${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
      };
    }
  },

  /**
   * POST /api/v1/admin/payments/{paymentId}/approve
   */
  async approvePayment(paymentId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/v1/admin/payments/${paymentId}/approve`, {
        method: 'POST',
      });
    } catch (err) {
      console.warn('[API] Approve payment error:', err);
    }
  },

  /**
   * POST /api/v1/admin/payments/{paymentId}/reject
   */
  async rejectPayment(paymentId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/v1/admin/payments/${paymentId}/reject`, {
        method: 'POST',
      });
    } catch (err) {
      console.warn('[API] Reject payment error:', err);
    }
  },

  /**
   * POST /api/v1/admin/training-jobs/{jobId}/publish
   */
  async publishTrainedVoice(
    jobId: string,
    payload: { modelFileUrl: string; indexFileUrl?: string; demoAudioUrl?: string }
  ): Promise<{ voiceModelId: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/training-jobs/${jobId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return { voiceModelId: data.voiceModelId };
    } catch (err) {
      console.warn('[API] Publish trained voice error:', err);
      return { voiceModelId: `vm_custom_${Date.now().toString(36)}` };
    }
  },
};
