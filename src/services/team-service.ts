import { assertHasCookie, updateWorkspaceContext } from "../auth.js";
import { AccountClient } from "../api/account-client.js";
import { loadResolvedConfig } from "../config/loader.js";
import {
  type TeamSummary,
  normalizeTeamList,
  resolveTeamSelection
} from "../domain/teams.js";
import { type LanhuConfigOverrides } from "../types.js";

export class TeamService {
  async list(overrides: LanhuConfigOverrides = {}) {
    const config = await loadResolvedConfig(overrides);
    assertHasCookie(config);

    const client = new AccountClient(config);
    const payload = await client.listUserTeams();
    const items = normalizeTeamList(payload, config.context.tenantId);

    return {
      config,
      items
    };
  }

  async switch(
    selection: string,
    overrides: LanhuConfigOverrides = {},
    items?: TeamSummary[]
  ) {
    const availableItems = items ?? (await this.list(overrides)).items;
    const selected = resolveTeamSelection(availableItems, selection);
    const config = await updateWorkspaceContext({
      tenantId: selected.tenantId,
      projectId: undefined
    });

    return {
      config,
      items: availableItems,
      selected
    };
  }
}
