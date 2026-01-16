import { OpenCodeClient } from "../opencode";

export interface Personality {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

const PERSONALITY_HEADER = "[PERSONALITY v1]";

export const BUILTIN_PERSONALITIES: Personality[] = [
  {
    id: "professional",
    name: "Professional",
    description: "Clear, concise, business-appropriate responses",
    systemPrompt: `${PERSONALITY_HEADER}
You are a professional assistant. Provide clear, concise, and business-appropriate responses. 
Focus on accuracy and practical solutions. Avoid unnecessary verbosity.`,
  },
  {
    id: "efficient",
    name: "Efficient",
    description: "Minimal responses, maximum utility",
    systemPrompt: `${PERSONALITY_HEADER}
You are an efficient assistant. Provide the shortest accurate answer possible.
Skip pleasantries. Use bullet points and code blocks. No filler words.`,
  },
  {
    id: "fact_based",
    name: "Fact-Based",
    description: "Evidence-focused, cite sources when possible",
    systemPrompt: `${PERSONALITY_HEADER}
You are a fact-based assistant. Prioritize accuracy and evidence.
Cite sources when possible. Acknowledge uncertainty. Avoid speculation.`,
  },
  {
    id: "exploratory",
    name: "Exploratory",
    description: "Thorough exploration, multiple perspectives",
    systemPrompt: `${PERSONALITY_HEADER}
You are an exploratory assistant. Provide thorough analysis with multiple perspectives.
Consider alternatives. Ask clarifying questions. Think out loud when helpful.`,
  },
];

export interface PersonalityManagerConfig {
  storageKey: string;
}

const DEFAULT_CONFIG: PersonalityManagerConfig = {
  storageKey: "opencode-personalities",
};

export class PersonalityManager {
  private client: OpenCodeClient;
  private config: PersonalityManagerConfig;
  private customPersonalities: Personality[] = [];
  private sessionPersonalities: Map<string, string> = new Map();

  constructor(client: OpenCodeClient, config: Partial<PersonalityManagerConfig> = {}) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getAllPersonalities(): Personality[] {
    return [...BUILTIN_PERSONALITIES, ...this.customPersonalities];
  }

  getPersonality(id: string): Personality | undefined {
    return this.getAllPersonalities().find((p) => p.id === id);
  }

  getSessionPersonality(sessionId: string): string | undefined {
    return this.sessionPersonalities.get(sessionId);
  }

  async setSessionPersonality(sessionId: string, personalityId: string): Promise<boolean> {
    const personality = this.getPersonality(personalityId);
    if (!personality) {
      return false;
    }

    try {
      await this.client.promptNoReplyWithSystem(
        sessionId,
        `Personality set to: ${personality.name}`,
        personality.systemPrompt
      );
      this.sessionPersonalities.set(sessionId, personalityId);
      return true;
    } catch (err) {
      console.error("[PersonalityManager] Failed to set personality:", err);
      return false;
    }
  }

  addCustomPersonality(personality: Omit<Personality, "id">): Personality {
    const id = `custom_${Date.now()}`;
    const newPersonality = { ...personality, id };
    this.customPersonalities.push(newPersonality);
    return newPersonality;
  }

  removeCustomPersonality(id: string): boolean {
    const index = this.customPersonalities.findIndex((p) => p.id === id);
    if (index >= 0) {
      this.customPersonalities.splice(index, 1);
      return true;
    }
    return false;
  }

  exportPersonalities(): string {
    return JSON.stringify(this.customPersonalities, null, 2);
  }

  importPersonalities(json: string): number {
    try {
      const parsed = JSON.parse(json) as Personality[];
      let imported = 0;
      for (const p of parsed) {
        if (p.name && p.systemPrompt) {
          this.addCustomPersonality(p);
          imported++;
        }
      }
      return imported;
    } catch {
      return 0;
    }
  }
}
