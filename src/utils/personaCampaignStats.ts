import { PERSONA_CAMPAIGNS } from '../constants/campaigns';
import type { PersonaId } from '../types';

/** Total campaigns and missions defined for a persona path. */
export function countPersonaPath(personaId: PersonaId): {
  campaignCount: number;
  missionCount: number;
} {
  const campaigns = PERSONA_CAMPAIGNS[personaId];
  if (!campaigns?.length) return { campaignCount: 0, missionCount: 0 };
  const missionCount = campaigns.reduce(
    (sum, c) => sum + c.missionTemplates.length,
    0,
  );
  return { campaignCount: campaigns.length, missionCount };
}
