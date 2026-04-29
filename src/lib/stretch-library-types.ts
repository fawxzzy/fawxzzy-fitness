export type StretchReferenceSummary = {
  id: string;
  name: string;
  targetAreas: string[];
  bodyPosition: string;
  durationGuidance: string;
  equipment: string;
  bestFor: string[];
};

export type StretchReferenceDetail = {
  id: string;
  coachingCue: string;
  howTo: string;
};

export type StretchReferenceItem = StretchReferenceSummary & StretchReferenceDetail;
