export interface LeadSource {
  source: string;
  medium?: string | null;
  campaign?: string | null;
  keyword?: string | null;
  landingPath?: string | null;
}

export interface Attribution {
  leadSource: LeadSource;
  utm: Record<string, string>;
  referrer?: string | null;
}

export interface LandingConversion {
  conversionType: string;
  landingPath: string;
  attribution: Attribution;
}

