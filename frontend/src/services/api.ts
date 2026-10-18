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

/**
 * P0: attach the caller's Supabase access JWT to every backend request.
 * The backend verifies this token server-side on every route (401 otherwise).
 */
async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // No session — the backend will answer 401 and the UI surfaces the error.
  }
  return headers;
}

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
        headers: await authHeaders(),
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
        headers: await authHeaders(),
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
      // P0: no more silent fake-success fallbacks — surface the error so the
      // user knows their training request was NOT recorded.
      console.error(`[API] Voice training failed:`, err);
      throw new Error(err.message || 'Voice training request failed. Please try again.');
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
        headers: await authHeaders(),
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
      // P0: no more silent fake-success fallbacks — surface the error so the
      // user knows their payment was NOT recorded.
      console.error(`[API] Local payment submission failed:`, err);
      throw new Error(err.message || 'Payment submission failed. Please try again.');
    }
  },

  /**
   * GET /api/v1/admin/models — list ALL voice models (admin, via backend service role)
   */
  async listAdminVoiceModels(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/models`, {
      headers: await authHeaders(),
    });
    if (!response.ok) throw new Error(`Failed to list models: ${response.status}`);
    return response.json();
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
        headers: await authHeaders(),
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
      // P0: no more silent fake-success fallbacks — surface the error.
      console.error(`[API] Admin model creation failed:`, err);
      throw new Error(err.message || 'Model creation failed. Please try again.');
    }
  },

  /**
   * DELETE /api/v1/admin/models/{modelId}
   * Permanently removes a voice model from the catalog (admin only).
   */
  async deleteAdminVoiceModel(modelId: string): Promise<void> {
    console.info(`[API] DELETE ${API_BASE_URL}/api/v1/admin/models/${modelId}`);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/models/${modelId}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Model deletion error: ${response.status}`);
      }
    } catch (err: any) {
      console.error(`[API] Admin model deletion failed:`, err);
      throw new Error(err.message || 'Model deletion failed. Please try again.');
    }
  },

  /**
   * PATCH /api/v1/admin/models/{modelId}
   * Updates a voice model's status (admin only).
   */
  async updateAdminVoiceModelStatus(modelId: string, status: string): Promise<void> {
    console.info(`[API] PATCH ${API_BASE_URL}/api/v1/admin/models/${modelId}`, { status });
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/models/${modelId}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Model update error: ${response.status}`);
      }
    } catch (err: any) {
      console.error(`[API] Admin model status update failed:`, err);
      throw new Error(err.message || 'Model update failed. Please try again.');
    }
  },

  /**
   * POST /api/v1/admin/payments/{paymentId}/approve
   */
  async approvePayment(paymentId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Approve failed: ${res.status}`);
    }
  },

  /**
   * POST /api/v1/admin/payments/{paymentId}/reject
   */
  async rejectPayment(paymentId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/payments/${paymentId}/reject`, {
      method: 'POST',
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Reject failed: ${res.status}`);
    }
  },

  /**
   * DELETE /api/v1/admin/payments/{paymentId}
   * Permanently deletes a payment record (admin only, for dummy cleanup).
   */
  async deletePayment(paymentId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/payments/${paymentId}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Delete failed: ${res.status}`);
    }
  },

  /**
   * DELETE /api/v1/admin/training-jobs/{jobId}
   * Permanently deletes a training job record (admin only, for dummy cleanup).
   */
  async deleteTrainingJob(jobId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/training-jobs/${jobId}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Delete failed: ${res.status}`);
    }
  },

  /**
   * POST /api/v1/admin/training-jobs/{jobId}/publish
   */
  async publishTrainedVoice(
    jobId: string,
    payload: { modelFileUrl: string; indexFileUrl?: string; demoAudioUrl?: string }
  ): Promise<{ voiceModelId: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/training-jobs/${jobId}/publish`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Publish failed: ${res.status}`);
    }
    const data = await res.json();
    if (!data.voiceModelId) {
      throw new Error('Publish failed: server did not return a voice model id.');
    }
    return { voiceModelId: data.voiceModelId };
  },

  /**
   * GET /api/v1/admin/me — who is calling, and are they the admin?
   * Uses the caller's JWT; the backend compares its email to ADMIN_EMAIL.
   */
  async getAdminMe(): Promise<{ is_admin: boolean; email: string | null }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/me`, {
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Admin check failed: ${res.status}`);
    }
    return res.json();
  },

  /**
   * POST /api/v1/users/me/sync — server-side user upsert + signup bonus.
   * The backend creates the users row if needed and grants the Rs. 50
   * signup bonus exactly once. Response: {"bonus_granted": bool, "balance": number}.
   * Never throws for callers that treat it as non-blocking — but this method
   * DOES throw on HTTP errors so callers can decide; wrap in try/catch.
   */
  async syncUser(): Promise<{ bonus_granted: boolean; balance: number }> {
    console.info(`[API] POST ${API_BASE_URL}/api/v1/users/me/sync`);
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me/sync`, {
      method: 'POST',
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `User sync failed: ${res.status}`);
    }
    const data = await res.json();
    return {
      bonus_granted: !!data.bonus_granted,
      balance: typeof data.balance === 'number' ? data.balance : 0,
    };
  },

  /**
   * GET /api/v1/utils/youtube-meta?url=<encoded> — real YouTube title/author.
   * Returns {title, author_name}; both null on any failure — the caller
   * falls back to placeholder text. Never throws.
   */
  async getYouTubeMeta(
    url: string
  ): Promise<{ title: string | null; author_name: string | null }> {
    const fallback = { title: null as string | null, author_name: null as string | null };
    if (!url || !url.trim()) return fallback;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/utils/youtube-meta?url=${encodeURIComponent(url.trim())}`,
        { headers: await authHeaders() }
      );
      if (!res.ok) return fallback;
      const data = await res.json();
      return {
        title: typeof data.title === 'string' && data.title ? data.title : null,
        author_name:
          typeof data.author_name === 'string' && data.author_name ? data.author_name : null,
      };
    } catch (err) {
      console.warn('[API] YouTube metadata fetch failed, using placeholders:', err);
      return fallback;
    }
  },

  /**
   * GET /api/v1/voices/training-jobs — the caller's training job statuses.
   * Used to poll/refresh honest job status after submitting a training.
   * Returns [] on any failure (caller treats as "no update").
   */
  async getTrainingJobs(): Promise<Array<{ id: string; status: string; voiceName?: string }>> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/voices/training-jobs`, {
        headers: await authHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.jobs || [];
      return rows.map((r: any) => ({
        id: String(r.id ?? r.trainingJobId ?? ''),
        status: String(r.status ?? ''),
        voiceName: r.voiceName ?? r.voice_name,
      }));
    } catch (err) {
      console.warn('[API] Training jobs refresh failed:', err);
      return [];
    }
  },
};
