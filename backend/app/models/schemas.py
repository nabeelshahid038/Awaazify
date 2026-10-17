from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

class CoverGeneratePayload(BaseModel):
    userId: str
    inputType: Literal["file", "youtube"]
    fileUrl: Optional[str] = None
    youtubeUrl: Optional[str] = None
    trimStart: Optional[int] = 60
    trimEnd: Optional[int] = 90
    isTrialPreview: bool = False
    voiceModelId: str
    pitchShift: int = 0
    clarityBoost: Optional[bool] = False
    isRetry: bool = False
    parentJobId: Optional[str] = None

class CoverGenerateResponse(BaseModel):
    jobId: str
    status: str = "completed"
    outputAudioUrl: str
    message: Optional[str] = None

class VoiceTrainPayload(BaseModel):
    userId: str
    voiceName: str
    audioFiles: List[str] = Field(default_factory=list)
    autoCleanNoise: bool = True

class VoiceTrainResponse(BaseModel):
    trainingJobId: str
    status: str = "Cleaning & Queued"
    estimatedMinutes: int = 5

class LocalPaymentPayload(BaseModel):
    userId: str
    provider: Literal["easypaisa", "jazzcash"]
    packageId: Literal["song-50", "voice-150"]
    amountPkr: int
    transactionId: str
    screenshotUrl: str

class LocalPaymentResponse(BaseModel):
    paymentId: str
    status: str = "Pending"

class AdminModelPayload(BaseModel):
    name: str
    subtitle: str
    category: str
    avatarConfig: Optional[Dict[str, Any]] = None
    modelFileName: Optional[str] = None
    extraFileName: Optional[str] = None
    modelFileUrl: Optional[str] = None
    indexFileUrl: Optional[str] = None
    defaultPitch: int = 0
    previewAudioUrl: Optional[str] = None
    status: Literal["Active", "Coming Soon", "Hidden"] = "Active"

class PublishTrainedVoicePayload(BaseModel):
    modelFileUrl: str
    indexFileUrl: Optional[str] = None
    demoAudioUrl: Optional[str] = None
